import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { LayoutDashboard, Users, Shield, Plus, Menu, X, Terminal, Grid3X3 } from "lucide-react";

...

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/devices", label: "Devices", icon: Users },
    { href: "/roles", label: "Roles", icon: Shield },
    { href: "/w/devices", label: "Workspace", icon: Grid3X3 },
    { href: "/logs", label: "Logs", icon: Terminal },
  ];

  const currentLabel = navItems.find((i) => location.pathname === i.href || (i.href.startsWith("/w/") && location.pathname.startsWith("/w/")))?.label ?? "Dashboard";

  const isWorkspaceRoute = location.pathname.startsWith("/w/");

  const sidebarContent = (
    <>
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Syntrix</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Admin Console</p>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-md hover:bg-accent">
          <X size={18} />
        </button>
      </div>

      <div className="px-3 py-4">
        <Select value={activeOrg} onValueChange={(v) => { setActiveOrg(v); setSidebarOpen(false); }}>
          <SelectTrigger className="mb-4">
            <SelectValue placeholder="Select org" />
          </SelectTrigger>
          <SelectContent>
            {orgs.map((o) => (
              <SelectItem key={o.name} value={o.name}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => { navigate(item.href); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                location.pathname === item.href || (item.href.startsWith("/w/") && location.pathname.startsWith("/w/"))
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto px-3 py-4 border-t border-border">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
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
            <span className="hidden sm:inline text-xs text-muted-foreground mr-2">{nodeId.slice(0, 14)}...</span>
            <ShareDialog org={activeOrg} />
            <Button size="sm" variant="outline" onClick={() => setNewOrgOpen(true)}>
              <Plus size={16} /> <span className="hidden sm:inline">New Org</span>
            </Button>
          </div>
        </header>

        <main className={isWorkspaceRoute ? "h-[calc(100vh-4rem)]" : "p-4 md:p-6"}>
          <Routes>
            <Route index element={<Dashboard org={activeOrg} />} />
            <Route path="/devices" element={<Devices org={activeOrg} />} />
            <Route path="/roles" element={<Roles org={activeOrg} />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/w/*" element={<AdminWorkspace org={activeOrg} />}>
              <Route path="devices" element={<DevicesGridPage org={activeOrg} />} />
              <Route path="roles" element={<RolesGridPage org={activeOrg} />} />
              <Route path="orgs" element={<OrgsGridPage />} />
            </Route>
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
