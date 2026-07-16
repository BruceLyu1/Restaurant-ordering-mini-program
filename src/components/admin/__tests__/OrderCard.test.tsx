import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { OrderCard } from "../OrderCard";
import type { MenuItem, Order } from "../../../types";

const menuItems: MenuItem[] = [
  { category: "Food", description: "", id: "soup", name: "Soup", price: 40, soldOut: false },
];

function makeOrder(status: Order["status"]): Order {
  return { createdAt: "2026-06-24T10:00:00.000Z", id: `HO-${status}`, items: [{ id: "soup", notes: "No onion", quantity: 2, unitPrice: 40 }], sequence: 7, status, table: "05" };
}

function renderWithLanguage(ui: React.ReactElement) {
  window.localStorage.setItem("harbour-language", "en");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("OrderCard", () => {
  it("renders order details and triggers print and settle actions", () => {
    const onPrint = vi.fn();
    const onSettle = vi.fn();
    renderWithLanguage(<OrderCard menuItems={menuItems} onPrint={onPrint} onSettle={onSettle} order={makeOrder("pending")} />);

    expect(screen.getByText("#7")).toBeTruthy();
    expect(screen.getByText("Table 05")).toBeTruthy();
    expect(screen.getByText("Pending")).toBeTruthy();
    expect(screen.getByText("No onion")).toBeTruthy();
    expect(screen.getByText("HK$ 80")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Print/ }));
    fireEvent.click(screen.getByRole("button", { name: /Settle/ }));
    expect(onPrint).toHaveBeenCalledWith("HO-pending");
    expect(onSettle).toHaveBeenCalledWith("HO-pending");
  });

  it("hides actions for settled orders", () => {
    renderWithLanguage(<OrderCard menuItems={menuItems} onPrint={vi.fn()} onSettle={vi.fn()} order={makeOrder("settled")} />);

    expect(screen.getByText("Settled")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Print|Settle/ })).toBeNull();
  });

  it("keeps print available but hides settlement when the role cannot settle", () => {
    renderWithLanguage(<OrderCard canSettle={false} menuItems={menuItems} onPrint={vi.fn()} onSettle={vi.fn()} order={makeOrder("printed")} />);

    expect(screen.getByRole("button", { name: /Reprint/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Settle/ })).toBeNull();
  });

  it("shows the reversal action and latest audit record only when a manager can access them", () => {
    const order = {
      ...makeOrder("settled"),
      paymentMethod: "cash" as const,
      settlementReversals: [{ reason: "Wrong payment method", restoredStatus: "printed" as const, reversedAt: "2026-06-24T10:35:00.000Z", reversedByName: "Manager" }],
    };
    const onReverseSettlement = vi.fn();
    renderWithLanguage(<OrderCard canReverseSettlement menuItems={menuItems} onPrint={vi.fn()} onReverseSettlement={onReverseSettlement} onSettle={vi.fn()} order={order} showSettlementReversal />);

    fireEvent.click(screen.getByRole("button", { name: /Reverse settlement/ }));
    expect(onReverseSettlement).toHaveBeenCalledWith("HO-settled");
    expect(screen.getByText(/Settlement reversed at.*2026-06-24/)).toBeTruthy();
  });

  it("shows settlement audit details for settled orders", () => {
    const order = {
      ...makeOrder("settled"),
      paymentMethod: "octopus" as const,
      settledAt: "2026-06-24T10:30:00.000Z",
      settledByName: "Alex",
      settlementNote: "Terminal 1",
    };
    renderWithLanguage(<OrderCard menuItems={menuItems} onPrint={vi.fn()} onSettle={vi.fn()} order={order} />);

    expect(screen.getByText("Settled by: Alex")).toBeTruthy();
    expect(screen.getByText(/Settled at:.*2026-06-24/)).toBeTruthy();
    expect(screen.getByText("Octopus")).toBeTruthy();
    expect(screen.getByText("Note: Terminal 1")).toBeTruthy();
  });
});
