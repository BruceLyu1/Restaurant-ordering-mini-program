import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApp } from "../AdminApp";
import { seedOrders } from "../../data/orders";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useMenuStore } from "../../stores/menuStore";
import { useOrderStore } from "../../stores/orderStore";
import { useSettingsStore } from "../../stores/settingsStore";

describe("AdminApp store integration", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DATA_SOURCE", "local");
    window.localStorage.clear();
    window.sessionStorage.setItem("harbour-admin-unlocked", "1");
    window.localStorage.setItem("harbour-language", "zh-Hant");
    useMenuStore.setState({ items: [] });
    useOrderStore.setState({
      orders: [{
        createdAt: "2026-06-23T11:00:00.000Z",
        id: "HO-2001",
        items: [],
        sequence: 2001,
        status: "pending",
        table: "12",
      }],
    });
    useSettingsStore.setState({
      printer: { autoPrint: false, copies: "1", printer: "Kitchen", sound: true },
      restaurant: {
        address: "",
        language: "zh-Hant",
        mealPeriods: [],
        name: "Store Admin",
        phone: "",
        pin: "000000",
      },
    });
  });

  it("renders admin brand and pending order count from stores", () => {
    render(
      <LanguageProvider>
        <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={new Date("2026-06-23T11:00:00")} />
      </LanguageProvider>,
    );

    expect(screen.getAllByText("Store Admin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "返回顧客端" })).toBeNull();
  });

  it("asks for confirmation before resetting demo orders", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <LanguageProvider>
        <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={new Date("2026-06-23T11:00:00")} />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "重設演示" }));

    expect(confirmSpy).toHaveBeenCalledWith("重設演示資料？目前瀏覽器中的訂單會還原為預設資料。");
    expect(useOrderStore.getState().orders).toHaveLength(1);

    confirmSpy.mockRestore();
  });

  it("resets demo orders after confirmation", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <LanguageProvider>
        <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={new Date("2026-06-23T11:00:00")} />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "重設演示" }));

    expect(useOrderStore.getState().orders.map((order) => order.id)).toEqual(seedOrders.map((order) => order.id));

    confirmSpy.mockRestore();
  });

  it("sends print status changes through the order store", async () => {
    const updateStatus = vi.fn(async () => undefined);
    useOrderStore.setState({ updateStatus });

    render(
      <LanguageProvider>
        <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={new Date("2026-06-23T11:00:00")} />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "列印" }).at(-1)!);

    await vi.waitFor(() => {
      expect(updateStatus).toHaveBeenCalledWith("HO-2001", "printed", []);
    });
  });

  it("shows an error when print status update fails", async () => {
    window.localStorage.setItem("harbour-language", "en");
    const updateStatus = vi.fn(async () => {
      throw new Error("remote failed");
    });
    useOrderStore.setState({ updateStatus });

    render(
      <LanguageProvider>
        <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={new Date("2026-06-23T11:00:00")} />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Print/ }).at(-1)!);

    expect(await screen.findByText("Print failed, please check printer")).toBeTruthy();
  });

  it("shows a load error instead of treating a failed order query as an empty queue", () => {
    window.localStorage.setItem("harbour-language", "en");
    useOrderStore.setState({ loadError: "order-load-failed", orders: [] });

    render(
      <LanguageProvider>
        <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={new Date("2026-06-23T11:00:00")} />
      </LanguageProvider>,
    );

    expect(screen.getByText("Orders failed to load. Please refresh and try again.")).toBeTruthy();
  });

  it("confirms settlement with a payment method before updating the order", async () => {
    window.localStorage.setItem("harbour-language", "en");
    const settle = vi.fn(async () => undefined);
    useOrderStore.setState({ settle });

    render(
      <LanguageProvider>
        <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={new Date("2026-06-23T11:00:00")} />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settle" }));

    expect(screen.getByRole("dialog", { name: "Confirm settlement" })).toBeTruthy();
    expect(settle).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Payment method"), { target: { value: "cash" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm settlement" }));

    await vi.waitFor(() => {
      expect(settle).toHaveBeenCalledWith("HO-2001", {
        operatorName: "Local admin",
        paymentMethod: "cash",
        settlementNote: "",
      }, []);
    });
  });

  it("shows an error when settlement fails", async () => {
    window.localStorage.setItem("harbour-language", "en");
    const settle = vi.fn(async () => {
      throw new Error("remote failed");
    });
    useOrderStore.setState({ settle });

    render(
      <LanguageProvider>
        <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={new Date("2026-06-23T11:00:00")} />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Settle/ }).at(-1)!);
    fireEvent.change(screen.getByLabelText("Payment method"), { target: { value: "cash" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm settlement" }));

    expect(await screen.findByText("Settlement failed, please retry")).toBeTruthy();
  });
});
