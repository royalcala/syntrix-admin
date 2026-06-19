// @ts-nocheck
import { useState, useCallback, useEffect, useMemo } from "react";
import { DataGrid } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import "../react-data-grid.css";
import { listen } from "@tauri-apps/api/event";
import { Plus, Search } from "lucide-react";
import type { EntityDefinition } from "../fields/registry";
import { DetailPanel } from "./DetailPanel";
import { invoke } from "@tauri-apps/api/core";

interface EntityGridProps {
  entity: EntityDefinition;
  activeView?: string;
  role?: string;
  orgId?: string;
  dataLoader?: () => Promise<Array<Record<string, unknown>>>;
  onCreateRecord?: (row: Row) => Promise<Row>;
  onUpdateField?: (recordId: string, field: string, value: unknown) => Promise<void>;
}

interface Row { id: string; [key: string]: unknown; }

export function EntityGrid({ entity, activeView, role, orgId, dataLoader, onCreateRecord: customCreate, onUpdateField }: EntityGridProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMode, setDetailMode] = useState<"edit" | "create">("edit");
  const [isLoading, setIsLoading] = useState(true);
  const [viewId, setViewId] = useState(activeView ?? entity.views[0]?.id ?? "all");
  const [sortColumns, setSortColumns] = useState<Array<{ columnKey: string; direction: "ASC" | "DESC" }>>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const view = entity.views.find((v) => v.id === viewId) ?? entity.views[0];
  const visibleCols = view?.visibleColumns ?? entity.fields.map((f) => f.key);

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

      setAllRows(data);
      setIsLoading(false);
    } catch (err) {
      console.error(`[EntityGrid] loadData failed for ${entity.id}:`, err);
      setIsLoading(false);
      setAllRows([]);
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

  // Filter, sort, search
  const processedRows = useMemo(() => {
    let data = [...allRows];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter((row) =>
        entity.searchFields.some((f) => String(row[f] ?? "").toLowerCase().includes(q)),
      );
    }

    // Sort
    if (sortColumns.length > 0) {
      const sc = sortColumns[0]!;
      data.sort((a, b) => {
        const va = a[sc.columnKey], vb = b[sc.columnKey];
        const field = entity.fields.find((f) => f.key === sc.columnKey);
        const cmp = field?.type === "number" || field?.type === "currency"
          ? (Number(va ?? 0) - Number(vb ?? 0))
          : String(va ?? "").localeCompare(String(vb ?? ""));
        return sc.direction === "DESC" ? -cmp : cmp;
      });
    }

    setRows(data);
    return data;
  }, [allRows, searchQuery, sortColumns, entity]);

  const columns = visibleCols.map((key) => {
    const field = entity.fields.find((f) => f.key === key);
    if (!field) return { key, name: key, resizable: true, sortable: true };

    return {
      key: field.key,
      name: field.label,
      width: field.width,
      resizable: true,
      sortable: field.sortable,
      renderCell: ({ row, column }: { row: Row; column: { key: string; name?: string } }) => {
        const value = row[column.key as keyof Row] as unknown;
        if (value == null) return <span className="text-muted-foreground/40">—</span>;

        if (field.type === "status") {
          const colors: Record<string, string> = {
            draft: "bg-muted text-muted-foreground", open: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
            paid: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
            pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
          };
          return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[String(value)] ?? "bg-muted text-muted-foreground"}`}>{value as string}</span>;
        }

        if (field.type === "boolean") return value ? <span className="text-green-600 font-medium">✓</span> : <span className="text-muted-foreground/30">—</span>;

        if (field.type === "currency") {
          const num = Number(value ?? 0);
          return <span className={`tabular-nums ${num < 0 ? "text-red-600" : ""}`}>${num.toFixed(2)}</span>;
        }

        if (field.type === "number") return <span className="tabular-nums">{Number(value).toLocaleString()}</span>;

        if (field.type === "date") {
          const d = value instanceof Date ? value : new Date(String(value));
          if (isNaN(d.getTime())) return <span className="text-muted-foreground/40">—</span>;
          return <span>{d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</span>;
        }

        return <span className="truncate">{String(value)}</span>;
      },
    };
  });

  const onSortColumnsChange = useCallback((sorts: SortColumn[]) => setSortColumns(sorts), []);

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

    // All creates go through DetailPanel (supports Select, Switch, DatePicker)
    setSelectedRow(newRow);
    setDetailMode("create");
    setDetailOpen(true);
  }, [entity]);

  const onRowClick = useCallback((row: Row) => {
    setSelectedRow({ ...row });
    setDetailMode("edit");
    setDetailOpen(true);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && detailOpen) { setDetailOpen(false); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") { e.preventDefault(); onCreateRecord(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [detailOpen, onCreateRecord]);

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-card/30">
          {/* View selector */}
          {entity.views.length > 1 && (
            <div className="flex rounded-md border overflow-hidden text-xs">
              {entity.views.map((v) => (
                <button key={v.id} onClick={() => setViewId(v.id)}
                  className={`px-2.5 py-1 transition-colors ${viewId === v.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  {v.label}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative ml-2">
            <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-muted-foreground" />
            <input
              className="w-44 pl-7 pr-2 py-1 text-xs rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <span className="absolute right-2 top-1 text-[10px] text-muted-foreground">
                {processedRows.length} / {allRows.length}
              </span>
            )}
          </div>

          <button onClick={onCreateRecord}
            className="px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ml-auto">
            <Plus className="w-3 h-3 inline mr-1" />Nuevo
          </button>
          <span className="text-xs text-muted-foreground">{processedRows.length} registros</span>
        </div>

        {/* Grid */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
              ))}
            </div>
          ) : processedRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-3">
              {searchQuery ? (
                <>
                  <Search className="w-8 h-8 opacity-30" />
                  <span>No hay resultados para "{searchQuery}"</span>
                  <button onClick={() => setSearchQuery("")} className="text-xs text-primary hover:underline">Limpiar búsqueda</button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Plus className="w-6 h-6 opacity-40" />
                  </div>
                  <span>Aún no hay {entity.label.toLowerCase()}</span>
                  <button onClick={onCreateRecord} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                    Crear primer registro
                  </button>
                </>
              )}
            </div>
          ) : (
            <DataGrid
              columns={columns}
              rows={processedRows}
              sortColumns={sortColumns}
              onSortColumnsChange={onSortColumnsChange}
              onRowClick={onRowClick}
              className="rdg h-full border-0"
              rowHeight={36}
              headerRowHeight={36}
            />
          )}
        </div>
      </div>

      {detailOpen && selectedRow && (
        <DetailPanel
          entity={entity}
          row={selectedRow}
          role={role}
          isCreate={detailMode === "create"}
          onSaveCreate={customCreate}
          onClose={() => { setDetailOpen(false); if (detailMode === "create") loadData(); }}
          onNavigate={detailMode === "create" ? undefined : (dir) => {
            const idx = processedRows.findIndex((r) => r.id === selectedRow.id);
            const next = idx + dir;
            if (next >= 0 && next < processedRows.length) {
              setSelectedRow({ ...processedRows[next]! });
              setDetailMode("edit");
            }
          }}
        />
      )}
    </div>
  );
}
