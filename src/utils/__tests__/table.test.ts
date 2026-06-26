import { beforeEach, describe, expect, it } from "vitest";
import { getGuestBaseUrl, getTableNumberFromUrl, getTablesWithOrderStatus } from "../table";
import type { Order, TableInfo } from "../../types";

describe("table utils", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/?view=guest&table=05#top");
  });

  it("reads and sanitizes table numbers from the URL", () => {
    expect(getTableNumberFromUrl()).toBe("05");
    window.history.pushState({}, "", "/?view=guest&table=%3Cscript%3E");
    expect(getTableNumberFromUrl()).toBe("script");
  });

  it("falls back to table 12 when the URL has no table", () => {
    window.history.pushState({}, "", "/?view=guest");
    expect(getTableNumberFromUrl()).toBe("12");
  });

  it("returns the guest base URL without query or hash", () => {
    expect(getGuestBaseUrl()).toBe("http://localhost:3000/");
  });

  it("marks tables occupied only when they have unsettled orders", () => {
    const tables: TableInfo[] = [{ number: "01", seats: 4 }, { number: "02", seats: 4 }];
    const orders: Order[] = [
      { createdAt: "", id: "active", items: [], sequence: 1, status: "printed", table: "1" },
      { createdAt: "", id: "done", items: [], sequence: 2, status: "settled", table: "02" },
    ];

    expect(getTablesWithOrderStatus(tables, orders).map((table) => table.status)).toEqual(["occupied", "available"]);
  });
});
