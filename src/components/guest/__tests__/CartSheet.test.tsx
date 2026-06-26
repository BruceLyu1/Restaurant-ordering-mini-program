import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { CartSheet } from "../CartSheet";
import type { CartItem } from "../CartBar";

const cartItems: CartItem[] = [
  { category: "Food", description: "", id: "soup", name: "Soup", price: 40, quantity: 2, soldOut: false },
];

function renderWithLanguage(ui: React.ReactElement) {
  window.localStorage.setItem("harbour-language", "en");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("CartSheet", () => {
  it("renders cart lines, table hint, and total", () => {
    renderWithLanguage(<CartSheet cartItems={cartItems} onClose={vi.fn()} onSubmit={vi.fn()} tableNumber="05" total={80} updateItem={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Cart" })).toBeTruthy();
    expect(screen.getByText("Table 05 · Please confirm item quantities")).toBeTruthy();
    expect(screen.getByText("Soup")).toBeTruthy();
    expect(screen.getByText("HK$ 80")).toBeTruthy();
  });

  it("calls close, submit, and update callbacks", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const updateItem = vi.fn();
    renderWithLanguage(<CartSheet cartItems={cartItems} onClose={onClose} onSubmit={onSubmit} tableNumber="05" total={80} updateItem={updateItem} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));
    fireEvent.click(screen.getAllByRole("button")[2]);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(updateItem).toHaveBeenCalledWith("soup", 1);
  });
});
