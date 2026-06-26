import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { CartBar } from "../CartBar";
import type { CartItem } from "../CartBar";

const cartItems: CartItem[] = [
  { category: "Food", description: "", id: "soup", name: "Soup", price: 40, quantity: 1, soldOut: false },
  { category: "Drink", description: "", id: "tea", name: "Tea", price: 10, quantity: 2, soldOut: false },
];

function renderWithLanguage(ui: React.ReactElement) {
  window.localStorage.setItem("harbour-language", "en");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("CartBar", () => {
  it("hides when the cart is empty", () => {
    const { container } = renderWithLanguage(<CartBar cartItems={[]} itemCount={0} onOpen={vi.fn()} total={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows item count, readable item summary, total, and opens the cart", () => {
    const onOpen = vi.fn();
    renderWithLanguage(<CartBar cartItems={cartItems} itemCount={3} onOpen={onOpen} total={60} />);

    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("Soup x1、Tea x2")).toBeTruthy();
    expect(screen.getByText("HK$ 60")).toBeTruthy();
    expect(screen.getByText("Place order")).toBeTruthy();
    fireEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
