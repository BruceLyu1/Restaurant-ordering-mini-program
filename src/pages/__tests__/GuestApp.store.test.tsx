import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    vi.stubEnv("VITE_DATA_SOURCE", "local");
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
        <GuestApp activeMealPeriod={{ id: "lunch", name: "Lunch", start: "11:00", end: "17:00" }} tableNumber="12" />
      </LanguageProvider>,
    );

    expect(screen.getByText("Store Brand")).toBeTruthy();
    expect(screen.getByText("Store Rice")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "後台" })).toBeNull();
  });

  it("renders the full menu and all category tabs without crashing", () => {
    const categoryNames = ["飯類", "點心", "麵類", "小菜", "甜品", "飲品"];
    const items = Array.from({ length: 50 }, (_, index) => createMenuItem(index + 1, categoryNames[index % categoryNames.length]));
    useMenuStore.setState({ items });

    render(
      <LanguageProvider>
        <GuestApp activeMealPeriod={{ id: "lunch", name: "Lunch", start: "11:00", end: "17:00" }} tableNumber="12" />
      </LanguageProvider>,
    );

    expect(screen.getAllByRole("article")).toHaveLength(50);
    expect(screen.getByRole("button", { name: "推薦" })).toBeTruthy();
    categoryNames.forEach((category) => {
      expect(screen.getByRole("button", { name: category })).toBeTruthy();
    });
  });

  it("disables the cart submit button while an order is being placed", async () => {
    useOrderStore.setState({
      orders: [],
      placeOrder: vi.fn(() => new Promise(() => undefined)) as never,
    });

    render(
      <LanguageProvider>
        <GuestApp activeMealPeriod={{ id: "lunch", name: "Lunch", start: "11:00", end: "17:00" }} tableNumber="12" />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByLabelText("加入Store Rice"));
    fireEvent.click(screen.getByRole("button", { name: /確認下單/ }));
    fireEvent.click(screen.getAllByRole("button", { name: "確認下單" }).at(-1)!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "送出中" })).toHaveProperty("disabled", true);
    });
  });

  it("shows confirmation after an async order succeeds", async () => {
    useOrderStore.setState({
      orders: [],
      placeOrder: vi.fn(async () => ({
        createdAt: "2026-07-02T07:00:00.000Z",
        id: "HO-1001",
        items: [{ id: "store-rice", name: "Store Rice", quantity: 1, unitPrice: 68 }],
        sequence: 1001,
        status: "pending",
        table: "12",
      })) as never,
    });

    render(
      <LanguageProvider>
        <GuestApp activeMealPeriod={{ id: "lunch", name: "Lunch", start: "11:00", end: "17:00" }} tableNumber="12" />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByLabelText("加入Store Rice"));
    fireEvent.click(screen.getByRole("button", { name: /確認下單/ }));
    fireEvent.click(screen.getAllByRole("button", { name: "確認下單" }).at(-1)!);

    expect(await screen.findByText("落單成功")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /確認下單/ })).toBeNull();
  });

  it("shows a submit failure notice and keeps the cart when order creation rejects", async () => {
    window.localStorage.setItem("harbour-language", "en");
    useOrderStore.setState({
      orders: [],
      placeOrder: vi.fn(async () => {
        throw new Error("remote failed");
      }) as never,
    });

    render(
      <LanguageProvider>
        <GuestApp activeMealPeriod={{ id: "lunch", name: "Lunch", start: "11:00", end: "17:00" }} tableNumber="12" />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByLabelText("Add Store Rice"));
    fireEvent.click(screen.getByRole("button", { name: /Place order/ }));
    fireEvent.click(screen.getAllByRole("button", { name: "Place order" }).at(-1)!);

    expect(await screen.findByText("Order submission failed, please try again")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Place order/ }).length).toBeGreaterThan(0);
  });

  it("closes the open table order sheet when all table orders are settled", async () => {
    window.localStorage.setItem("harbour-language", "en");
    useOrderStore.setState({
      orders: [{
        createdAt: "2026-07-02T07:00:00.000Z",
        id: "HO-1001",
        items: [{ id: "store-rice", quantity: 1, unitPrice: 68 }],
        sequence: 1001,
        status: "printed",
        table: "12",
      }],
    });

    render(
      <LanguageProvider>
        <GuestApp activeMealPeriod={{ id: "lunch", name: "Lunch", start: "11:00", end: "17:00" }} tableNumber="12" />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Order details/ }));
    expect(screen.getByRole("dialog", { name: "Table order details" })).toBeTruthy();

    useOrderStore.setState({ orders: [] });

    expect(await screen.findByText("This table order has been settled. You can continue ordering.")).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Table order details" })).toBeNull();
  });
});
