import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Activity, Users, Wifi, WifiOff } from "lucide-react";

export function Dashboard({ org }: { org: string }) {
  const [devices, setDevices] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    invoke<any[]>("list_devices", { org }).then(setDevices);
    invoke<string>("network_status", { org }).then(setStatus);
  }, [org]);

  const active = devices.filter((d) => d.active).length;
  const online = status?.includes("online");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 rounded-lg bg-brand/10"><Users size={20} className="text-brand" /></div>
            <div>
              <p className="text-2xl font-bold">{devices.length}</p>
              <p className="text-sm text-muted">Total devices</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 rounded-lg bg-emerald-50"><Activity size={20} className="text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold">{active}</p>
              <p className="text-sm text-muted">Active devices</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className={`p-3 rounded-lg ${online ? "bg-emerald-50" : "bg-red-50"}`}>
              {online ? <Wifi size={20} className="text-emerald-600" /> : <WifiOff size={20} className="text-red-500" />}
            </div>
            <div>
              <p className="text-2xl font-bold">{online ? "Online" : "Offline"}</p>
              <p className="text-sm text-muted">P2P network</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <p className="text-sm text-muted">No devices registered yet. Add devices from the Devices tab.</p>
          ) : (
            <div className="space-y-2">
              {devices.slice(0, 5).map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted">{d.role} · {d.person}</p>
                  </div>
                  <Badge variant={d.active ? "default" : "secondary"}>{d.active ? "active" : "inactive"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
