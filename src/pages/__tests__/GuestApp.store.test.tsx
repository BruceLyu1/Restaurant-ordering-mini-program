import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuestApp } from "../GuestApp";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useMenuStore } from "../../stores/menuStore";
import { useOrderStore } from "../../stores/orderStore";
import { useSettingsStore } from "../../stores/settingsStore";

describe("GuestApp store integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("harbour-language", "zh-Hant");
    useMenuStore.setState({
      items: [{
        category: "Rice",
        deleted: false,
        description: "Char siu and rice",
        id: "store-rice",
        imageUrl: "/dish-photos/store-rice.jpg",
        mealPeriods: ["lunch"],
        name: "Store Rice",
        price: 68,
        soldOut: false,
      }],
    });
    useOrderStore.setState({ orders: [] });
    useSettingsStore.setState({
      printer: { autoPrint: false, copies: "1", printer: "Kitchen", sound: true },
      restaurant: {
        address: "",
        language: "zh-Hant",
        mealPeriods: [],
        name: "Store Brand",
        phone: "",
        pin: "000000",
      },
    });
  });

  it("renders restaurant and menu data from stores", () => {
    render(
      <LanguageProvider>
        <GuestApp activeMealPeriod={{ id: "lunch", name: "Lunch", start: "11:00", end: "17:00" }} setView={vi.fn()} tableNumber="12" />
      </LanguageProvider>,
    );

    expect(screen.getByText("Store Brand")).toBeTruthy();
    expect(screen.getByText("Store Rice")).toBeTruthy();
  });
});
