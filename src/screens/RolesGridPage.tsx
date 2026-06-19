import { invoke } from "@tauri-apps/api/core";
import { EntityGrid } from "../components/EntityGrid";
import { rolesEntity } from "../entities/roles";

interface RoleInfo {
  name: string;
  can_open: string[];
  can_write: string[];
}

export function RolesGridPage({ org }: { org: string }) {
  async function loadRoles() {
    const roles: RoleInfo[] = await invoke("list_roles", { org });
    return roles.map((r) => ({
      id: r.name,
      name: r.name,
      can_open: r.can_open.join(", "),
      can_write: r.can_write.join(", "),
    })) as Array<Record<string, unknown>>;
  }

  return <EntityGrid entity={rolesEntity} dataLoader={loadRoles} role="admin" />;
}
