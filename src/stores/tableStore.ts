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

export const useTableStore = create<TableStore>((set, get) => ({
  tables: getDataSourceMode() === "supabase" ? [] : loadTables(),

  load: async () => {
    if (getDataSourceMode() !== "supabase") {
      set({ tables: loadTables() });
      return;
    }

    set({ tables: await loadTablesAsync() });
  },

  updateTables: async (nextTables) => {
    const previous = get().tables;
    const resolved = typeof nextTables === "function" ? nextTables(previous) : nextTables;
    set({ tables: resolved });

    try {
      await saveTablesAsync(resolved);
    } catch (error) {
      if (get().tables === resolved) set({ tables: previous });
      throw error;
    }
  },
}));
