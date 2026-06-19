import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import DataEditor, {
  type GridColumn,
  type GridCell,
  type Item,
  GridCellKind,
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
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

  // Load data via the collection snapshot
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setIsLoading(true);
        const collection = entity.collection as {
          toArray?: () => Promise<Array<Record<string, unknown>>>;
          entries?: () => Array<Record<string, unknown>>;
        };

        let data: Array<Record<string, unknown>> = [];

        if (collection.toArray) {
          data = await collection.toArray();
        } else if (collection.entries) {
          data = collection.entries();
        } else {
          // Fallback: try useLiveQuery pattern via invoke
          const result = await invoke<{ batch: Array<{ eventEncoded: { payload: Record<string, unknown> } }> }>("sync_pull", { orgId: "", cursor: null });
          data = result.batch.map((e) => e.eventEncoded.payload).filter((p): p is Record<string, unknown> => p != null && typeof p === "object");
        }

        if (!cancelled) {
          setRows(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error(`[EntityGrid] failed to load data for ${entity.id}:`, err);
        if (!cancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [entity]);

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
        // Per-field granular event to iroh-docs
        await invoke("commit_event", {
          eventType: `${entity.id}.field_updated`,
          payload: JSON.stringify({ id: recordId, field: colId, value }),
        });
      } catch (err) {
        console.error(`[EntityGrid] commit_event failed:`, err);
        // Rollback optimistic update
        setRows((prev) => {
          const next = [...prev];
          next[cell[1]] = rowData;
          return next;
        });
      }
    },
    [columns, entity, rows],
  );

  const onRowClicked = useCallback((row: number) => {
    setSelectedRow(row);
    setDetailOpen(true);
  }, []);

  const rowCount = rows.length;

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="p-8 text-muted-foreground text-sm">Cargando...</div>
        ) : rowCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
            <span>No hay datos en {entity.label.toLowerCase()}</span>
            <span className="text-xs">El adapter cargará los datos cuando iroh-docs sincronice</span>
          </div>
        ) : (
          <DataEditor
            ref={gridRef}
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
