import React, { useEffect, useMemo, useState } from "react";
import { ViewToggle } from "./components/ui/ViewToggle";
import { AdminApp } from "./pages/AdminApp";
import { GuestApp } from "./pages/GuestApp";
import { getDataSourceMode } from "./services/dataSource";
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

function reportAsyncError(label: string, error: unknown): void {
  console.error(label, error);
}

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
    void loadMenu().catch((error) => reportAsyncError("Load menu failed", error));
    void loadSettings().catch((error) => reportAsyncError("Load settings failed", error));
    void loadTables().catch((error) => reportAsyncError("Load tables failed", error));
  }, [loadMenu, loadSettings, loadTables]);

  useEffect(() => {
    void loadOrders(menuItems).catch((error) => reportAsyncError("Load orders failed", error));
  }, [loadOrders, menuItems]);

  useEffect(() => {
    return subscribeToStorage("harbour-ordering-demo-orders", () => {
      void loadOrders(useMenuStore.getState().items).catch((error) => reportAsyncError("Reload orders failed", error));
    }, ORDER_CHANGE_EVENT);
  }, [loadOrders]);

  useEffect(() => {
    if (getDataSourceMode() !== "supabase") return undefined;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void import("./services/supabaseOrderService").then(({ subscribeSupabaseOrderChanges }) => {
      if (cancelled) return;
      cleanup = subscribeSupabaseOrderChanges(() => {
        void loadOrders(useMenuStore.getState().items).catch((error) => reportAsyncError("Realtime orders reload failed", error));
      });
    }).catch((error) => reportAsyncError("Load Supabase order subscription failed", error));

    return () => {
      cancelled = true;
      cleanup?.();
    };
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
      void loadSettings().catch((error) => reportAsyncError("Reload settings failed", error));
    }, SETTINGS_CHANGE_EVENT);
  }, [loadSettings]);

  useEffect(() => {
    return subscribeToStorage(PRINTER_STORAGE_KEY, () => {
      void loadSettings().catch((error) => reportAsyncError("Reload printer settings failed", error));
    }, PRINTER_CHANGE_EVENT);
  }, [loadSettings]);

  useEffect(() => {
    if (getDataSourceMode() !== "supabase") return undefined;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void import("./services/supabaseSettingsService").then(({
      subscribeSupabasePrinterSettingsChanges,
      subscribeSupabaseRestaurantSettingsChanges,
    }) => {
      if (cancelled) return;
      const cleanupPrinterSettings = subscribeSupabasePrinterSettingsChanges(() => {
        void loadSettings().catch((error) => reportAsyncError("Realtime printer settings reload failed", error));
      });
      const cleanupRestaurantSettings = subscribeSupabaseRestaurantSettingsChanges(() => {
        void loadSettings().catch((error) => reportAsyncError("Realtime restaurant settings reload failed", error));
      });
      cleanup = () => {
        cleanupPrinterSettings();
        cleanupRestaurantSettings();
      };
    }).catch((error) => reportAsyncError("Load Supabase printer settings subscription failed", error));

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [loadSettings]);

  useEffect(() => {
    return subscribeToStorage("harbour-admin-menu", () => {
      void loadMenu().catch((error) => reportAsyncError("Reload menu failed", error));
    }, MENU_CHANGE_EVENT);
  }, [loadMenu]);

  useEffect(() => {
    if (getDataSourceMode() !== "supabase") return undefined;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void import("./services/supabaseMenuService").then(({ subscribeSupabaseMenuChanges }) => {
      if (cancelled) return;
      cleanup = subscribeSupabaseMenuChanges(() => {
        void loadMenu().catch((error) => reportAsyncError("Realtime menu reload failed", error));
      });
    }).catch((error) => reportAsyncError("Load Supabase menu subscription failed", error));

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [loadMenu]);

  useEffect(() => {
    return subscribeToStorage("harbour-admin-staff", () => {
      void Promise.resolve(loadStaff()).catch((error) => reportAsyncError("Reload staff failed", error));
    }, STAFF_CHANGE_EVENT);
  }, [loadStaff]);

  useEffect(() => {
    return subscribeToStorage("harbour-admin-tables", () => {
      void loadTables().catch((error) => reportAsyncError("Reload tables failed", error));
    }, TABLE_CHANGE_EVENT);
  }, [loadTables]);

  useEffect(() => {
    if (getDataSourceMode() !== "supabase") return undefined;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void import("./services/supabaseTableService").then(({ subscribeSupabaseTableChanges }) => {
      if (cancelled) return;
      cleanup = subscribeSupabaseTableChanges(() => {
        void loadTables().catch((error) => reportAsyncError("Realtime tables reload failed", error));
      });
    }).catch((error) => reportAsyncError("Load Supabase table subscription failed", error));

    return () => {
      cancelled = true;
      cleanup?.();
    };
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
