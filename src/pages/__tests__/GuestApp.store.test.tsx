import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuestApp } from "../GuestApp";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useMenuStore } from "../../stores/menuStore";
import { useOrderStore } from "../../stores/orderStore";
import { useSettingsStore } from "../../stores/settingsStore";
import type { MenuItem } from "../../types";

function createMenuItem(index: number, category: string): MenuItem {
  return {
    category,
    deleted: false,
    description: `Dish ${index} description`,
    id: `dish-${index}`,
    imageUrl: `/dish-photos/dish-${index}.jpg`,
    mealPeriods: ["lunch"],
    name: `Dish ${index}`,
    price: 20 + index,
    soldOut: false,
  };
}

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

  it("renders the full menu and all category tabs without crashing", () => {
    const categoryNames = ["飯類", "點心", "麵類", "小菜", "甜品", "飲品"];
    const items = Array.from({ length: 50 }, (_, index) => createMenuItem(index + 1, categoryNames[index % categoryNames.length]));
    useMenuStore.setState({ items });

    render(
      <LanguageProvider>
        <GuestApp activeMealPeriod={{ id: "lunch", name: "Lunch", start: "11:00", end: "17:00" }} setView={vi.fn()} tableNumber="12" />
      </LanguageProvider>,
    );

    expect(screen.getAllByRole("article")).toHaveLength(50);
    expect(screen.getByRole("button", { name: "推薦" })).toBeTruthy();
    categoryNames.forEach((category) => {
      expect(screen.getByRole("button", { name: category })).toBeTruthy();
    });
  });
});
