import { describe, expect, it, vi } from "vitest";
import {
  getLocalRevenueReport,
  getRevenueSummary,
  getSalesRanking,
  loadSupabaseRevenueReport,
} from "../reportService";
import type { MenuItem, Order } from "../../types";

const menuItems: MenuItem[] = [
  { category: "Food", description: "", id: "soup", name: "Soup", price: 40, soldOut: false },
  { category: "Food", description: "", id: "tea", name: "Tea", price: 10, soldOut: false },
  { category: "Food", description: "", id: "unused", name: "Unused", price: 99, soldOut: false },
];

const orders: Order[] = [
  {
    createdAt: new Date(2026, 5, 24, 10).toISOString(),
    id: "HO-1",
    items: [{ id: "tea", quantity: 3, unitPrice: 12 }, { id: "soup", quantity: 1, unitPrice: 40 }],
    sequence: 1,
    settledAt: new Date(2026, 5, 24, 10, 30).toISOString(),
    settledByName: "Alex",
    status: "settled",
    table: "01",
  },
  {
    createdAt: new Date(2026, 5, 24, 11).toISOString(),
    id: "HO-2",
    items: [{ id: "soup", quantity: 2, unitPrice: 40 }],
    sequence: 2,
    status: "pending",
    table: "02",
  },
];

describe("reportService", () => {
  it("returns sales ranking by quantity and omits zero-sales dishes", () => {
    expect(getSalesRanking(orders, menuItems).map((item) => [item.id, item.quantity, item.revenue])).toEqual([
      ["soup", 3, 120],
      ["tea", 3, 36],
    ]);
  });

  it("returns empty ranking for empty orders", () => {
    expect(getSalesRanking([], menuItems)).toEqual([]);
  });

  it("returns a fixed-shape revenue summary", () => {
    expect(Object.keys(getRevenueSummary(orders, menuItems))).toEqual(["day", "week", "month", "year"]);
  });

  it("builds a local revenue report from settled orders in the settlement range", () => {
    const report = getLocalRevenueReport(orders, menuItems, {
      end: new Date(2026, 5, 25),
      start: new Date(2026, 5, 24),
    });

    expect(report.summary).toEqual({
      averageOrderValue: 76,
      itemCount: 4,
      orderCount: 1,
      revenue: 76,
    });
    expect(report.dishSales.map((item) => [item.id, item.quantity, item.revenue])).toEqual([
      ["tea", 3, 36],
      ["soup", 1, 40],
    ]);
    expect(report.staffSales).toEqual([
      { name: "Alex", orderCount: 1, revenue: 76, staffId: null },
    ]);
  });

  it("excludes settled orders outside the settlement range", () => {
    const report = getLocalRevenueReport(orders, menuItems, {
      end: new Date(2026, 5, 26),
      start: new Date(2026, 5, 25),
    });

    expect(report.summary.orderCount).toBe(0);
    expect(report.dishSales).toEqual([]);
    expect(report.staffSales).toEqual([]);
  });

  it("loads and maps the Supabase revenue report RPC", async () => {
    const rpc = async () => ({
      data: {
        dishSales: [{ id: "soup", name: "Soup", quantity: 2, revenue: 80 }],
        staffSales: [{ name: "Alex", orderCount: 1, revenue: 80, staffId: 7 }],
        summary: { averageOrderValue: 80, itemCount: 2, orderCount: 1, revenue: 80 },
      },
      error: null,
    });
    const client = { rpc: vi.fn(rpc) };
    const range = {
      end: new Date("2026-07-15T00:00:00.000Z"),
      start: new Date("2026-07-14T00:00:00.000Z"),
    };

    await expect(loadSupabaseRevenueReport(range, client)).resolves.toEqual({
      dishSales: [{ id: "soup", name: "Soup", quantity: 2, revenue: 80 }],
      staffSales: [{ name: "Alex", orderCount: 1, revenue: 80, staffId: 7 }],
      summary: { averageOrderValue: 80, itemCount: 2, orderCount: 1, revenue: 80 },
    });
    expect(client.rpc).toHaveBeenCalledWith("get_revenue_report", {
      range_end: "2026-07-15T00:00:00.000Z",
      range_start: "2026-07-14T00:00:00.000Z",
      target_restaurant_slug: "harbour-demo",
    });
  });

  it("rejects when the Supabase revenue report RPC fails", async () => {
    const client = {
      rpc: async () => ({ data: null, error: new Error("staff permission denied") }),
    };

    await expect(loadSupabaseRevenueReport({
      end: new Date("2026-07-15T00:00:00.000Z"),
      start: new Date("2026-07-14T00:00:00.000Z"),
    }, client)).rejects.toThrow("staff permission denied");
  });
});
