import { create } from "zustand";
import type { TableInfo } from "../types";
import { loadTables, loadTablesAsync } from "../services/tableService";

interface TableStore {
  load: () => Promise<void>;
  tables: TableInfo[];
}

export const useTableStore = create<TableStore>((set) => ({
  tables: loadTables(),

  load: async () => {
    set({ tables: loadTables() });
    set({ tables: await loadTablesAsync() });
  },
}));
