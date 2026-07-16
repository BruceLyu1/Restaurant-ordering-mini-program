import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { SettlementReversalDialog } from "../SettlementReversalDialog";
import type { MenuItem, Order } from "../../../types";

const menuItems: MenuItem[] = [{ category: "Food", description: "", id: "soup", name: "Soup", price: 40, soldOut: false }];
const order: Order = {
  createdAt: "2026-07-15T10:00:00.000Z",
  id: "HO-7",
  items: [{ id: "soup", quantity: 1, unitPrice: 40 }],
  paymentMethod: "cash",
  sequence: 7,
  settledAt: "2026-07-15T10:30:00.000Z",
  settledByName: "Cashier",
  status: "settled",
  table: "12",
};

function renderDialog(onConfirm = vi.fn()) {
  window.localStorage.setItem("harbour-language", "en");
  render(<LanguageProvider><SettlementReversalDialog isSubmitting={false} menuItems={menuItems} onCancel={vi.fn()} onConfirm={onConfirm} order={order} /></LanguageProvider>);
  return onConfirm;
}

describe("SettlementReversalDialog", () => {
  it("requires a reason before confirming the reversal", () => {
    const onConfirm = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Confirm reversal" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Please provide a reversal reason");
  });

  it("submits a concise reversal reason after confirmation", () => {
    const onConfirm = renderDialog();

    fireEvent.change(screen.getByLabelText("Reversal reason"), { target: { value: "Wrong payment method" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm reversal" }));

    expect(onConfirm).toHaveBeenCalledWith({ reason: "Wrong payment method" });
  });
});