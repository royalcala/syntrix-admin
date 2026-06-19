import { invoke } from "@tauri-apps/api/core";
import type {
  CollectionConfig,
  InsertMutationFnParams,
  UpdateMutationFnParams,
  DeleteMutationFnParams,
} from "@tanstack/db";

interface TauriCollectionConfig<TItem extends { id: string | number }> {
  id: string;
  schema: CollectionConfig<TItem>["schema"];
  getKey: (item: TItem) => string | number;
  listCommand: string;
  listArgs?: Record<string, unknown>;
  insertCommand?: string;
  updateCommand?: string;
  deleteCommand?: string;
  mapRow?: (item: unknown) => TItem;
}

export function tauriCollectionOptions<TItem extends { id: string | number }>(
  config: TauriCollectionConfig<TItem>,
): CollectionConfig<TItem> {
  const mapItem = config.mapRow ?? ((item: unknown) => item as TItem);

  return {
    getKey: config.getKey,
    id: config.id,
    schema: config.schema,
    sync: {
      sync: ({ begin, write, commit, markReady }) => {
        async function load() {
          try {
            const items: unknown[] = await invoke(config.listCommand, config.listArgs ?? {});
            begin();
            for (const item of items) {
              write({ type: "insert", value: mapItem(item) });
            }
            commit();
          } catch (err) {
            console.error(`[tauriCollection] sync failed for ${config.id}:`, err);
          } finally {
            markReady();
          }
        }
        load();
      },
    },
    onInsert: config.insertCommand
      ? async (params: InsertMutationFnParams<TItem>) => {
          for (const m of params.transaction.mutations) {
            if (m.type === "insert") {
              await invoke(config.insertCommand!, { ...config.listArgs, ...m.modified as Record<string, unknown> });
            }
          }
        }
      : undefined,
    onUpdate: config.updateCommand
      ? async (params: UpdateMutationFnParams<TItem>) => {
          for (const m of params.transaction.mutations) {
            if (m.type === "update") {
              await invoke(config.updateCommand!, { ...config.listArgs, key: m.key, changes: m.changes });
            }
          }
        }
      : undefined,
    onDelete: config.deleteCommand
      ? async (params: DeleteMutationFnParams<TItem>) => {
          for (const m of params.transaction.mutations) {
            if (m.type === "delete") {
              await invoke(config.deleteCommand!, { ...config.listArgs, key: m.key });
            }
          }
        }
      : undefined,
  };
}
