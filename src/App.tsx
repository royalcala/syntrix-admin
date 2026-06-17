import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { LayoutDashboard, Users, Shield, Plus, LogOut } from "lucide-react";
import { Button } from "./components/ui/button";
import { Select } from "./components/ui/select";
import { Dashboard } from "./screens/Dashboard";
import { Devices } from "./screens/Devices";
import { Roles } from "./screens/Roles";
import { CreateOrg } from "./screens/CreateOrg";
import { ShareDialog } from "./screens/ShareDialog";

type OrgInfo = { name: string };

export default function App() {
  const [nodeId, setNodeId] = useState<string>("");
  const [orgs, setOrgs] = useState<OrgInfo[]>([]);
  const [activeOrg, setActiveOrg] = useState<string>("");

  useEffect(() => {
    invoke<string>("get_node_id").then(setNodeId);
    loadOrgs();
  }, []);

  async function loadOrgs() {
    try {
      const list: OrgInfo[] = await invoke("list_orgs");
      setOrgs(list);
      if (list.length > 0 && !activeOrg) setActiveOrg(list[0].name);
    } catch {}
  }

  const hasOrgs = orgs.length > 0;

  return hasOrgs ? (
    <Layout nodeId={nodeId} orgs={orgs} activeOrg={activeOrg} setActiveOrg={setActiveOrg} onOrgsChanged={loadOrgs} />
  ) : (
    <CreateOrg nodeId={nodeId} onCreated={loadOrgs} />
  );
}

function Layout({
  nodeId, orgs, activeOrg, setActiveOrg, onOrgsChanged,
}: {
  nodeId: string; orgs: OrgInfo[]; activeOrg: string; setActiveOrg: (o: string) => void; onOrgsChanged: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/devices", label: "Devices", icon: Users },
    { href: "/roles", label: "Roles", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-border flex flex-col">
        <div className="px-6 py-5 border-b border-border">
          <h1 className="text-lg font-bold tracking-tight">Syntrix</h1>
          <p className="text-xs text-muted mt-0.5">Admin Console</p>
        </div>

        <div className="px-3 py-4">
          <Select
            options={orgs.map((o) => ({ value: o.name, label: o.name }))}
            value={activeOrg}
            onChange={(e) => setActiveOrg(e.target.value)}
            className="mb-4"
          />
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                  location.pathname === item.href
                    ? "bg-brand/10 text-brand font-medium"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto px-3 py-4 border-t border-border">
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {nodeId.slice(0, 16)}...
          </div>
          <button onClick={() => { /* logout */ }} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg w-full mt-1">
            <LogOut size={16} /> Lock
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1">
        <header className="h-16 border-b border-border bg-white flex items-center px-6 gap-3">
          <h2 className="text-lg font-semibold">
            {navItems.find((i) => i.href === location.pathname)?.label ?? "Dashboard"}
          </h2>
          <div className="ml-auto flex gap-2">
            <ShareDialog org={activeOrg} />
            <Button size="sm" variant="outline" onClick={async () => {
              const name = prompt("Org name:") || "new-org";
              await invoke("create_org", { name });
              onOrgsChanged();
            }}>
              <Plus size={16} /> New Org
            </Button>
          </div>
        </header>

        <div className="p-6">
          <Routes>
            <Route index element={<Dashboard org={activeOrg} />} />
            <Route path="/devices" element={<Devices org={activeOrg} />} />
            <Route path="/roles" element={<Roles org={activeOrg} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
