import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { GuestOrderHistory } from "../GuestOrderHistory";
import type { MenuItem, Order } from "../../../types";

const menuItems: MenuItem[] = [
  { category: "Food", description: "", id: "soup", name: "Soup", price: 40, soldOut: false },
];
const orders: Order[] = [
  { createdAt: "2026-06-24T10:00:00.000Z", id: "HO-1", items: [{ id: "soup", notes: "No onion", quantity: 2, unitPrice: 40 }], sequence: 1, status: "printed", table: "05" },
];

function renderWithLanguage(ui: React.ReactElement) {
  window.localStorage.setItem("harbour-language", "en");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("GuestOrderHistory", () => {
  it("renders table orders and total", () => {
    renderWithLanguage(<GuestOrderHistory menuItems={menuItems} onClose={vi.fn()} orders={orders} tableNumber="05" />);

    expect(screen.getByRole("heading", { name: "Table orders" })).toBeTruthy();
    expect(screen.getByText("Printed")).toBeTruthy();
    expect(screen.getByText("Soup")).toBeTruthy();
    expect(screen.getByText("No onion")).toBeTruthy();
    expect(screen.getAllByText("HK$ 80").length).toBeGreaterThan(0);
  });

  it("renders empty state and closes", () => {
    const onClose = vi.fn();
    renderWithLanguage(<GuestOrderHistory menuItems={menuItems} onClose={onClose} orders={[]} tableNumber="05" />);

    expect(screen.getByText("No orders")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
