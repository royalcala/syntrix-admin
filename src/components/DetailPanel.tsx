import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Switch } from "./ui/switch";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import type { EntityDefinition } from "../fields/registry";

interface DetailPanelProps {
  entity: EntityDefinition;
  row: Record<string, unknown>;
  role?: string;
  onClose: () => void;
  onNavigate?: (dir: number) => void;
  isCreate?: boolean;
  onSaveCreate?: (row: Record<string, unknown>) => Promise<void>;
}

export function DetailPanel({ entity, row, role, onClose, onNavigate, isCreate, onSaveCreate }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState(isCreate ? "data" : entity.detail.tabs[0]?.key ?? "data");
  const [editMode, setEditMode] = useState(!!isCreate);

  const form = useForm({
    defaultValues: row as Record<string, unknown>,
    onSubmit: async ({ value }) => {
      try {
        if (isCreate && onSaveCreate) {
          await onSaveCreate(value);
        } else {
          const eventType = isCreate ? `${entity.id}.created` : `${entity.id}.updated`;
          await invoke("commit_event", { eventType, payload: JSON.stringify(value) });
        }
        toast.success(isCreate ? `${entity.label} creado` : "Cambios guardados");
        setEditMode(false);
        if (isCreate && onClose) onClose();
      } catch {
        toast.error("No se pudo guardar");
      }
    },
  });

  // Reset form when row changes (navigating between records)
  useEffect(() => {
    form.reset(row as Record<string, unknown>);
    setEditMode(!!isCreate);
  }, [row, isCreate]);

  const canEdit = entity.fields.some((f) => f.editable) || isCreate;

  const renderDataTab = () => (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-4 p-4">
      {entity.fields.map((field) => {
        if (field.permissions?.view && role && !field.permissions.view.includes(role)) return null;

        return (
          <form.Field key={field.key} name={field.key}
            validators={{
              onChange: ({ value }) => {
                if (!field.editable && !isCreate) return undefined;
                if (field.type === "number" || field.type === "currency") {
                  if (value === "" || value === undefined || value === null) return undefined;
                  return isNaN(Number(value)) ? "Debe ser un número" : undefined;
                }
                if (field.type === "email" && value) {
                  return String(value).includes("@") ? undefined : "Email inválido";
                }
                return undefined;
              },
            }}>
            {(fieldApi) => (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  {field.label}
                  {!field.editable && !isCreate && <span className="text-[10px] text-muted-foreground/50">(automático)</span>}
                </label>

                {editMode && (field.editable || isCreate) ? (
                  <div>
                    {field.type === "status" || field.type === "select" ? (
                      <Select
                        value={String(fieldApi.state.value ?? "")}
                        onValueChange={(v) => fieldApi.handleChange(v)}>
                        <SelectTrigger className={fieldApi.state.meta.errors.length > 0 ? "border-destructive" : ""}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(field.options ?? (
                            field.type === "status" ? [
                              { label: "Borrador", value: "draft" },
                              { label: "Abierta", value: "open" },
                              { label: "Pagada", value: "paid" },
                              { label: "Cancelada", value: "cancelled" },
                            ] : []
                          )).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === "boolean" ? (
                      <Switch checked={!!fieldApi.state.value} onCheckedChange={(v) => fieldApi.handleChange(v)} />
                    ) : field.type === "date" ? (
                      <Input
                        type="date"
                        value={String(fieldApi.state.value ?? "").slice(0, 10)}
                        onChange={(e) => fieldApi.handleChange(e.target.value)}
                        className={fieldApi.state.meta.errors.length > 0 ? "border-destructive" : ""}
                      />
                    ) : (
                      <Input
                        type={field.type === "number" || field.type === "currency" ? "number" : "text"}
                        value={String(fieldApi.state.value ?? "")}
                        onChange={(e) => fieldApi.handleChange(field.type === "number" || field.type === "currency" ? Number(e.target.value) : e.target.value)}
                        className={fieldApi.state.meta.errors.length > 0 ? "border-destructive" : ""}
                        placeholder={field.type === "currency" ? "0.00" : field.type === "number" ? "0" : ""}
                      />
                    )}
                    {fieldApi.state.meta.errors.map((err: string) => (
                      <p key={err} className="text-xs text-destructive mt-1">{err}</p>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm px-3 py-2 bg-muted/30 rounded-md min-h-[2.25rem] flex items-center">
                    {field.type === "status" ? (
                      <StatusBadge status={String(fieldApi.state.value ?? "")} />
                    ) : field.type === "boolean" ? (
                      fieldApi.state.value ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-muted-foreground/30" />
                    ) : field.type === "currency" ? (
                      `$${Number(fieldApi.state.value ?? 0).toFixed(2)}`
                    ) : (
                      String(fieldApi.state.value ?? "—")
                    )}
                  </div>
                )}
              </div>
            )}
          </form.Field>
        );
      })}

      {editMode && (
        <div className="flex gap-2 pt-2">
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  {isSubmitting ? "Guardando..." : isCreate ? "Crear" : "Guardar"}
                </Button>
                <Button type="button" size="sm" variant="ghost"
                  onClick={() => {
                    if (isCreate) { onClose(); } else { form.reset(row as Record<string, unknown>); setEditMode(false); }
                  }}
                  disabled={isSubmitting}>
                  Cancelar
                </Button>
              </>
            )}
          </form.Subscribe>
        </div>
      )}
    </form>
  );
