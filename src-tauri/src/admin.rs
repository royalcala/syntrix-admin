use iroh_docs::api::protocol::{ShareMode, AddrInfoOptions};

use crate::identity::AppState;
use crate::{DeviceInfo, RoleInfo};

pub async fn create_org(state: &mut AppState, name: &str) -> anyhow::Result<()> {
    let api = state.api().clone();
    let author = state.author();

    let control_doc = api.create().await?;
    let data_doc = api.create().await?;

    let node_id_hex = hex::encode(state.node_id());
    let device_json = serde_json::json!({
        "active": true, "role": "admin", "person": "admin",
        "name": format!("Admin ({})", name),
    });
    control_doc.set_bytes(
        author, format!("members/{}", node_id_hex).into_bytes(),
        serde_json::to_vec(&device_json)?,
    ).await?;

    let admin_role = serde_json::json!({"can_open": ["*"], "can_write": ["*"]});
    control_doc.set_bytes(author, b"roles/admin".to_vec(), serde_json::to_vec(&admin_role)?).await?;

    let org_json = serde_json::json!({"name": name, "created_at": chrono::Utc::now().to_rfc3339()});
    control_doc.set_bytes(author, b"org".to_vec(), serde_json::to_vec(&org_json)?).await?;

    state.remember_device(name, &node_id_hex, "admin", "admin", &format!("Admin ({})", name), true, "");
    state.add_org(name, control_doc, data_doc);
    Ok(())
}

pub async fn add_device(
    state: &mut AppState, org: &str, node_id: &str, name: &str, person: &str, role: &str, device_addr: &str,
) -> anyhow::Result<()> {
    let org_state = state.get_org(org)
        .ok_or_else(|| anyhow::anyhow!("org {} not found", org))?;
    let doc = &org_state.control_doc;
    let author = state.author();

    let device_json = serde_json::json!({"active": true, "role": role, "person": person, "name": name});
    doc.set_bytes(author, format!("members/{}", node_id).into_bytes(),
        serde_json::to_vec(&device_json)?,
    ).await?;

    let role_key = format!("roles/{}", role);
    let existing = doc.get_exact(author, role_key.as_bytes(), false).await?;
    if existing.is_none() {
        let grants = default_role_grants(role);
        doc.set_bytes(author, role_key.into_bytes(), serde_json::to_vec(&grants)?).await?;
    }

    state.remember_device(org, node_id, role, person, name, true, device_addr);
    Ok(())
}

fn default_role_grants(role: &str) -> serde_json::Value {
    match role {
        "admin" => serde_json::json!({"can_open": ["*"], "can_write": ["*"]}),
        "sales" => serde_json::json!({"can_open": ["org_data", "org_public", "org_control"], "can_write": ["org_data"]}),
        "contabilidad" => serde_json::json!({"can_open": ["org_facturas_*", "org_data", "org_public", "org_control"], "can_write": []}),
        _ => serde_json::json!({"can_open": [], "can_write": []}),
    }
}

pub async fn update_device(
    state: &mut AppState, org: &str, node_id: &str, active: bool, role: Option<String>,
) -> anyhow::Result<()> {
    let org_state = state.get_org(org)
        .ok_or_else(|| anyhow::anyhow!("org {} not found", org))?;
    let doc = &org_state.control_doc;
    let author = state.author();

    let key = format!("members/{}", node_id);
    let mut value = serde_json::json!({"active": active});
    if let Some(r) = role { value["role"] = serde_json::Value::String(r); }
    doc.set_bytes(author, key.into_bytes(), serde_json::to_vec(&value)?).await?;

    state.set_device_active(org, node_id, active);
    Ok(())
}

/// List devices from in-memory cache.
pub async fn list_devices(state: &mut AppState, org: &str) -> anyhow::Result<Vec<DeviceInfo>> {
    Ok(state.list_org_devices(org))
}

/// List roles from in-memory cache (populated during add_device/create_org).
pub async fn list_roles(state: &mut AppState, org: &str) -> anyhow::Result<Vec<RoleInfo>> {
    let roles = state.list_org_roles(org);
    Ok(roles)
}

pub fn network_status(_state: &AppState) -> String {
    "online (iroh P2P node running)".into()
}

/// Generate tickets for sharing an org's control + data docs.
pub async fn share_org_tickets(state: &mut AppState, org: &str) -> anyhow::Result<Vec<String>> {
    let org_state = state.get_org(org)
        .ok_or_else(|| anyhow::anyhow!("org {} not found", org))?;
    
    let control_ticket = org_state.control_doc
        .share(ShareMode::Write, AddrInfoOptions::RelayAndAddresses).await?;
    let data_ticket = org_state.data_doc
        .share(ShareMode::Write, AddrInfoOptions::RelayAndAddresses).await?;

    Ok(vec![
        control_ticket.to_string(),
        data_ticket.to_string(),
    ])
}

/// Send an org invitation to a client device.
/// Accepts either a JSON with node_id + addrs, or just a hex node_id.
pub async fn send_invite(
    state: &AppState,
    org: &str,
    endpoint_addr_json: &str,
    role: &str,
) -> anyhow::Result<()> {
    // Try parsing as JSON (full address), fall back to raw hex node_id
    let (peer, addrs, addr) = if let Ok(addr_data) = serde_json::from_str::<serde_json::Value>(endpoint_addr_json) {
        let node_id_hex = addr_data["node_id"].as_str()
            .ok_or_else(|| anyhow::anyhow!("invalid addr json: missing node_id"))?;
        let node_id_bytes = hex::decode(node_id_hex)?;
        let node_id: [u8; 32] = node_id_bytes.as_slice().try_into()
            .map_err(|_| anyhow::anyhow!("invalid node_id length"))?;
        let peer: iroh::PublicKey = iroh::PublicKey::from_bytes(&node_id)?;
        let addrs: Vec<iroh::TransportAddr> = addr_data["addrs"]
            .as_array()
            .map(|a| a.iter().filter_map(|v| {
                let s = v.as_str()?;
                let addr_str = s.strip_prefix("ip:").unwrap_or(s);
                addr_str.parse::<std::net::SocketAddr>().ok().map(iroh::TransportAddr::Ip)
            }).collect())
            .unwrap_or_default();
        let addr = iroh::EndpointAddr::from_parts(peer, addrs.clone());
        (peer, addrs, addr)
    } else {
        // Raw hex node_id — rely on DNS
        let node_id_bytes = hex::decode(endpoint_addr_json)?;
        let node_id: [u8; 32] = node_id_bytes.as_slice().try_into()
            .map_err(|_| anyhow::anyhow!("invalid node_id length"))?;
        let peer: iroh::PublicKey = iroh::PublicKey::from_bytes(&node_id)?;
        let addr = iroh::EndpointAddr::from_parts(peer, []);
        (peer, vec![], addr)
    };

    let org_state = state.get_org(org)
        .ok_or_else(|| anyhow::anyhow!("org {} not found", org))?;
    
    let control_ticket = org_state.control_doc
        .share(ShareMode::Write, AddrInfoOptions::RelayAndAddresses).await?;
    let data_ticket = org_state.data_doc
        .share(ShareMode::Write, AddrInfoOptions::RelayAndAddresses).await?;

    let payload = serde_json::json!({
        "org_name": org,
        "role": role,
        "control_ticket": control_ticket.to_string(),
        "data_ticket": data_ticket.to_string(),
    });

    let endpoint = state.endpoint();
    let conn = match endpoint.connect(peer, b"/syntrix/invite/1").await {
        Ok(c) => c,
        Err(_) => {
            // DNS failed, try direct connection with explicit addresses
            let addr = iroh::EndpointAddr::from_parts(peer, addrs);
            endpoint.connect(addr, b"/syntrix/invite/1").await.map_err(|e| {
                anyhow::anyhow!("failed to connect: {}. Both peers must be online.", e)
            })?
        }
    };
    let mut send = conn.open_uni().await?;
    send.write_all(serde_json::to_vec(&payload)?.as_slice()).await?;
    send.finish()?;

    Ok(())
}
