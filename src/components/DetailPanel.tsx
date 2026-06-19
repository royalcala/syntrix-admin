import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import type { EntityDefinition } from "../fields/registry";
import { getFieldRenderer } from "../fields/registry";

interface DetailPanelProps {
  entity: EntityDefinition;
  row: Record<string, unknown>;
  role?: string;
  onClose: () => void;
  onNavigate?: (dir: number) => void;
}

export function DetailPanel({ entity, row, role, onClose, onNavigate }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState(entity.detail.tabs[0]?.key ?? "data");
  const [editMode, setEditMode] = useState(false);
  const [localRow, setLocalRow] = useState({ ...row });

  const handleFieldChange = (key: string, value: unknown) => {
    setLocalRow((prev) => ({ ...prev, [key]: value }));

    // Per-field granular event — commit each field edit independently
    const collection = entity.collection as {
      update: (id: string | number, updater: (draft: Record<string, unknown>) => void) => void;
    };
    collection.update(row.id as string | number, (draft: Record<string, unknown>) => {
      draft[key] = value;
    });
  };

  const renderDataTab = () => (
    <div className="space-y-4 p-4">
      {entity.fields.map((field) => {
        if (field.permissions?.view && role && !field.permissions.view.includes(role)) {
          return null;
        }
        const value = localRow[field.key];
        const renderer = getFieldRenderer(field.type);

        return (
          <div key={field.key} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
            {editMode && field.editable ? (
              <input
                type={field.type === "number" || field.type === "currency" ? "number" : "text"}
                value={String(value ?? "")}
                onChange={(e) =>
                  handleFieldChange(field.key, field.type === "number" || field.type === "currency" ? Number(e.target.value) : e.target.value)
                }
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              />
            ) : field.type === "relation" || field.type === "status" ? (
              <div className="text-sm px-3 py-2 bg-muted/30 rounded-md">
                {renderer.detail.renderViewer(value)}
              </div>
            ) : (
              <div className="text-sm">{renderer.detail.renderViewer(value)}</div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderHistoryTab = () => (
    <div className="p-4 text-sm text-muted-foreground">
      Historial de cambios — próximamente.
    </div>
  );

  return (
    <div className="w-[420px] border-l bg-background flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          {onNavigate && (
            <>
              <Button variant="ghost" size="icon" onClick={() => onNavigate(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onNavigate(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          <span className="text-sm font-medium truncate">
            {String(localRow[entity.fields[0]?.key ?? "id"] ?? "")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {entity.fields.some((f) => f.editable) && (
            <Button variant="ghost" size="sm" onClick={() => setEditMode(!editMode)}>
              {editMode ? "Ver" : "Editar"}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex border-b px-2">
        {entity.detail.tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === "data" && renderDataTab()}
        {activeTab === "history" && renderHistoryTab()}
        {activeTab !== "data" && activeTab !== "history" && (
          <div className="p-4 text-sm text-muted-foreground">
            {entity.detail.tabs.find((t) => t.key === activeTab)?.label} — próximamente.
          </div>
        )}
      </div>
    </div>
  );
}
