import { describe, expect, it } from "vitest";
import { buildRevenueReportCsv } from "../reportCsv";
import type { RevenueReport } from "../../types";

const report: RevenueReport = {
  dishSales: [{ id: "special", name: "Chef, \"Special\"", quantity: 2, revenue: 88 }],
  paymentSales: [{ method: "cash", orderCount: 1, revenue: 88 }],
  staffSales: [{ name: "Lee, May", orderCount: 1, revenue: 88, staffId: 2 }],
  summary: {
    averageOrderValue: 88,
    itemCount: 2,
    orderCount: 1,
    reversalCount: 3,
    revenue: 88,
  },
};

const labels = {
  columns: { amount: "Amount", count: "Count", item: "Item", section: "Section" },
  metrics: {
    averageOrderValue: "Average order",
    dateRange: "Date range",
    itemCount: "Items sold",
    orderCount: "Settled orders",
    revenue: "Revenue",
    reversalCount: "Settlement reversals",
  },
  sections: {
    dishes: "Dish sales",
    payment: "Payment methods",
    reversals: "Settlement reversals",
    staff: "Staff settlements",
    summary: "Settlement summary",
  },
};

describe("reportCsv", () => {
  it("builds a BOM-prefixed complete settlement report with safely escaped cells", () => {
    const csv = buildRevenueReportCsv({
      endDate: "2026-07-16",
      labels,
      paymentMethodLabel: () => "Cash",
      report,
      startDate: "2026-07-14",
    });

    expect(csv.startsWith("\uFEFFSection,Item,Count,Amount\r\n")).toBe(true);
    expect(csv).toContain("Settlement summary,Date range,2026-07-14 - 2026-07-16,");
    expect(csv).toContain("Payment methods,Cash,1,88.00");
    expect(csv).toContain('Staff settlements,"Lee, May",1,88.00');
    expect(csv).toContain('Dish sales,"Chef, ""Special""",2,88.00');
    expect(csv).toContain("Settlement reversals,Settlement reversals,3,");
  });
});