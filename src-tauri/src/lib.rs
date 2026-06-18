use std::sync::Mutex;

use serde::{Deserialize, Serialize};

mod identity;
mod admin;

pub use identity::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceInfo {
    pub node_id: String,
    pub active: bool,
    pub role: String,
    pub person: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RoleInfo {
    pub name: String,
    pub can_open: Vec<String>,
    pub can_write: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OrgInfo {
    pub name: String,
}

// All commands use block_on for iroh async ops

#[tauri::command]
fn get_node_id(state: tauri::State<'_, Mutex<AppState>>) -> Result<String, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    Ok(hex::encode(state.node_id()))
}

#[tauri::command]
fn list_orgs(state: tauri::State<'_, Mutex<AppState>>) -> Result<Vec<OrgInfo>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    Ok(state.list_orgs().into_iter().map(|name| OrgInfo { name }).collect())
}

#[tauri::command]
fn create_org(state: tauri::State<'_, Mutex<AppState>>, name: String) -> Result<(), String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    tauri::async_runtime::block_on(admin::create_org(&mut state, &name)).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_device(
    state: tauri::State<'_, Mutex<AppState>>,
    org: String, node_id: String, name: String, person: String, role: String,
) -> Result<(), String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    tauri::async_runtime::block_on(
        admin::add_device(&mut state, &org, &node_id, &name, &person, &role)
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_device(
    state: tauri::State<'_, Mutex<AppState>>,
    org: String, node_id: String, active: bool, role: Option<String>,
) -> Result<(), String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    tauri::async_runtime::block_on(
        admin::update_device(&mut state, &org, &node_id, active, role)
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_devices(state: tauri::State<'_, Mutex<AppState>>, org: String) -> Result<Vec<DeviceInfo>, String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    tauri::async_runtime::block_on(admin::list_devices(&mut state, &org)).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_roles(state: tauri::State<'_, Mutex<AppState>>, org: String) -> Result<Vec<RoleInfo>, String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    tauri::async_runtime::block_on(admin::list_roles(&mut state, &org)).map_err(|e| e.to_string())
}

#[tauri::command]
fn network_status(state: tauri::State<'_, Mutex<AppState>>) -> Result<String, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    Ok(admin::network_status(&state))
}

#[tauri::command]
fn send_invite(
    state: tauri::State<'_, Mutex<AppState>>,
    org: String,
    endpoint_addr_json: String,
    role: String,
) -> Result<(), String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    tauri::async_runtime::block_on(admin::send_invite(&state, &org, &endpoint_addr_json, &role))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn share_org(state: tauri::State<'_, Mutex<AppState>>, org: String) -> Result<Vec<String>, String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    tauri::async_runtime::block_on(admin::share_org_tickets(&mut state, &org)).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = tauri::async_runtime::block_on(async {
        AppState::new().await.expect("failed to initialize iroh")
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(app_state))
        .invoke_handler(tauri::generate_handler![
            get_node_id, list_orgs, create_org,
            add_device, update_device, list_devices, list_roles, network_status,
            share_org, send_invite,
        ])
        .run(tauri::generate_context!())
        .expect("error while running syntrix-admin");
}
