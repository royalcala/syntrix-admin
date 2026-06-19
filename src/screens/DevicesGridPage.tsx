import { useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { EntityGrid } from "../components/EntityGrid";
import { devicesEntity } from "../entities/devices";
import { createDevicesCollection } from "../collections/devices";

export function DevicesGridPage({ org }: { org: string }) {
  const collection = useMemo(() => createDevicesCollection(org), [org]);
  const entity = useMemo(() => ({ ...devicesEntity, collection }), [collection]);

  return (
    <EntityGrid
      entity={entity}
      role="admin"
      onSaveCreate={async (row) => {
        await invoke("add_device", {
          org,
          nodeId: row.node_id as string,
          role: row.role as string,
          name: (row.name as string) || (row.node_id as string).slice(0, 12),
          person: (row.person as string) || "user",
        });
        toast.success("Dispositivo agregado");
        return row;
      }}
    />
  );
}
