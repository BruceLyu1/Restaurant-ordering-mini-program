import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { Dashboard } from "../Dashboard";
import type { MenuItem, Order, TableInfo } from "../../types";

const menuItems: MenuItem[] = [
  { category: "Food", deleted: false, description: "", id: "soup", name: "Soup", price: 40, soldOut: false },
];
const orders: Order[] = [
  { createdAt: "2026-06-24T10:00:00.000Z", id: "HO-1", items: [{ id: "soup", quantity: 2, unitPrice: 40 }], sequence: 7, status: "pending", table: "05" },
];
const tables: TableInfo[] = [
  { number: "05", seats: 4, status: "occupied" },
  { number: "06", seats: 4, status: "available" },
];

function renderWithLanguage(ui: React.ReactElement) {
  window.localStorage.setItem("harbour-language", "en");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("Dashboard", () => {
  it("renders metrics, latest orders, and table status", () => {
    renderWithLanguage(<Dashboard menuItems={menuItems} onNavigate={vi.fn()} orders={orders} tables={tables} />);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy();
    expect(screen.getByText("Today's revenue")).toBeTruthy();
    expect(screen.getAllByText("HK$ 80").length).toBeGreaterThan(0);
    expect(screen.getByText((_, node) => node?.textContent === "#7 · 1 dishes")).toBeTruthy();
    expect(screen.getByText("Table status")).toBeTruthy();
  });

  it("navigates to order and table pages", () => {
    const onNavigate = vi.fn();
    renderWithLanguage(<Dashboard menuItems={menuItems} onNavigate={onNavigate} orders={orders} tables={tables} />);

    fireEvent.click(screen.getByRole("button", { name: "View all" }));
    fireEvent.click(screen.getByRole("button", { name: "Manage tables" }));
    expect(onNavigate).toHaveBeenNthCalledWith(1, "orders");
    expect(onNavigate).toHaveBeenNthCalledWith(2, "tables");
  });
});
