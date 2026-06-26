import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPeriodRevenue } from "../revenue";
import type { MenuItem, Order } from "../../types";

const menuItems: MenuItem[] = [
  { category: "Food", description: "", id: "soup", name: "Soup", price: 40, soldOut: false },
  { category: "Food", description: "", id: "tea", name: "Tea", price: 10, soldOut: false },
];

function order(id: string, createdAt: Date, items: Order["items"]): Order {
  return { createdAt: createdAt.toISOString(), id, items, sequence: 1, status: "settled", table: "01" };
}

describe("revenue utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 24, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns zero revenue for empty orders", () => {
    expect(getPeriodRevenue([], menuItems)).toEqual({ day: 0, week: 0, month: 0, year: 0 });
  });

  it("groups revenue by day, week, month, and year", () => {
    const orders = [
      order("today", new Date(2026, 5, 24, 10), [{ id: "soup", quantity: 2, unitPrice: 40 }]),
      order("yesterday", new Date(2026, 5, 23, 10), [{ id: "tea", quantity: 1, unitPrice: 10 }]),
      order("last-month", new Date(2026, 4, 20, 10), [{ id: "soup", quantity: 1, unitPrice: 40 }]),
    ];

    expect(getPeriodRevenue(orders, menuItems)).toEqual({ day: 80, week: 90, month: 90, year: 130 });
  });
});
