import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

type Screen = "unlock" | "dashboard" | "devices" | "roles";

function App() {
  const [screen, setScreen] = useState<Screen>("unlock");
  const [nodeId, setNodeId] = useState<string>("");
  const [orgs, setOrgs] = useState<{name:string}[]>([]);
  const [activeOrg, setActiveOrg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [tickets, setTickets] = useState<string[]>([]);

  useEffect(() => {
    invoke<string>("get_node_id").then(setNodeId).catch(() => {});
  }, []);

  async function refresh() {
    const orgList: {name:string}[] = await invoke("list_orgs");
    setOrgs(orgList);
    if (orgList.length > 0 && !activeOrg) setActiveOrg(orgList[0].name);
  }

  async function createOrg(name: string) {
    try {
      await invoke("create_org", { name });
      await refresh();
      setActiveOrg(name);
    } catch (e) { setError(String(e)); }
  }

  async function shareOrg() {
    if (!activeOrg) return;
    try {
      const t: string[] = await invoke("share_org", { org: activeOrg });
      setTickets(t);
    } catch (e) { setError(String(e)); }
  }

  if (screen === "unlock") {
    return <UnlockScreen nodeId={nodeId} error={error} onCreateOrg={createOrg} />;
  }

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <select value={activeOrg} onChange={e => setActiveOrg(e.target.value)}>
          {orgs.map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
        </select>
        <button onClick={() => setScreen("dashboard")}>Dashboard</button>
        <button onClick={() => setScreen("devices")}>Devices</button>
        <button onClick={() => setScreen("roles")}>Roles</button>
        <button onClick={shareOrg} style={{background:"#e0f0ff"}}>Share</button>
        <span style={{ marginLeft: "auto", color: "#666", fontSize: 14 }}>{nodeId.slice(0, 16)}...</span>
        <button onClick={async () => { await createOrg(prompt("Org name:") || "new-org"); }}>+ New Org</button>
      </div>
      {tickets.length > 0 && (
        <div style={{ background: "#fff3cd", padding: 12, marginBottom: 16, borderRadius: 4 }}>
          <strong>Tickets para compartir {activeOrg}:</strong>
          {tickets.map((t, i) => (
            <div key={i} style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", marginTop: 4 }}>
              {t.slice(0, 80)}...
            </div>
          ))}
          <button onClick={() => setTickets([])} style={{ marginTop: 8 }}>Cerrar</button>
        </div>
      )}
      {screen === "dashboard" && <Dashboard org={activeOrg} />}
      {screen === "devices" && <DevicesScreen org={activeOrg} />}
      {screen === "roles" && <RolesScreen org={activeOrg} />}
    </div>
  );
}
  }

  async function createOrg(name: string) {
    try {
      await invoke("create_org", { name });
      const orgList: string[] = await invoke("list_orgs");
      setOrgs(orgList);
      setActiveOrg(name);
    } catch (e) {
      setError(String(e));
    }
  }

  if (screen === "unlock") {
    return <UnlockScreen nodeId={nodeId} error={error} onUnlock={unlock} onCreateOrg={createOrg} />;
  }

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <select value={activeOrg} onChange={e => setActiveOrg(e.target.value)}>
          {orgs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <button onClick={() => setScreen("dashboard")}>Dashboard</button>
        <button onClick={() => setScreen("devices")}>Devices</button>
        <button onClick={() => setScreen("roles")}>Roles</button>
        <span style={{ marginLeft: "auto", color: "#666", fontSize: 14 }}>{nodeId.slice(0, 16)}...</span>
        <button onClick={async () => { await invoke("create_org", { name: prompt("Org name:") || "new-org" }); const o: string[] = await invoke("list_orgs"); setOrgs(o); }}>+ New Org</button>
      </div>
      {screen === "dashboard" && <Dashboard org={activeOrg} />}
      {screen === "devices" && <DevicesScreen org={activeOrg} />}
      {screen === "roles" && <RolesScreen org={activeOrg} />}
    </div>
  );
}

function UnlockScreen({ nodeId, error, onCreateOrg }: { nodeId: string; error: string; onCreateOrg: (name: string) => void }) {
  const [newOrg, setNewOrg] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui" }}>
      <h1>Syntrix Admin</h1>
      <p style={{ color: "#666" }}>Device: {nodeId.slice(0, 16)}...</p>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ marginTop: 40 }}>
        <h3>Create organization</h3>
        <input placeholder="Org name" value={newOrg} onChange={e => setNewOrg(e.target.value)} />
        <button onClick={() => onCreateOrg(newOrg)}>Create</button>
      </div>
    </div>
  );
}

function Dashboard({ org }: { org: string }) {
  const [devices, setDevices] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    invoke<any[]>("list_devices", { org }).then(setDevices).catch(() => {});
    invoke<string>("network_status", { org }).then(setStatus).catch(() => {});
  }, [org]);

  return (
    <div>
      <h2>Dashboard — {org}</h2>
      <p>Network: {status || "checking..."}</p>
      <p>Devices: {devices.length}</p>
    </div>
  );
}

function DevicesScreen({ org }: { org: string }) {
  const [devices, setDevices] = useState<any[]>([]);
  const [nodeId, setNodeId] = useState("");
  const [name, setName] = useState("");
  const [person, setPerson] = useState("");
  const [role, setRole] = useState("sales");

  async function load() {
    const d: any[] = await invoke("list_devices", { org });
    setDevices(d);
  }

  useEffect(() => { load(); }, [org]);

  async function add() {
    await invoke("add_device", { org, nodeId, name, person, role });
    setNodeId(""); setName(""); setPerson(""); setRole("sales");
    load();
  }

  async function toggleActive(id: string, active: boolean) {
    await invoke("update_device", { org, nodeId: id, active: !active, role: "" });
    load();
  }

  return (
    <div>
      <h2>Devices — {org}</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Node ID", "Name", "Person", "Role", "Active", ""].map(h => <th key={h} style={{textAlign:"left",padding:4}}>{h}</th>)}</tr></thead>
        <tbody>
          {devices.map(d => (
            <tr key={d.node_id} style={{ opacity: d.active ? 1 : 0.4 }}>
              <td style={{padding:4,fontFamily:"monospace",fontSize:12}}>{d.node_id.slice(0,12)}...</td>
              <td style={{padding:4}}>{d.name}</td>
              <td style={{padding:4}}>{d.person}</td>
              <td style={{padding:4}}>{d.role}</td>
              <td style={{padding:4}}>{d.active ? "✅" : "❌"}</td>
              <td style={{padding:4}}><button onClick={() => toggleActive(d.node_id, d.active)}>{d.active ? "Deactivate" : "Activate"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Add device</h3>
      <div style={{ display: "flex", gap: 8 }}>
        <input placeholder="Node ID (hex)" value={nodeId} onChange={e => setNodeId(e.target.value)} />
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="Person" value={person} onChange={e => setPerson(e.target.value)} />
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option>sales</option><option>admin</option><option>contabilidad</option><option>hr</option>
        </select>
        <button onClick={add}>Add</button>
      </div>
    </div>
  );
}

function RolesScreen({ org }: { org: string }) {
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    invoke<any[]>("list_roles", { org }).then(setRoles).catch(() => {});
  }, [org]);

  return (
    <div>
      <h2>Roles — {org}</h2>
      {roles.length === 0 && <p>No roles defined yet. Default: admin has full access.</p>}
      {roles.map(r => (
        <div key={r.name} style={{ marginBottom: 12 }}>
          <strong>{r.name}</strong>
          <div>can_open: {JSON.stringify(r.can_open)}</div>
          <div>can_write: {JSON.stringify(r.can_write)}</div>
        </div>
      ))}
    </div>
  );
}

export default App;
