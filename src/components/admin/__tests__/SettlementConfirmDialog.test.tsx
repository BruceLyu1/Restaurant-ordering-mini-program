import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { SettlementConfirmDialog } from "../SettlementConfirmDialog";
import type { MenuItem, Order } from "../../../types";

const menuItems: MenuItem[] = [{ category: "Food", description: "", id: "soup", name: "Soup", price: 40, soldOut: false }];
const order: Order = {
  createdAt: "2026-06-24T10:00:00.000Z",
  id: "HO-1001",
  items: [{ id: "soup", quantity: 2, unitPrice: 40 }],
  sequence: 1001,
  status: "printed",
  table: "05",
};

function renderDialog(onConfirm = vi.fn()) {
  window.localStorage.setItem("harbour-language", "en");
  render(
    <LanguageProvider>
      <SettlementConfirmDialog isSubmitting={false} menuItems={menuItems} onCancel={vi.fn()} onConfirm={onConfirm} operatorName="Alex" order={order} />
    </LanguageProvider>,
  );
  return onConfirm;
}

describe("SettlementConfirmDialog", () => {
  it("shows a payment method error when settlement is confirmed without a selection", () => {
    const onConfirm = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Confirm settlement" }));

    expect(screen.getByRole("alert").textContent).toBe("Please choose a payment method");
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Payment method"), { target: { value: "cash" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("submits the payment method and cashier note", () => {
    const onConfirm = renderDialog();

    fireEvent.change(screen.getByLabelText("Payment method"), { target: { value: "octopus" } });
    fireEvent.change(screen.getByLabelText("Cashier note"), { target: { value: "Terminal 1" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm settlement" }));

    expect(onConfirm).toHaveBeenCalledWith({ paymentMethod: "octopus", settlementNote: "Terminal 1" });
  });
});
