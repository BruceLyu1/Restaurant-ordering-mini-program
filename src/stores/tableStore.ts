import { create } from "zustand";
import type { TableInfo } from "../types";
import { loadTables } from "../services/tableService";

interface TableStore {
  load: () => void;
  tables: TableInfo[];
}

export const useTableStore = create<TableStore>((set) => ({
  tables: loadTables(),

  load: () => {
    set({ tables: loadTables() });
  },
}));
