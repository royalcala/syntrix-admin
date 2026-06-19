import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface RoleInfo { name: string; can_open: string[]; can_write: string[]; }

export function RolesPage({ org }: { org: string }) {
  const [roles, setRoles] = useState<RoleInfo[]>([]);

  useEffect(() => {
    invoke<RoleInfo[]>("list_roles", { org }).then(setRoles);
  }, [org]);

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Roles</h2>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4">Rol</th><th className="py-2 pr-4">Lectura</th><th className="py-2">Escritura</th>
        </tr></thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.name} className="border-b hover:bg-muted/30">
              <td className="py-2 pr-4 font-medium">{r.name}</td>
              <td className="py-2 pr-4 text-xs">{r.can_open.join(", ")}</td>
              <td className="py-2 text-xs">{r.can_write.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
