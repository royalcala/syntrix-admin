import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { LayoutDashboard, Users, Shield, Plus, Menu, X, Terminal } from "lucide-react";
import { Button } from "./components/ui/button";
import { Select } from "./components/ui/select";
import { Sheet } from "./components/ui/sheet";
import { Dashboard } from "./screens/Dashboard";
import { Devices } from "./screens/Devices";
import { Roles } from "./screens/Roles";
import { CreateOrg } from "./screens/CreateOrg";
import { Logs } from "./screens/Logs";
import { ShareDialog } from "./screens/ShareDialog";
import { ThemeToggle } from "./components/ThemeToggle";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newOrgOpen, setNewOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  async function createNewOrg() {
    const name = newOrgName.trim() || "new-org";
    await invoke("create_org", { name });
    setActiveOrg(name);
    setNewOrgName("");
    setNewOrgOpen(false);
    onOrgsChanged();
  }

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/devices", label: "Devices", icon: Users },
    { href: "/roles", label: "Roles", icon: Shield },
    { href: "/logs", label: "Logs", icon: Terminal },
  ];

  const currentLabel = navItems.find((i) => i.href === location.pathname)?.label ?? "Dashboard";

  const sidebarContent = (
    <>
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Syntrix</h1>
          <p className="text-xs text-muted mt-0.5">Admin Console</p>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-md hover:bg-accent">
          <X size={18} />
        </button>
      </div>

      <div className="px-3 py-4">
        <Select
          options={orgs.map((o) => ({ value: o.name, label: o.name }))}
          value={activeOrg}
          onChange={(e) => { setActiveOrg(e.target.value); setSidebarOpen(false); }}
          className="mb-4"
        />
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => { navigate(item.href); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                location.pathname === item.href
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent"
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
        <div className="flex items-center px-3 py-1">
          <ThemeToggle />
          <span className="text-xs text-muted-foreground ml-2">Toggle theme</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar (overlay) */}
      <Sheet open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        {sidebarContent}
      </Sheet>

      {/* Desktop sidebar (fixed) */}
      <aside className="hidden lg:flex w-64 bg-sidebar text-sidebar-foreground border-r border-border flex-col fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Main area */}
      <div className="lg:pl-64">
        <header className="h-16 border-b border-border bg-background flex items-center px-4 md:px-6 gap-3 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-md hover:bg-accent">
            <Menu size={20} />
          </button>
          <h2 className="text-lg font-semibold truncate">{currentLabel}</h2>
          <div className="ml-auto flex gap-2 items-center">
            <span className="hidden sm:inline text-xs text-muted mr-2">{nodeId.slice(0, 14)}...</span>
            <ShareDialog org={activeOrg} />
            <Button size="sm" variant="outline" onClick={() => setNewOrgOpen(true)}>
              <Plus size={16} /> <span className="hidden sm:inline">New Org</span>
            </Button>
          </div>
        </header>

        <main className="p-4 md:p-6">
          <Routes>
            <Route index element={<Dashboard org={activeOrg} />} />
            <Route path="/devices" element={<Devices org={activeOrg} />} />
            <Route path="/roles" element={<Roles org={activeOrg} />} />
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </main>
      </div>

      {/* New Org Dialog */}
      {newOrgOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setNewOrgOpen(false)}>
          <div className="bg-card rounded-xl shadow-lg max-w-sm w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Create Organization</h3>
            <input
              className="w-full h-10 rounded-md border border-border px-3 py-2 text-sm mb-4"
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createNewOrg()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setNewOrgOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={createNewOrg}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
