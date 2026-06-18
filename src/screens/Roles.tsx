import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Shield } from "lucide-react";

export function Roles({ org }: { org: string }) {
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    invoke<any[]>("list_roles", { org }).then(setRoles);
  }, [org]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Roles & Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-8">
              <Shield size={32} className="text-muted mx-auto mb-3" />
              <p className="text-sm text-muted">No roles defined. The admin role has full access by default.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {roles.map((r) => (
                <div key={r.name} className="border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={16} className="text-primary" />
                    <h4 className="text-sm font-semibold uppercase tracking-wider">{r.name}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted mb-1.5 uppercase tracking-wider">Can Open</p>
                      <div className="flex flex-wrap gap-1">
                        {r.can_open?.length > 0
                          ? r.can_open.map((ns: string, i: number) => (
                              <Badge key={i} variant="secondary">{ns}</Badge>
                            ))
                          : <span className="text-xs text-muted">none</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1.5 uppercase tracking-wider">Can Write</p>
                      <div className="flex flex-wrap gap-1">
                        {r.can_write?.length > 0
                          ? r.can_write.map((ns: string, i: number) => (
                              <Badge key={i} variant="secondary">{ns}</Badge>
                            ))
                          : <span className="text-xs text-muted">none</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
