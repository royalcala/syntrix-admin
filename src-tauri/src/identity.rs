use std::collections::HashMap;

use iroh::SecretKey;
use iroh_syntrix_docs::NodeId;

/// Application state shared across Tauri commands.
pub struct AppState {
    /// This device's Ed25519 secret key.
    secret: SecretKey,
    /// Cached org → admin module state.
    orgs: HashMap<String, OrgState>,
    unlocked: bool,
}

#[derive(Clone)]
pub struct OrgState {
    pub name: String,
}

impl AppState {
    pub fn new() -> Self {
        // Generate device identity on first run (in production: persist + encrypt with PIN)
        let secret = SecretKey::generate(&mut rand::rngs::OsRng);
        Self {
            secret,
            orgs: HashMap::new(),
            unlocked: false,
        }
    }

    pub fn node_id(&self) -> NodeId {
        *self.secret.public().as_bytes()
    }

    pub fn unlock(&mut self, _pin: &str) -> anyhow::Result<()> {
        // In production: derive key from PIN, decrypt stored capabilities
        self.unlocked = true;
        Ok(())
    }

    pub fn list_orgs(&self) -> Vec<String> {
        self.orgs.keys().cloned().collect()
    }

    pub fn ensure_org(&mut self, name: &str) -> &mut OrgState {
        self.orgs
            .entry(name.to_string())
            .or_insert_with(|| OrgState {
                name: name.to_string(),
            })
    }

    pub fn get_org(&self, name: &str) -> Option<&OrgState> {
        self.orgs.get(name)
    }
}
