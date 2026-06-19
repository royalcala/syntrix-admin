import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { EntityGrid } from "../components/EntityGrid";
import { devicesEntity } from "../entities/devices";

interface DeviceInfo {
  node_id: string;
  name: string;
  person: string;
  role: string;
  active: boolean;
}

export function DevicesGridPage({ org }: { org: string }) {
  async function loadDevices() {
    const devices: DeviceInfo[] = await invoke("list_devices", { org });
    return devices.map((d) => ({
      id: d.node_id,
      node_id: d.node_id,
      name: d.name,
      person: d.person,
      role: d.role,
      active: d.active,
    })) as Array<Record<string, unknown>>;
  }

  return (
    <EntityGrid
      entity={devicesEntity}
      dataLoader={loadDevices}
      role="admin"
      onCreateRecord={async (row) => {
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
