use std::collections::HashMap;

use crate::identity::AppState;
use crate::{DeviceInfo, RoleInfo};

// ── org_control writes ──

pub fn create_org(state: &AppState, name: &str) -> anyhow::Result<()> {
    // In production: create namespaces org_<name>/control, /data, /public, /private
    // Write initial org_control entries via iroh-docs
    let _ = name;
    let _ = state;
    Ok(())
}

pub fn add_device(
    state: &AppState,
    org: &str,
    node_id: &str,
    name: &str,
    person: &str,
    role: &str,
) -> anyhow::Result<()> {
    // In production: write to org_<org>/control/members/<node_id>
    let _ = (state, org, node_id, name, person, role);
    Ok(())
}

pub fn update_device(
    state: &AppState,
    org: &str,
    node_id: &str,
    active: bool,
    role: &str,
) -> anyhow::Result<()> {
    // In production: update org_<org>/control/members/<node_id>
    let _ = (state, org, node_id, active, role);
    Ok(())
}

// ── org_control reads (stub — in production reads from iroh-docs) ──

struct StubDevice {
    node_id: String,
    name: String,
    person: String,
    role: String,
    active: bool,
}

struct StubRole {
    name: String,
    can_open: Vec<String>,
    can_write: Vec<String>,
}

impl AppState {
    fn stub_devices(&self, org: &str) -> Vec<StubDevice> {
        let node_id = hex::encode(self.node_id());
        if self.get_org(org).is_some() {
            vec![StubDevice {
                node_id: node_id.clone(),
                name: "Admin (this device)".into(),
                person: "admin".into(),
                role: "admin".into(),
                active: true,
            }]
        } else {
            vec![]
        }
    }

    fn stub_roles(&self, org: &str) -> Vec<StubRole> {
        if self.get_org(org).is_some() {
            vec![
                StubRole {
                    name: "admin".into(),
                    can_open: vec!["*".into()],
                    can_write: vec!["*".into()],
                },
                StubRole {
                    name: "sales".into(),
                    can_open: vec!["org_data".into(), "org_public".into(), "org_control".into()],
                    can_write: vec!["org_data".into()],
                },
                StubRole {
                    name: "contabilidad".into(),
                    can_open: vec!["org_facturas_*".into(), "org_data".into(), "org_public".into(), "org_control".into()],
                    can_write: vec![],
                },
            ]
        } else {
            vec![]
        }
    }
}

pub fn list_devices(state: &AppState, org: &str) -> anyhow::Result<Vec<DeviceInfo>> {
    Ok(state
        .stub_devices(org)
        .into_iter()
        .map(|d| DeviceInfo {
            node_id: d.node_id,
            active: d.active,
            role: d.role,
            person: d.person,
            name: d.name,
        })
        .collect())
}

pub fn list_roles(state: &AppState, org: &str) -> anyhow::Result<Vec<RoleInfo>> {
    Ok(state
        .stub_roles(org)
        .into_iter()
        .map(|r| RoleInfo {
            name: r.name,
            can_open: r.can_open,
            can_write: r.can_write,
        })
        .collect())
}

pub fn network_status(state: &AppState, _org: &str) -> anyhow::Result<String> {
    let _ = state;
    Ok("offline (iroh not connected yet)".into())
}
