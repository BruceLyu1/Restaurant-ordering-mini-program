import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { Reports } from "../Reports";
import type { MenuItem, Order } from "../../types";

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
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 24, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders today's settled revenue, dish sales, and staff settlement summary", async () => {
    const orders: Order[] = [
      {
        createdAt: new Date(2026, 5, 24, 10).toISOString(),
        id: "HO-1",
        items: [{ id: "soup", quantity: 2, unitPrice: 40 }],
        sequence: 1,
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
    expect(screen.getByText("No staff settlements in this date range.")).toBeTruthy();
  });
});
