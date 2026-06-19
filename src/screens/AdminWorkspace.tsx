import { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  Users,
  Shield,
  Building2,
  LayoutGrid,
  ChevronLeft,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

interface AdminEntity {
  id: string;
  label: string;
  icon: string;
}

const adminEntities: AdminEntity[] = [
  { id: "devices", label: "Dispositivos", icon: "users" },
  { id: "roles", label: "Roles", icon: "shield" },
  { id: "orgs", label: "Organizaciones", icon: "building" },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  users: Users,
  shield: Shield,
  building: Building2,
};

interface AdminWorkspaceProps {
  org: string;
}

export function AdminWorkspace({ org }: AdminWorkspaceProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const currentId = location.pathname.split("/w/")[1]?.split("/")[0] || "devices";

  return (
    <div className="flex h-full">
      <div className={cn("flex flex-col border-r bg-card transition-all", collapsed ? "w-12" : "w-48")}>
        <div className="flex items-center justify-between p-2 border-b">
          {!collapsed && <span className="text-xs font-semibold">ADMIN</span>}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCollapsed(!collapsed)}>
            <ChevronLeft className={cn("w-3 h-3 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>
        <nav className="flex-1 p-1 space-y-0.5">
          {adminEntities.map((ent) => {
            const Icon = iconMap[ent.icon] ?? LayoutGrid;
            return (
              <button
                key={ent.id}
                onClick={() => navigate(`/w/${ent.id}`)}
                className={cn(
                  "flex items-center w-full gap-2 px-2 py-1.5 rounded text-xs transition-colors",
                  currentId === ent.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
                title={collapsed ? ent.label : undefined}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {!collapsed && ent.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 min-w-0">
        <Outlet context={{ org }} />
      </div>
    </div>
  );
}
