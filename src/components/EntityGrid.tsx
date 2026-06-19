import { useState, useCallback, useEffect } from "react";
import DataGrid, { type Column, type RenderCellProps, type RenderEditCellProps, textEditor, SelectColumn } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { listen } from "@tauri-apps/api/event";
import type { EntityDefinition } from "../fields/registry";
import { getFieldRenderer } from "../fields/registry";
import { DetailPanel } from "./DetailPanel";
import { invoke } from "@tauri-apps/api/core";

interface EntityGridProps {
  entity: EntityDefinition;
  activeView?: string;
  role?: string;
  orgId?: string;
  dataLoader?: () => Promise<Array<Record<string, unknown>>>;
}

interface Row {
  id: string;
  [key: string]: unknown;
}

export function EntityGrid({ entity, activeView, role, orgId, dataLoader }: EntityGridProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const view = activeView
    ? entity.views.find((v) => v.id === activeView) ?? entity.views[0]
    : entity.views[0];

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      let data: Row[];

      if (dataLoader) {
        data = (await dataLoader()) as Row[];
      } else {
        const result = await invoke<{ batch: Array<{ eventEncoded: { payload: Row; type: string } }> }>("sync_pull", { orgId: orgId ?? "", cursor: null });
        data = result.batch.map((e) => ({ ...(e.eventEncoded.payload as Record<string, unknown>), id: (e.eventEncoded.payload as Record<string, unknown>).id ?? crypto.randomUUID() })) as Row[];
      }

      setRows(data);
      setIsLoading(false);
    } catch (err) {
      console.error(`[EntityGrid] loadData failed for ${entity.id}:`, err);
      setIsLoading(false);
      setRows([]);
    }
  }, [dataLoader, entity.id, orgId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const unlisten = listen<{ org_id: string; event: { type: string; payload: Record<string, unknown> } }>("data-changed", (event) => {
      const entityType = event.payload.event.type?.split(".")[0];
      if (entityType === entity.id || event.payload.event.type?.startsWith(`${entity.id}.`)) {
        loadData();
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [entity.id, loadData]);

  const visibleCols = view?.visibleColumns ?? entity.fields.map((f) => f.key);

  const columns = visibleCols.map((key): Column<Row> => {
    const field = entity.fields.find((f) => f.key === key);
    if (!field) return { key, name: key };

    const editable = field.editable ?? false;

    return {
      key: field.key,
      name: field.label,
      width: field.width,
      editable,
      editor: editable ? textEditor : undefined,
      renderCell: ({ row, column }: RenderCellProps<Row>) => {
        const value = row[column.key as keyof Row] as unknown;
        const renderer = getFieldRenderer(field.type);
        let display = String(value ?? "");
        if (field.type === "date" && value instanceof Date) display = value.toLocaleDateString();
        else if (field.type === "currency") display = `$${Number(value ?? 0).toFixed(2)}`;
        else if (field.type === "boolean") display = value ? "Sí" : "No";
        else if (field.type === "status") {
          const colors: Record<string, string> = { draft: "#6b7280", open: "#3b82f6", paid: "#22c55e", cancelled: "#ef4444", pending: "#f59e0b" };
          return <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ background: colors[String(value)] ?? "#6b7280" }}>{value as string}</span>;
        }
        return <span>{display}</span>;
      },
    };
  });

  const onRowsChange = useCallback(
    (newRows: Row[], { column, indexes }: { column: Column<Row>; indexes: number[] }) => {
      const rowIdx = indexes[0];
      const rowData = rows[rowIdx];
      if (!rowIdx || !rowData) return;

      const newValue = newRows[rowIdx][column.key];
      const recordId = rowData.id;

      setRows(newRows);

      invoke("commit_event", {
        eventType: `${entity.id}.field_updated`,
        payload: JSON.stringify({ id: recordId, field: column.key, value: newValue }),
      }).catch((err) => console.error("[EntityGrid] commit_event failed:", err));
    },
    [entity, rows],
  );

  const onCreateRecord = useCallback(async () => {
    const newId = crypto.randomUUID?.() ?? `${Date.now()}`;
    const newRow: Row = { id: newId };
    entity.fields.forEach((f) => {
      if (f.key !== "id") {
        if (f.type === "number" || f.type === "currency") newRow[f.key] = 0 as unknown;
        else if (f.type === "boolean") newRow[f.key] = false as unknown;
        else if (f.type === "status") newRow[f.key] = f.options?.[0]?.value ?? "draft" as unknown;
        else if (f.type === "date") newRow[f.key] = new Date().toISOString() as unknown;
        else newRow[f.key] = "" as unknown;
      }
    });

    setRows((prev) => [newRow, ...prev]);

    try {
      await invoke("commit_event", {
        eventType: `${entity.id}.created`,
        payload: JSON.stringify(newRow),
      });
    } catch (err) {
      console.error(`[EntityGrid] create failed:`, err);
    }
  }, [entity]);

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-card/30">
          <button
            onClick={onCreateRecord}
            className="px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Nuevo
          </button>
          <span className="text-xs text-muted-foreground ml-auto">{rows.length} registros</span>
        </div>

        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Cargando...
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-3">
              <span>Aún no hay {entity.label.toLowerCase()}</span>
              <button onClick={onCreateRecord} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                Crear primer registro
              </button>
            </div>
          ) : (
            <DataGrid
              columns={columns}
              rows={rows}
              onRowsChange={onRowsChange}
              onRowClick={(row) => { setSelectedRow(row); setDetailOpen(true); }}
              className="rdg-light h-full border-0"
            />
          )}
        </div>
      </div>
      {detailOpen && selectedRow && (
        <DetailPanel
          entity={entity}
          row={selectedRow}
          role={role}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </div>
  );
}
