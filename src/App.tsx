import React, { useEffect, useMemo, useState } from "react";
import { ViewToggle } from "./components/ui/ViewToggle";
import { AdminApp } from "./pages/AdminApp";
import { GuestApp } from "./pages/GuestApp";
import { MENU_CHANGE_EVENT } from "./services/menuService";
import { ORDER_CHANGE_EVENT } from "./services/orderService";
import {
  getCurrentMealPeriod,
  PRINTER_CHANGE_EVENT,
  PRINTER_STORAGE_KEY,
  SETTINGS_CHANGE_EVENT,
} from "./services/settingsService";
import { STAFF_CHANGE_EVENT } from "./services/staffService";
import { subscribeToStorage } from "./services/storage";
import { TABLE_CHANGE_EVENT } from "./services/tableService";
import { useMenuStore } from "./stores/menuStore";
import { useOrderStore } from "./stores/orderStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useStaffStore } from "./stores/staffStore";
import { useTableStore } from "./stores/tableStore";
import { getGuestBaseUrl, getTableNumberFromUrl } from "./utils/table";
import type { MealPeriod } from "./types";

function App() {
  const [view, setView] = useState<"guest" | "admin">(
    new URLSearchParams(window.location.search).get("view") === "admin"
      ? "admin"
      : "guest",
  );
  const [tableNumber, setTableNumber] = useState<string>(getTableNumberFromUrl);
  const [now, setNow] = useState(() => new Date());
  const menuItems = useMenuStore((state) => state.items);
  const loadMenu = useMenuStore((state) => state.load);
  const loadOrders = useOrderStore((state) => state.load);
  const loadSettings = useSettingsStore((state) => state.load);
  const loadStaff = useStaffStore((state) => state.load);
  const loadTables = useTableStore((state) => state.load);
  const restaurantSettings = useSettingsStore((state) => state.restaurant);
  const guestBaseUrl = useMemo<string>(getGuestBaseUrl, []);
  const activeMealPeriod: MealPeriod | null = useMemo(
    () => getCurrentMealPeriod(restaurantSettings, now),
    [now, restaurantSettings],
  );

  useEffect(() => {
    void loadMenu();
    void loadSettings();
    void loadTables();
  }, [loadMenu, loadSettings, loadTables]);

  useEffect(() => {
    void loadOrders(menuItems);
  }, [loadOrders, menuItems]);

  useEffect(() => {
    return subscribeToStorage("harbour-ordering-demo-orders", () => {
      void loadOrders(useMenuStore.getState().items);
    }, ORDER_CHANGE_EVENT);
  }, [loadOrders]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    function syncTableNumber() {
      setTableNumber(getTableNumberFromUrl());
    }
    window.addEventListener("popstate", syncTableNumber);
    return () => window.removeEventListener("popstate", syncTableNumber);
  }, []);

  useEffect(() => {
    return subscribeToStorage("harbour-admin-settings", () => {
      loadSettings();
    }, SETTINGS_CHANGE_EVENT);
  }, [loadSettings]);

  useEffect(() => {
    return subscribeToStorage(PRINTER_STORAGE_KEY, () => {
      loadSettings();
    }, PRINTER_CHANGE_EVENT);
  }, [loadSettings]);

  useEffect(() => {
    return subscribeToStorage("harbour-admin-menu", () => {
      loadMenu();
    }, MENU_CHANGE_EVENT);
  }, [loadMenu]);

  useEffect(() => {
    return subscribeToStorage("harbour-admin-staff", () => {
      loadStaff();
    }, STAFF_CHANGE_EVENT);
  }, [loadStaff]);

  useEffect(() => {
    return subscribeToStorage("harbour-admin-tables", () => {
      loadTables();
    }, TABLE_CHANGE_EVENT);
  }, [loadTables]);

  return (
    <>
      <ViewToggle setView={setView} view={view} />
      {view === "guest" ? (
        <GuestApp
          activeMealPeriod={activeMealPeriod}
          setView={setView}
          tableNumber={tableNumber}
        />
      ) : (
        <AdminApp
          activeMealPeriod={activeMealPeriod}
          guestBaseUrl={guestBaseUrl}
          now={now}
          setView={setView}
        />
      )}
    </>
  );
}

export default App;
