import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { PopularDishes } from "../PopularDishes";
import type { MenuItem, Order } from "../../../types";

const menuItems: MenuItem[] = [
  { category: "Food", description: "", id: "soup", name: "Soup", price: 40, soldOut: false },
  { category: "Drink", description: "", id: "tea", name: "Tea", price: 10, soldOut: false },
];

function renderWithLanguage(ui: React.ReactElement) {
  window.localStorage.setItem("harbour-language", "en");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("PopularDishes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 24, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ranks today's dishes and opens the full report", () => {
    const onOpenReports = vi.fn();
    const orders: Order[] = [
      { createdAt: new Date(2026, 5, 24, 10).toISOString(), id: "HO-1", items: [{ id: "tea", quantity: 3 }, { id: "soup", quantity: 1 }], sequence: 1, status: "pending", table: "01" },
    ];
    renderWithLanguage(<PopularDishes menuItems={menuItems} onOpenReports={onOpenReports} orders={orders} />);

    expect(screen.getByText("Tea")).toBeTruthy();
    expect(screen.getByText("3 sold")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "View full report" }));
    expect(onOpenReports).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state when there are no sales today", () => {
    renderWithLanguage(<PopularDishes menuItems={menuItems} onOpenReports={vi.fn()} orders={[]} />);
    expect(screen.getByText("No sales yet")).toBeTruthy();
  });
});
