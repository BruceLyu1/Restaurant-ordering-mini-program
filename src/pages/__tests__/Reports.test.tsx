import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { downloadRevenueReportCsv } from "../../utils/reportCsv";
import { Reports } from "../Reports";
import type { MenuItem, Order } from "../../types";

vi.mock("../../utils/reportCsv", async () => {
  const actual = await vi.importActual<typeof import("../../utils/reportCsv")>("../../utils/reportCsv");
  return { ...actual, downloadRevenueReportCsv: vi.fn() };
});

vi.mock("../../services/dataSource", () => ({
  getDataSourceMode: () => "local",
}));

const menuItems: MenuItem[] = [
  { category: "Food", description: "", id: "soup", name: "Soup", price: 40, soldOut: false },
  { category: "Drink", description: "", id: "tea", name: "Tea", price: 10, soldOut: false },
];

async function flushReportLoad(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

function renderWithLanguage(ui: React.ReactElement) {
  window.localStorage.setItem("harbour-language", "en");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("Reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 24, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders today's settled revenue, dish sales, staff settlement summary, and reversal count", async () => {
    const orders: Order[] = [
      {
        createdAt: new Date(2026, 5, 24, 10).toISOString(),
        id: "HO-1",
        items: [{ id: "soup", quantity: 2, unitPrice: 40 }],
        sequence: 1,
        paymentMethod: "cash",
        settledAt: new Date(2026, 5, 24, 10, 30).toISOString(),
        settledByName: "Alex",
        status: "settled",
        table: "01",
      },
      {
        createdAt: new Date(2026, 5, 24, 11).toISOString(),
        id: "HO-2",
        items: [{ id: "tea", quantity: 4, unitPrice: 10 }],
        sequence: 2,
        status: "pending",
        table: "02",
      },
    ];
    renderWithLanguage(<Reports menuItems={menuItems} orders={orders} />);
    await flushReportLoad();

    expect(screen.getByRole("heading", { name: "Reports" })).toBeTruthy();
    expect(screen.getAllByText("Revenue").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HK$ 80").length).toBeGreaterThan(0);
    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText("Cash")).toBeTruthy();
    expect(screen.getByText("0 reversals")).toBeTruthy();
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Soup")).toBeTruthy();
    expect(screen.queryByText("Tea")).toBeNull();
  });

  it("loads a custom inclusive end date range from the date inputs", async () => {
    const orders: Order[] = [
      {
        createdAt: new Date(2026, 5, 20, 10).toISOString(),
        id: "HO-3",
        items: [{ id: "tea", quantity: 1, unitPrice: 10 }],
        sequence: 3,
        settledAt: new Date(2026, 5, 20, 12).toISOString(),
        settledByName: "Bea",
        status: "settled",
        table: "03",
      },
    ];
    renderWithLanguage(<Reports menuItems={menuItems} orders={orders} />);
    await flushReportLoad();

    expect(screen.getByText("No settled dish sales in this date range.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-06-20" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-06-20" } });
    await flushReportLoad();

    expect(screen.getByText("Tea")).toBeTruthy();
    expect(screen.getByText("Bea")).toBeTruthy();
    expect(screen.getAllByText("HK$ 10").length).toBeGreaterThan(0);
  });

  it("shows empty report states when there are no settled orders", async () => {
    renderWithLanguage(<Reports menuItems={menuItems} orders={[]} />);
    await flushReportLoad();

    expect(screen.getByText("No settled dish sales in this date range.")).toBeTruthy();
    expect(screen.getByText("No settled payment method records in this date range.")).toBeTruthy();
    expect(screen.getByText("No staff settlements in this date range.")).toBeTruthy();
  });

  it("shows reversal totals and exports only the successfully loaded range", async () => {
    const orders: Order[] = [{
      createdAt: new Date(2026, 5, 24, 10).toISOString(),
      id: "HO-4",
      items: [{ id: "soup", quantity: 1, unitPrice: 40 }],
      sequence: 4,
      settlementReversals: [{ reason: "Wrong method", restoredStatus: "printed", reversedAt: new Date(2026, 5, 24, 11).toISOString(), reversedByName: "Alex" }],
      status: "printed",
      table: "04",
    }];
    renderWithLanguage(<Reports menuItems={menuItems} orders={orders} />);
    await flushReportLoad();

    expect(screen.getByText("1 reversals")).toBeTruthy();
    const exportButton = screen.getByRole("button", { name: "Export CSV" });
    expect(exportButton).not.toHaveProperty("disabled", true);
    fireEvent.click(exportButton);

    expect(downloadRevenueReportCsv).toHaveBeenCalledWith(
      "harbour-settlement-2026-06-24-to-2026-06-24.csv",
      expect.stringContaining("Settlement reversals,Settlement reversals,1,"),
    );
  });

  it("keeps export disabled when the selected date range is invalid", async () => {
    renderWithLanguage(<Reports menuItems={menuItems} orders={[]} />);
    await flushReportLoad();

    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-06-25" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-06-24" } });

    expect(screen.getByRole("button", { name: "Export CSV" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("alert").textContent).toContain("Choose a valid start and end date.");
  });
});