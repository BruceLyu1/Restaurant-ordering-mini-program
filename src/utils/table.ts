
import type { Order, TableInfo } from "../types";

export function getTableNumberFromUrl(): string {
  const rawTable = new URLSearchParams(window.location.search).get("table") || "12";
  const cleaned = rawTable.replace(/[^\dA-Za-z-]/g, "").slice(0, 8);
  return cleaned || "12";
}

export function getGuestBaseUrl(): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function normalizeTableNumber(value: string | number): string {
  const raw = String(value || "").trim();
  return /^\d+$/.test(raw) ? raw.padStart(2, "0") : raw;
}

export function getTablesWithOrderStatus(tables: TableInfo[], orders: Order[]): TableInfo[] {
  const occupiedTables = new Set(
    orders
      .filter((order) => order.status !== "settled")
      .map((order) => normalizeTableNumber(order.table)),
  );

  return tables.map((table) => ({
    ...table,
    status: occupiedTables.has(normalizeTableNumber(table.number)) ? ("occupied" as const) : ("available" as const),
  }));
}
