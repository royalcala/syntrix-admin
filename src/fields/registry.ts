import type { GridCell } from "@glideapps/glide-data-grid";
import { GridCellKind } from "@glideapps/glide-data-grid";
import type { ReactNode } from "react";

export interface FieldTypePlugin {
  id: string;
  grid: {
    renderCell: (
      value: unknown,
      displayData: string,
      editable: boolean,
      theme?: Record<string, unknown>,
    ) => GridCell;
    getWidth?: () => number;
  };
  detail: {
    renderEditor: (
      value: unknown,
      row: Record<string, unknown>,
      onChange: (value: unknown) => void,
    ) => ReactNode;
    renderViewer: (value: unknown) => ReactNode;
  };
  validate?: (value: unknown) => string | null;
  sort?: (a: unknown, b: unknown, dir: "asc" | "desc") => number;
  filterOperators: string[];
}

export interface EntityFieldConfig {
  key: string;
  label: string;
  type: string;
  width: number;
  editable: boolean;
  sortable: boolean;
  options?: { label: string; value: string }[];
  theme?: Record<string, unknown>;
  permissions?: { view?: string[]; edit?: string[] };
}

export interface ViewDefinition {
  id: string;
  label: string;
  filters: FilterRule[];
  sort: { field: string; dir: "asc" | "desc" }[];
  visibleColumns: string[];
}

export interface FilterRule {
  field: string;
  op: string;
  value: unknown;
}

export interface DetailTab {
  key: string;
  label: string;
  icon?: string;
}

export interface EntityDefinition {
  id: string;
  label: string;
  icon: string;
  fields: EntityFieldConfig[];
  views: ViewDefinition[];
  detail: { tabs: DetailTab[] };
  searchFields: string[];
  canEdit?: (row: Record<string, unknown>, role?: string) => boolean;
  canDelete?: (row: Record<string, unknown>, role?: string) => boolean;
}

export interface EntityAction {
  id: string;
  label: string;
  icon: string;
  handler: () => void;
}

type FieldRenderers = Record<string, FieldTypePlugin>;

const fieldRenderers: FieldRenderers = {};

export function registerFieldType(plugin: FieldTypePlugin): void {
  fieldRenderers[plugin.id] = plugin;
}

export function getFieldRenderer(type: string): FieldTypePlugin {
  return fieldRenderers[type] ?? textField;
}

export function createGridCell(
  kind: GridCellKind,
  value: unknown,
  displayData: string,
  allowOverlay: boolean,
  theme?: Record<string, unknown>,
): GridCell {
  return {
    kind,
    data: value,
    displayData,
    allowOverlay,
    themeOverride: theme,
  } as GridCell;
}

function statusColors(v: string): Record<string, unknown> {
  const colors: Record<string, string> = {
    draft: "#6b7280",
    open: "#3b82f6",
    paid: "#22c55e",
    cancelled: "#ef4444",
    pending: "#f59e0b",
    confirmed: "#8b5cf6",
    shipped: "#06b6d4",
    delivered: "#22c55e",
    active: "#22c55e",
    inactive: "#6b7280",
  };
  return { bgCell: colors[v] ?? "#6b7280", textDark: "#ffffff" };
}

export const textField: FieldTypePlugin = {
  id: "text",
  grid: {
    renderCell: (v, displayData, editable) =>
      createGridCell(GridCellKind.Text, v, displayData || String(v ?? ""), editable),
  },
  detail: {
    renderEditor: (v, _row, onChange) => null, // handled by EntityForm
    renderViewer: (v) => String(v ?? ""),
  },
  filterOperators: ["eq", "neq", "contains", "startsWith"],
};

export const numberField: FieldTypePlugin = {
  id: "number",
  grid: {
    renderCell: (v, displayData, _e) =>
      createGridCell(GridCellKind.Number, Number(v ?? 0), displayData || String(v ?? ""), false),
  },
  detail: {
    renderEditor: (v, _row, onChange) => null,
    renderViewer: (v) => String(v ?? 0),
  },
  sort: (a, b, dir) => (dir === "asc" ? Number(a) - Number(b) : Number(b) - Number(a)),
  filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte"],
};

export const currencyField: FieldTypePlugin = {
  id: "currency",
  grid: {
    renderCell: (v, _displayData, _e) => {
      const num = Number(v ?? 0);
      return createGridCell(GridCellKind.Number, num, `$${num.toFixed(2)}`, false);
    },
  },
  detail: {
    renderEditor: (v, _row, onChange) => null,
    renderViewer: (v) => `$${Number(v ?? 0).toFixed(2)}`,
  },
  sort: (a, b, dir) => (dir === "asc" ? Number(a) - Number(b) : Number(b) - Number(a)),
  filterOperators: ["eq", "gt", "gte", "lt", "lte"],
};

export const dateField: FieldTypePlugin = {
  id: "date",
  grid: {
    renderCell: (v, _displayData, _e) => {
      const d = v instanceof Date ? v : new Date(String(v ?? Date.now()));
      return createGridCell(GridCellKind.Text, d.toISOString(), d.toLocaleDateString(), false);
    },
  },
  detail: {
    renderEditor: (v, _row, onChange) => null,
    renderViewer: (v) => (v instanceof Date ? v.toLocaleDateString() : String(v ?? "")),
  },
  sort: (a, b, dir) => {
    const da = new Date(String(a ?? 0)).getTime();
    const db = new Date(String(b ?? 0)).getTime();
    return dir === "asc" ? da - db : db - da;
  },
  filterOperators: ["eq", "gt", "gte", "lt", "lte"],
};

export const selectField: FieldTypePlugin = {
  id: "select",
  grid: {
    renderCell: (v, displayData, _e) =>
      createGridCell(GridCellKind.Text, v, displayData || String(v ?? ""), true),
  },
  detail: {
    renderEditor: (v, _row, onChange) => null,
    renderViewer: (v) => String(v ?? ""),
  },
  filterOperators: ["eq", "neq"],
};

export const statusField: FieldTypePlugin = {
  id: "status",
  grid: {
    renderCell: (v, _displayData, _e) =>
      createGridCell(GridCellKind.Text, v, String(v ?? ""), true, statusColors(String(v ?? ""))),
  },
  detail: {
    renderEditor: (v, _row, onChange) => null,
    renderViewer: (v) => String(v ?? ""),
  },
  filterOperators: ["eq", "neq"],
};

export const relationField: FieldTypePlugin = {
  id: "relation",
  grid: {
    renderCell: (v, displayData, _e) =>
      createGridCell(GridCellKind.Text, v, displayData || String(v ?? ""), true),
  },
  detail: {
    renderEditor: (v, _row, onChange) => null,
    renderViewer: (v) => String(v ?? ""),
  },
  filterOperators: ["eq", "neq"],
};

export const booleanField: FieldTypePlugin = {
  id: "boolean",
  grid: {
    renderCell: (v, _displayData, _e) =>
      createGridCell(GridCellKind.Boolean, Boolean(v), v ? "Sí" : "No", true),
  },
  detail: {
    renderEditor: (v, _row, onChange) => null,
    renderViewer: (v) => (v ? "Sí" : "No"),
  },
  filterOperators: ["eq"],
};

registerFieldType(textField);
registerFieldType(numberField);
registerFieldType(currencyField);
registerFieldType(dateField);
registerFieldType(selectField);
registerFieldType(statusField);
registerFieldType(relationField);
registerFieldType(booleanField);

export { textField as default };
