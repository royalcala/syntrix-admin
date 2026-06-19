import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import DataEditor, {
  type GridColumn,
  type GridCell,
  type Item,
  GridCellKind,
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import { listen } from "@tauri-apps/api/event";
import type { EntityDefinition } from "../fields/registry";
import { getFieldRenderer } from "../fields/registry";
import { DetailPanel } from "./DetailPanel";
import { invoke } from "@tauri-apps/api/core";

interface EntityGridProps {
  entity: EntityDefinition;
  activeView?: string;
  role?: string;
}

export function EntityGrid({ entity, activeView, role }: EntityGridProps) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const gridRef = useRef<DataEditor | null>(null);

  const view = activeView
    ? entity.views.find((v) => v.id === activeView) ?? entity.views[0]
    : entity.views[0];

  const visibleCols = view?.visibleColumns ?? entity.fields.map((f) => f.key);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await invoke<{ batch: Array<{ eventEncoded: { payload: Record<string, unknown>; type: string } }>; hasMore: boolean; cursor: unknown }>("sync_pull", { orgId: "", cursor: null });
      const data = result.batch
        .map((e) => e.eventEncoded.payload)
        .filter((p): p is Record<string, unknown> => p != null && typeof p === "object");
      setRows(data);
      setIsLoading(false);
    } catch (err) {
      console.error(`[EntityGrid] loadData failed for ${entity.id}:`, err);
      setIsLoading(false);
      // Show empty state instead of failing silently
      setRows([]);
    }
  }, [entity.id]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for real-time data changes from iroh-docs
  useEffect(() => {
    const unlisten = listen<{ org_id: string; event: { type: string; payload: Record<string, unknown> } }>("data-changed", (event) => {
      const { event: syncEvent } = event.payload;
      const entityType = syncEvent.type?.split(".")[0];
      if (entityType === entity.id || syncEvent.type?.startsWith(`${entity.id}.`)) {
        // Re-fetch all data when changes occur (simple approach for MVP)
        loadData();
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [entity.id, loadData]);

  const columns: GridColumn[] = useMemo(
    () =>
      visibleCols.map((key) => {
        const field = entity.fields.find((f) => f.key === key);
        return { id: key, title: field?.label ?? key, width: field?.width ?? 150 };
      }),
    [entity.fields, visibleCols],
  );

  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      const colId = columns[col]?.id;
      if (!colId || row >= rows.length || isLoading) {
        return { kind: GridCellKind.Loading, allowOverlay: false };
      }
      const field = entity.fields.find((f) => f.key === colId);
      if (!field) return { kind: GridCellKind.Text, data: "", displayData: "", allowOverlay: false };

      const rowData = rows[row];
      const value = rowData?.[field.key];
      const renderer = getFieldRenderer(field.type);

      let display = String(value ?? "");
      if (field.type === "date" && value instanceof Date) display = value.toLocaleDateString();
      else if (field.type === "currency") display = `$${Number(value ?? 0).toFixed(2)}`;
      else if (field.type === "boolean") display = value ? "Sí" : "No";

      return renderer.grid.renderCell(value, display, field.editable, field.theme);
    },
    [columns, rows, entity.fields, isLoading],
  );

  const onCellEdited = useCallback(
    async (cell: Item, newValue: GridCell) => {
      const colId = columns[cell[0]]?.id;
      if (!colId) return;
      const field = entity.fields.find((f) => f.key === colId);
      if (!field?.editable) return;
      const rowData = rows[cell[1]];
      if (!rowData) return;

      const recordId = rowData.id as string;
      if (!recordId) return;

      const value = newValue.data;
      const prevRow = { ...rowData };

      // Optimistic local update
      setRows((prev) => {
        const next = [...prev];
        const target = next[cell[1]];
        if (target && typeof target === "object") {
          next[cell[1]] = { ...(target as Record<string, unknown>), [colId]: value };
        }
        return next;
      });

      try {
        await invoke("commit_event", {
          eventType: `${entity.id}.field_updated`,
          payload: JSON.stringify({ id: recordId, field: colId, value }),
        });
      } catch (err) {
        console.error(`[EntityGrid] commit_event failed for ${colId}:`, err);
        // Rollback
        setRows((prev) => {
          const next = [...prev];
          next[cell[1]] = prevRow;
          return next;
        });
      }
    },
    [columns, entity.id, entity.fields, rows],
  );

  const onCreateRecord = useCallback(async () => {
    const newId = crypto.randomUUID?.() ?? `${Date.now()}`;
    const newRow: Record<string, unknown> = { id: newId };
    entity.fields.forEach((f) => {
      if (f.key !== "id") {
        if (f.type === "number" || f.type === "currency") newRow[f.key] = 0;
        else if (f.type === "boolean") newRow[f.key] = false;
        else if (f.type === "status") newRow[f.key] = f.options?.[0]?.value ?? "draft";
        else if (f.type === "date") newRow[f.key] = new Date().toISOString();
        else newRow[f.key] = "";
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

  const onRowClicked = useCallback((row: number) => {
    setSelectedRow(row);
    setDetailOpen(true);
  }, []);

  const rowCount = rows.length;

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-card/30">
          <button
            onClick={onCreateRecord}
            className="px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Nuevo
          </button>
          {view && view.id !== "all" && (
            <span className="text-xs text-muted-foreground ml-2">Vista: {view.label}</span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{rowCount} registros</span>
        </div>

        {/* Grid */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Cargando...
              </div>
            </div>
          ) : rowCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-3">
              <span>Aún no hay {entity.label.toLowerCase()}</span>
              <button onClick={onCreateRecord} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                Crear primer registro
              </button>
            </div>
          ) : (
            <DataEditor
              columns={columns}
              rows={rowCount}
              getCellContent={getCellContent}
              onCellEdited={onCellEdited}
              onRowClicked={onRowClicked}
              rowMarkers="number"
              smoothScrollX
              smoothScrollY
              headerHeight={36}
              rowHeight={32}
            />
          )}
        </div>
      </div>
      {detailOpen && selectedRow !== null && selectedRow < rowCount && (
        <DetailPanel
          entity={entity}
          row={rows[selectedRow] ?? {}}
          role={role}
          onClose={() => setDetailOpen(false)}
          onNavigate={(dir) => {
            const next = selectedRow + dir;
            if (next >= 0 && next < rowCount) setSelectedRow(next);
          }}
        />
      )}
    </div>
  );
}
