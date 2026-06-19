import { createCollection } from "@tanstack/react-db";
import { tauriCollectionOptions } from "./tauri-adapter";

export function createDevicesCollection(org: string) {
  return createCollection(
    tauriCollectionOptions({
      id: "devices",
      getKey: (d) => d.node_id as string,
      listCommand: "list_devices",
      listArgs: { org },
      insertCommand: "add_device",
      updateCommand: "update_device",
      mapRow: (item) => {
        const d = item as { node_id: string; name: string; person: string; role: string; active: boolean };
        return { id: d.node_id, node_id: d.node_id, name: d.name, person: d.person, role: d.role, active: d.active } as never;
      },
    }),
  );
}

export function createRolesCollection(org: string) {
  return createCollection(
    tauriCollectionOptions({
      id: "roles",
      getKey: (r) => r.name as string,
      listCommand: "list_roles",
      listArgs: { org },
      mapRow: (item) => {
        const r = item as { name: string; can_open: string[]; can_write: string[] };
        return { id: r.name, name: r.name, can_open: r.can_open.join(", "), can_write: r.can_write.join(", ") } as never;
      },
    }),
  );
}

export function createOrgsCollection() {
  return createCollection(
    tauriCollectionOptions({
      id: "orgs",
      getKey: (o) => o.name as string,
      listCommand: "list_orgs",
      mapRow: (item) => {
        const name = item as string;
        return { id: name, name, node_count: 0, created_at: new Date().toISOString() } as never;
      },
    }),
  );
}
