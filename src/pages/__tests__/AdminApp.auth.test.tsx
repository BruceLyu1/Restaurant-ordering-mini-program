import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useAuthStore } from "../../stores/authStore";
import { useMenuStore } from "../../stores/menuStore";
import { useOrderStore } from "../../stores/orderStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useTableStore } from "../../stores/tableStore";
import { AdminApp } from "../AdminApp";

function renderAdmin() {
  window.localStorage.setItem("harbour-language", "en");
  return render(
    <LanguageProvider>
      <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={new Date("2026-07-07T10:00:00")} />
    </LanguageProvider>,
  );
}

describe("AdminApp auth permissions", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    window.localStorage.clear();
    useAuthStore.setState({
      session: null,
      staffProfile: { active: true, id: 1, name: "Alex", role: "manager" },
      status: "signed-in",
      signOut: vi.fn(async () => undefined),
    });
    useMenuStore.setState({ items: [] });
    useOrderStore.setState({ orders: [] });
    useTableStore.setState({ tables: [] });
    useSettingsStore.setState({
      printer: { autoPrint: false, copies: "1", printer: "Kitchen", sound: true },
      restaurant: {
        address: "",
        language: "English",
        mealPeriods: [],
        name: "Store Admin",
        phone: "",
        pin: "000000",
      },
    });
  });

  it("shows all navigation for managers", () => {
    renderAdmin();

    expect(screen.getByRole("button", { name: /Menu/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Tables/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Staff/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Settings/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Back to guest/ })).toBeNull();
  });

  it("shows signed-in staff details and signs out in supabase mode", () => {
    const signOut = vi.fn(async () => undefined);
    useAuthStore.setState({ signOut } as Partial<ReturnType<typeof useAuthStore.getState>>);

    renderAdmin();

    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText("Manager")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Sign out/ }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("does not show the supabase sign-out control in local mode", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "local");

    renderAdmin();

    expect(screen.queryByRole("button", { name: /Sign out/ })).toBeNull();
  });

  it("limits cashier and floor roles to orders and dashboard", () => {
    useAuthStore.setState({
      staffProfile: { active: true, id: 2, name: "Casey", role: "cashier" },
      status: "signed-in",
    });

    renderAdmin();

    expect(screen.getByRole("button", { name: /Orders/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Dashboard/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Menu/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Staff/ })).toBeNull();
  });

  it("lets restricted roles open the dashboard but not restricted sections", () => {
    useAuthStore.setState({
      staffProfile: { active: true, id: 2, name: "Casey", role: "floor" },
      status: "signed-in",
    });

    renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: /Dashboard/ }));

    expect(screen.queryByText("Menu management")).toBeNull();
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy();
  });
});
