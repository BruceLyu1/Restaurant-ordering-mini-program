import { create } from "zustand";
import type { SetStateAction } from "react";
import type { TableInfo } from "../types";
import { getDataSourceMode } from "../services/dataSource";
import { loadTables, loadTablesAsync, saveTablesAsync } from "../services/tableService";

interface TableStore {
  load: () => Promise<void>;
  tables: TableInfo[];
  updateTables: (nextTables: SetStateAction<TableInfo[]>) => Promise<void>;
}

let tableSaveQueue: Promise<void> = Promise.resolve();
let pendingTableSaves = 0;
let queuedSupabaseLoad = false;
let refreshTablesAfterQueue = false;
let tableVersion = 0;
let pendingTables: { tables: TableInfo[]; version: number } | null = null;

function areTablesEqual(first: TableInfo[], second: TableInfo[]): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function applyPendingTables(tables: TableInfo[]): TableInfo[] {
  if (!pendingTables) return tables;

  if (areTablesEqual(tables, pendingTables.tables)) {
    pendingTables = null;
    return tables;
  }

  return pendingTables.tables;
}

async function loadRemoteTables(): Promise<TableInfo[]> {
  return applyPendingTables(await loadTablesAsync());
}

export const useTableStore = create<TableStore>((set, get) => ({
  tables: getDataSourceMode() === "supabase" ? [] : loadTables(),

  load: async () => {
    if (getDataSourceMode() !== "supabase") {
      set({ tables: loadTables() });
      return;
    }

    if (pendingTableSaves > 0) {
      queuedSupabaseLoad = true;
      return;
    }

    set({ tables: await loadRemoteTables() });
  },

  updateTables: async (nextTables) => {
    const previous = get().tables;
    const resolved = typeof nextTables === "function" ? nextTables(previous) : nextTables;
    const shouldProtectTables = getDataSourceMode() === "supabase";
    const version = tableVersion + 1;
    tableVersion = version;

    if (shouldProtectTables) {
      pendingTables = { tables: resolved, version };
    }
    set({ tables: resolved });

    try {
      if (shouldProtectTables) {
        await queueTableSave(resolved, set);
      } else {
        await saveTablesAsync(resolved);
      }
    } catch (error) {
      if (pendingTables?.version === version) {
        pendingTables = null;
        if (areTablesEqual(get().tables, resolved)) set({ tables: previous });
      } else if (!shouldProtectTables && areTablesEqual(get().tables, resolved)) {
        set({ tables: previous });
      }
      throw error;
    }
  },
}));

async function queueTableSave(
  tables: TableInfo[],
  set: (state: Partial<TableStore>) => void,
): Promise<void> {
  pendingTableSaves += 1;
  const saveTask = tableSaveQueue.then(() => saveTablesAsync(tables));
  tableSaveQueue = saveTask.catch(() => {
    refreshTablesAfterQueue = true;
  });

  try {
    await saveTask;
  } finally {
    pendingTableSaves -= 1;
    if (pendingTableSaves === 0 && (queuedSupabaseLoad || refreshTablesAfterQueue)) {
      queuedSupabaseLoad = false;
      refreshTablesAfterQueue = false;
      set({ tables: await loadRemoteTables() });
    }
  }
}
