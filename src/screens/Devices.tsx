import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Plus, RefreshCw } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "sales", label: "Sales" },
  { value: "admin", label: "Admin" },
  { value: "contabilidad", label: "Contabilidad" },
  { value: "hr", label: "HR" },
];

export function Devices({ org }: { org: string }) {
  const [devices, setDevices] = useState<any[]>([]);
  const [nodeId, setNodeId] = useState("");
  const [name, setName] = useState("");
  const [person, setPerson] = useState("");
  const [role, setRole] = useState("sales");

  async function load() {
    const d: any[] = await invoke("list_devices", { org });
    setDevices(d);
  }
  useEffect(() => { load(); }, [org]);

  async function add() {
    if (!nodeId || !name || !person) return;
    await invoke("add_device", { org, nodeId, name, person, role });
    setNodeId(""); setName(""); setPerson(""); setRole("sales");
    load();
  }

  async function toggleActive(id: string, active: boolean) {
    await invoke("update_device", { org, nodeId: id, active: !active, role: null as unknown as string });
    load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add device</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3 mb-4">
            <Input placeholder="Node ID (hex)" value={nodeId} onChange={(e) => setNodeId(e.target.value)} />
            <Input placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Person (groups devices)" value={person} onChange={(e) => setPerson(e.target.value)} />
            <Select options={ROLE_OPTIONS} value={role} onChange={(e) => setRole(e.target.value)} />
            <Button onClick={add} disabled={!nodeId || !name || !person}>
              <Plus size={16} /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Devices ({devices.length})</CardTitle>
          <Button variant="ghost" size="icon" onClick={load}>
            <RefreshCw size={16} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {devices.length === 0 ? (
            <p className="text-sm text-muted p-6">No devices registered. Add one above.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Node ID", "Name", "Person", "Role", "Status", ""].map((h) => (
                    <th key={h} className="px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.node_id} className="border-b border-border last:border-0 hover:bg-zinc-50 transition-colors" style={{ opacity: d.active ? 1 : 0.4 }}>
                    <td className="px-6 py-3 text-sm font-mono">{d.node_id.slice(0, 14)}...</td>
                    <td className="px-6 py-3 text-sm font-medium">{d.name}</td>
                    <td className="px-6 py-3 text-sm">{d.person}</td>
                    <td className="px-6 py-3"><Badge variant="outline">{d.role}</Badge></td>
                    <td className="px-6 py-3"><Badge variant={d.active ? "default" : "secondary"}>{d.active ? "active" : "inactive"}</Badge></td>
                    <td className="px-6 py-3">
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(d.node_id, d.active)}>
                        {d.active ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
