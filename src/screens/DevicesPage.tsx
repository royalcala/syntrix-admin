import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../components/ui/button";
import { Plus } from "lucide-react";

interface DeviceInfo { node_id: string; name: string; person: string; role: string; active: boolean; }

export function DevicesPage({ org }: { org: string }) {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    invoke<DeviceInfo[]>("list_devices", { org }).then(setDevices);
  }, [org]);

  if (devices.length === 0) return <div className="p-6 text-muted-foreground text-sm">No hay dispositivos en esta org. Usá "Share" para invitar.</div>;

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Dispositivos</h2>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4">Node ID</th><th className="py-2 pr-4">Nombre</th><th className="py-2 pr-4">Persona</th><th className="py-2 pr-4">Rol</th><th className="py-2">Activo</th>
        </tr></thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.node_id} className="border-b hover:bg-muted/30">
              <td className="py-2 pr-4 font-mono text-xs">{d.node_id.slice(0, 16)}...</td>
              <td className="py-2 pr-4">{d.name}</td>
              <td className="py-2 pr-4">{d.person}</td>
              <td className="py-2 pr-4">{d.role}</td>
              <td className="py-2">{d.active ? "✅" : "❌"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
