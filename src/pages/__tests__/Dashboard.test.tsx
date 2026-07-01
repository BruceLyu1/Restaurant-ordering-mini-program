import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { Dashboard } from "../Dashboard";
import type { MenuItem, Order, TableInfo } from "../../types";

const menuItems: MenuItem[] = [
  { category: "Food", deleted: false, description: "", id: "soup", name: "Soup", price: 40, soldOut: false },
];
function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    createdAt: new Date().toISOString(),
    id: "HO-1",
    items: [{ id: "soup", quantity: 2, unitPrice: 40 }],
    sequence: 7,
    status: "pending",
    table: "05",
    ...overrides,
  };
}

const orders: Order[] = [createOrder()];
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

  it("excludes historical orders from today's revenue", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    renderWithLanguage(<Dashboard
      menuItems={menuItems}
      onNavigate={vi.fn()}
      orders={[
        createOrder({ id: "HO-1", sequence: 7 }),
        createOrder({
          createdAt: yesterday.toISOString(),
          id: "HO-2",
          items: [{ id: "soup", quantity: 1, unitPrice: 40 }],
          sequence: 8,
        }),
      ]}
      tables={tables}
    />);

    const revenueCard = screen.getByText("Today's revenue").closest(".metric-card");
    expect(revenueCard).toBeTruthy();
    expect(within(revenueCard as HTMLElement).getByText("HK$ 80")).toBeTruthy();
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
