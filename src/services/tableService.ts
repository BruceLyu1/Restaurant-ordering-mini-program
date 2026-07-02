import { seededTables } from "../data/tables";
import type { TableInfo } from "../types";
import { getDataSourceMode } from "./dataSource";
import { readStorage, writeStorage } from "./storage";

export const TABLE_STORAGE_KEY = "harbour-admin-tables";
export const TABLE_CHANGE_EVENT = "harbour-tables-change";

export function loadTables(): TableInfo[] {
  const tables = readStorage<TableInfo[]>(TABLE_STORAGE_KEY, seededTables);
  return Array.isArray(tables) ? tables : seededTables;
}

export async function loadTablesAsync(): Promise<TableInfo[]> {
  if (getDataSourceMode() !== "supabase") return loadTables();

  try {
    const { loadSupabaseTables } = await import("./supabaseReadService");
    return await loadSupabaseTables();
  } catch {
    return loadTables();
  }
}

export function saveTables(tables: TableInfo[]): void {
  writeStorage(TABLE_STORAGE_KEY, tables, TABLE_CHANGE_EVENT);
}
