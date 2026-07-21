import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useAuthStore } from "../../stores/authStore";
import { useMenuStore } from "../../stores/menuStore";
import { useOrderStore } from "../../stores/orderStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useTableStore } from "../../stores/tableStore";
import { AdminApp } from "../AdminApp";

function renderAdmin(now: Date = new Date("2026-07-07T10:00:00")) {
  window.localStorage.setItem("harbour-language", "en");
  return render(
    <LanguageProvider>
      <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={now} />
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

  it("shows settled order history to cashiers but hides it from floor staff", () => {
    useOrderStore.setState({
      orders: [{ createdAt: "2026-07-07T10:00:00.000Z", id: "HO-3002", items: [], sequence: 3002, settledAt: "2026-07-07T10:20:00.000Z", status: "settled", table: "12" }],
    });
    useAuthStore.setState({ staffProfile: { active: true, id: 2, name: "Casey", role: "cashier" }, status: "signed-in" });

    const { rerender } = renderAdmin();
    expect(screen.getByRole("button", { name: /^Settled/ })).toBeTruthy();

    act(() => {
      useAuthStore.setState({ staffProfile: { active: true, id: 3, name: "Riley", role: "floor" }, status: "signed-in" });
    });
    rerender(
      <LanguageProvider>
        <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={new Date("2026-07-07T10:00:00")} />
      </LanguageProvider>,
    );

    expect(screen.queryByRole("button", { name: /^Settled/ })).toBeNull();
  });
  it("lets cashiers settle orders but keeps settlement unavailable to floor staff", () => {
    useOrderStore.setState({
      orders: [{ createdAt: "2026-07-07T10:00:00.000Z", id: "HO-3001", items: [], sequence: 3001, status: "pending", table: "12" }],
    });
    useAuthStore.setState({ staffProfile: { active: true, id: 2, name: "Casey", role: "cashier" }, status: "signed-in" });

    const { rerender } = renderAdmin();
    expect(screen.getByRole("button", { name: "Settle" })).toBeTruthy();

    act(() => {
      useAuthStore.setState({ staffProfile: { active: true, id: 3, name: "Riley", role: "floor" }, status: "signed-in" });
    });
    rerender(
      <LanguageProvider>
        <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={new Date("2026-07-07T10:00:00")} />
      </LanguageProvider>,
    );

    expect(screen.getByRole("button", { name: /Print/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Settle" })).toBeNull();
  });


  it("only shows settlement reversal for managers on the Hong Kong settlement date", () => {
    useOrderStore.setState({
      orders: [
        { createdAt: "2026-07-07T08:00:00.000Z", id: "HO-3003", items: [], sequence: 3003, settledAt: "2026-07-07T09:00:00.000Z", status: "settled", table: "12" },
        { createdAt: "2026-07-06T08:00:00.000Z", id: "HO-3004", items: [], sequence: 3004, settledAt: "2026-07-06T15:59:00.000Z", status: "settled", table: "13" },
      ],
    });

    const { rerender } = renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: /^Settled/ }));
    expect(screen.getAllByRole("button", { name: "Reverse settlement" })).toHaveLength(1);

    act(() => {
      useAuthStore.setState({ staffProfile: { active: true, id: 2, name: "Casey", role: "cashier" }, status: "signed-in" });
    });
    rerender(
      <LanguageProvider>
        <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={new Date("2026-07-07T10:00:00")} />
      </LanguageProvider>,
    );
    expect(screen.queryByRole("button", { name: "Reverse settlement" })).toBeNull();

    act(() => {
      useAuthStore.setState({ staffProfile: { active: true, id: 3, name: "Riley", role: "floor" }, status: "signed-in" });
    });
    rerender(
      <LanguageProvider>
        <AdminApp activeMealPeriod={null} guestBaseUrl="http://127.0.0.1:5174/" now={new Date("2026-07-07T10:00:00")} />
      </LanguageProvider>,
    );
    expect(screen.queryByRole("button", { name: "Reverse settlement" })).toBeNull();
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
