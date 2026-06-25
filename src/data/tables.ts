import type { TableInfo } from "../types";

export const seededTables: TableInfo[] = [
  ["01", "available"],
  ["02", "occupied"],
  ["03", "occupied"],
  ["04", "available"],
  ["05", "available"],
  ["06", "occupied"],
  ["07", "available"],
  ["08", "occupied"],
  ["09", "available"],
  ["10", "available"],
  ["11", "available"],
  ["12", "available"],
].map(([number, status]) => ({ number, seats: 4, status: status as TableInfo["status"] }));
