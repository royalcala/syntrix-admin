import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Plus, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  { value: "sales", label: "Sales" },
  { value: "admin", label: "Admin" },
  { value: "contabilidad", label: "Contabilidad" },
  { value: "hr", label: "HR" },
];

export function Devices({ org }: { org: string }) {
  const [devices, setDevices] = useState<any[]>([]);
  const [deviceAddr, setDeviceAddr] = useState("");
  const [name, setName] = useState("");
  const [person, setPerson] = useState("");
  const [role, setRole] = useState("sales");

  async function load() {
    const d: any[] = await invoke("list_devices", { org });
    setDevices(d);
  }

  async function add() {
    if (!deviceAddr || !name || !person) return;
    let nodeId = deviceAddr;
    try { const addrJson = JSON.parse(deviceAddr); nodeId = addrJson.node_id || deviceAddr; } catch {}
    await invoke("add_device", { org, nodeId, name, person, role, deviceAddr });
    setDeviceAddr(""); setName(""); setPerson(""); setRole("sales");
    load();
  }
  useEffect(() => { load(); }, [org]);

  async function toggleActive(id: string, active: boolean) {
    await invoke("update_device", { org, nodeId: id, active: !active, role: null as unknown as string });
    load();
  }

  async function sendInvite(deviceAddr: string, role: string) {
    try {
      await invoke("send_invite", { org, endpointAddrJson: deviceAddr, role });
      toast.success("Invite sent successfully!");
    } catch (e) {
      toast.error("Failed to send invite: " + e);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add device</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            <Input placeholder="Device Address (JSON from client)" value={deviceAddr} onChange={(e) => setDeviceAddr(e.target.value)} />
            <Input placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Person (groups devices)" value={person} onChange={(e) => setPerson(e.target.value)} />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={add} disabled={!deviceAddr || !name || !person}>
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
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Node ID", "Name", "Person", "Role", "Status", "Actions", ""].map((h) => (
                    <th key={h} className="px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.node_id} className="border-b border-border last:border-0 hover:bg-muted transition-colors" style={{ opacity: d.active ? 1 : 0.4 }}>
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
                    <td className="px-6 py-3">
                      <Button variant="outline" size="sm" onClick={() => sendInvite(d.device_addr || d.node_id, d.role)} disabled={!d.active}><Send size={14} /> Invite</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
