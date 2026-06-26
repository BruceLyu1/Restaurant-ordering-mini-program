import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { ConfirmationCard } from "../ConfirmationCard";
import type { MenuItem, Order } from "../../../types";

const menuItems: MenuItem[] = [
  { category: "Food", description: "", id: "soup", name: "Soup", price: 40, soldOut: false },
];
const order: Order = {
  createdAt: "2026-06-24T10:00:00.000Z",
  id: "HO-1",
  items: [{ id: "soup", quantity: 2, unitPrice: 40 }],
  sequence: 1,
  status: "pending",
  table: "05",
};

function renderWithLanguage(ui: React.ReactElement) {
  window.localStorage.setItem("harbour-language", "en");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("ConfirmationCard", () => {
  it("shows order metadata and calls actions", () => {
    const onClose = vi.fn();
    const onViewOrderHistory = vi.fn();
    renderWithLanguage(<ConfirmationCard menuItems={menuItems} onClose={onClose} onViewOrderHistory={onViewOrderHistory} order={order} tableNumber="05" />);

    expect(screen.getByText("Order placed")).toBeTruthy();
    expect(screen.getByText("Order HO-1 was sent to the restaurant. The kitchen will prepare it in order.")).toBeTruthy();
    expect(screen.getByText("Table 05")).toBeTruthy();
    expect(screen.getByText("HK$ 80")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Add more items" }));
    fireEvent.click(screen.getByRole("button", { name: "View table orders" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onViewOrderHistory).toHaveBeenCalledTimes(1);
  });
});
