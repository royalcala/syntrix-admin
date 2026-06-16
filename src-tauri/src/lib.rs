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

/// ── Commands ──

#[tauri::command]
fn get_node_id(state: tauri::State<'_, Mutex<AppState>>) -> Result<String, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    Ok(hex::encode(state.node_id()))
}

#[tauri::command]
fn unlock(state: tauri::State<'_, Mutex<AppState>>, pin: String) -> Result<(), String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    state.unlock(&pin).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_orgs(state: tauri::State<'_, Mutex<AppState>>) -> Result<Vec<String>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    Ok(state.list_orgs())
}

#[tauri::command]
fn create_org(state: tauri::State<'_, Mutex<AppState>>, name: String) -> Result<(), String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    admin::create_org(&state, &name).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_devices(state: tauri::State<'_, Mutex<AppState>>, org: String) -> Result<Vec<DeviceInfo>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    admin::list_devices(&state, &org).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_device(
    state: tauri::State<'_, Mutex<AppState>>,
    org: String,
    node_id: String,
    name: String,
    person: String,
    role: String,
) -> Result<(), String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    admin::add_device(&state, &org, &node_id, &name, &person, &role).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_device(
    state: tauri::State<'_, Mutex<AppState>>,
    org: String,
    node_id: String,
    active: bool,
    role: String,
) -> Result<(), String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    admin::update_device(&state, &org, &node_id, active, &role).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_roles(state: tauri::State<'_, Mutex<AppState>>, org: String) -> Result<Vec<RoleInfo>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    admin::list_roles(&state, &org).map_err(|e| e.to_string())
}

#[tauri::command]
fn network_status(state: tauri::State<'_, Mutex<AppState>>, org: String) -> Result<String, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    admin::network_status(&state, &org).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(app_state))
        .invoke_handler(tauri::generate_handler![
            get_node_id,
            unlock,
            list_orgs,
            create_org,
            list_devices,
            add_device,
            update_device,
            list_roles,
            network_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running syntrix-admin");
}
