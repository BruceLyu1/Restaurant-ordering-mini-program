import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { Reports } from "../Reports";
import type { MenuItem, Order } from "../../types";

const menuItems: MenuItem[] = [
  { category: "Food", description: "", id: "soup", name: "Soup", price: 40, soldOut: false },
  { category: "Drink", description: "", id: "tea", name: "Tea", price: 10, soldOut: false },
];

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

  it("renders revenue metrics and ranked dish sales", () => {
    const orders: Order[] = [
      { createdAt: new Date(2026, 5, 24, 10).toISOString(), id: "HO-1", items: [{ id: "soup", quantity: 2, unitPrice: 40 }], sequence: 1, status: "settled", table: "01" },
    ];
    renderWithLanguage(<Reports menuItems={menuItems} orders={orders} />);

    expect(screen.getByRole("heading", { name: "Reports" })).toBeTruthy();
    expect(screen.getByText("Today's revenue")).toBeTruthy();
    expect(screen.getAllByText("HK$ 80").length).toBeGreaterThan(0);
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Soup")).toBeTruthy();
    expect(screen.queryByText("Tea")).toBeNull();
  });

  it("shows no ranking rows when there are no orders", () => {
    renderWithLanguage(<Reports menuItems={menuItems} orders={[]} />);
    expect(screen.getAllByRole("row")).toHaveLength(1);
  });
});
