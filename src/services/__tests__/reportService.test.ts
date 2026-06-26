import { describe, expect, it } from "vitest";
import { getRevenueSummary, getSalesRanking } from "../reportService";
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
});
