import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApp } from "../AdminApp";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useMenuStore } from "../../stores/menuStore";
import { useOrderStore } from "../../stores/orderStore";
import { useSettingsStore } from "../../stores/settingsStore";

describe("AdminApp store integration", () => {
  beforeEach(() => {
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
        <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={new Date("2026-06-23T11:00:00")} setView={vi.fn()} />
      </LanguageProvider>,
    );

    expect(screen.getAllByText("Store Admin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });
});
