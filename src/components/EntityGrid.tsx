import { useState, useCallback, useMemo } from "react";
import DataEditor, {
  type GridColumn,
  type GridCell,
  type Item,
  GridCellKind,
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import { useLiveQuery, eq } from "@tanstack/react-db";
import type { EntityDefinition, FilterRule } from "../fields/registry";
import { getFieldRenderer } from "../fields/registry";
import { DetailPanel } from "./DetailPanel";

interface EntityGridProps {
  entity: EntityDefinition;
  activeView?: string;
  role?: string;
}

export function EntityGrid({ entity, activeView, role }: EntityGridProps) {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const view = activeView
    ? entity.views.find((v) => v.id === activeView) ?? entity.views[0]
    : entity.views[0];

  const { data, isLoading } = useLiveQuery((q) => {
    let query = q.from({ row: entity.collection as never });
    if (view?.filters.length) {
      query = query.where(() => {
        const conditions = view.filters.map((f: FilterRule) => eq(({ row: r }: { row: Record<string, unknown> }) => r[f.field] as never, f.value as never));
        return conditions[0]!;
      });
    }
    return query;
  });

  const rawData = (data as Record<string, unknown>[] | undefined) ?? [];

  const displayData = useMemo(() => {
    return rawData.map((row) => {
      const display: Record<string, string> = {};
      for (const field of entity.fields) {
        const renderer = getFieldRenderer(field.type);
        const value = row[field.key];
        if (field.type === "relation") {
          display[field.key] = String(value ?? "");
        } else if (field.type === "date" && value instanceof Date) {
          display[field.key] = value.toLocaleDateString();
        } else if (field.type === "currency") {
          display[field.key] = `$${Number(value ?? 0).toFixed(2)}`;
        } else if (field.type === "status") {
          display[field.key] = String(value ?? "");
        } else {
          display[field.key] = String(value ?? "");
        }
      }
      return display;
    });
  }, [rawData, entity.fields]);

  const columns: GridColumn[] = useMemo(
    () =>
      (view?.visibleColumns ?? entity.fields.map((f) => f.key)).map((key) => {
        const field = entity.fields.find((f: EntityDefinition["fields"][number]) => f.key === key);
        return {
          id: key,
          title: field?.label ?? key,
          width: field?.width ?? 150,
        };
      }),
    [entity.fields, view],
  );

  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      const colId = columns[col]?.id;
      if (!colId || row >= rawData.length) {
        return { kind: GridCellKind.Loading, allowOverlay: false };
      }
      const field = entity.fields.find((f) => f.key === colId);
      if (!field) return { kind: GridCellKind.Text, data: "", displayData: "", allowOverlay: false };

      const rowData = rawData[row];
      const value = rowData?.[field.key];
      const renderer = getFieldRenderer(field.type);
      const display = displayData[row]?.[field.key] ?? "";

      return renderer.grid.renderCell(value, display, field.editable, field.theme);
    },
    [columns, rawData, displayData, entity.fields],
  );

  const onCellEdited = useCallback(
    (cell: Item, newValue: GridCell) => {
      const colId = columns[cell[0]]?.id;
      if (!colId) return;
      const field = entity.fields.find((f) => f.key === colId);
      if (!field?.editable) return;
      const rowData = rawData[cell[1]];
      if (!rowData) return;

      // Per-field granular event (not whole row)
      const collection = entity.collection as { update: (id: string | number, updater: (draft: Record<string, unknown>) => void) => void };
      collection.update(rowData.id as string | number, (draft: Record<string, unknown>) => {
        draft[colId] = newValue.data;
      });
    },
    [columns, entity, rawData],
  );

  const onRowClicked = useCallback((row: number) => {
    setSelectedRow(row);
    setDetailOpen(true);
  }, []);

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;
  const rowCount = rawData.length;

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0">
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
          searchResults={
            searchValue
              ? rawData
                  .map((row, i) => {
                    const matches = entity.searchFields?.some((f) =>
                      String(row[f] ?? "").toLowerCase().includes(searchValue.toLowerCase()),
                    );
                    return matches ? { col: 0, row: i } : null;
                  })
                  .filter(Boolean) as { col: number; row: number }[]
              : undefined
          }
          onSearchClose={() => setSearchValue("")}
        />
      </div>
      {detailOpen && selectedRow !== null && selectedRow < rowCount && (
        <DetailPanel
          entity={entity}
          row={rawData[selectedRow] as Record<string, unknown>}
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
