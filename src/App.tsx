import React, { useEffect, useMemo, useState } from "react";
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
import { useAuthStore } from "./stores/authStore";
import { getGuestBaseUrl, getTableNumberFromUrl } from "./utils/table";
import { getInitialViewFromLocation } from "./utils/view";
import type { MealPeriod } from "./types";

function reportAsyncError(label: string, error: unknown): void {
  console.error(label, error);
}

function App() {
  const view = useMemo(() => getInitialViewFromLocation(window.location), []);
  const [tableNumber, setTableNumber] = useState<string>(getTableNumberFromUrl);
  const [now, setNow] = useState(() => new Date());
  const menuItems = useMenuStore((state) => state.items);
  const loadMenu = useMenuStore((state) => state.load);
  const loadOrders = useOrderStore((state) => state.load);
  const loadSettings = useSettingsStore((state) => state.load);
  const loadStaff = useStaffStore((state) => state.load);
  const loadTables = useTableStore((state) => state.load);
  const authStatus = useAuthStore((state) => state.status);
  const staffProfile = useAuthStore((state) => state.staffProfile);
  const subscribeAuth = useAuthStore((state) => state.subscribe);
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
    if (getDataSourceMode() !== "supabase") return undefined;
    return subscribeAuth();
  }, [subscribeAuth]);

  useEffect(() => {
    if (getDataSourceMode() === "supabase") {
      if (view === "admin") {
        if (authStatus !== "signed-in") return;
        void loadOrders(menuItems).catch((error) => reportAsyncError("Load orders failed", error));
        return;
      }
      void loadOrders(menuItems, { tableNumber }).catch((error) => reportAsyncError("Load table orders failed", error));
      return;
    }
    void loadOrders(menuItems).catch((error) => reportAsyncError("Load orders failed", error));
  }, [authStatus, loadOrders, menuItems, tableNumber, view]);

  useEffect(() => {
    if (getDataSourceMode() === "supabase") return () => undefined;
    return subscribeToStorage("harbour-ordering-demo-orders", () => {
      void loadOrders(useMenuStore.getState().items).catch((error) => reportAsyncError("Reload orders failed", error));
    }, ORDER_CHANGE_EVENT);
  }, [loadOrders]);

  useEffect(() => {
    if (getDataSourceMode() !== "supabase") return undefined;
    if (view === "admin" && authStatus !== "signed-in") return undefined;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void import("./services/supabaseOrderService").then(({ subscribeSupabaseOrderChanges }) => {
      if (cancelled) return;
      cleanup = subscribeSupabaseOrderChanges(() => {
        const latestMenuItems = useMenuStore.getState().items;
        const loadOptions = view === "guest" ? { tableNumber } : undefined;
        void loadOrders(latestMenuItems, loadOptions).catch((error) => reportAsyncError("Realtime orders reload failed", error));
      });
    }).catch((error) => reportAsyncError("Load Supabase order subscription failed", error));

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [authStatus, loadOrders, tableNumber, view]);

  useEffect(() => {
    if (getDataSourceMode() !== "supabase" || view !== "guest") return undefined;

    const intervalId = window.setInterval(() => {
      void loadOrders(useMenuStore.getState().items, { tableNumber })
        .catch((error) => reportAsyncError("Poll table orders failed", error));
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [loadOrders, tableNumber, view]);

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
    if (getDataSourceMode() === "supabase") return () => undefined;
    return subscribeToStorage("harbour-admin-settings", () => {
      void loadSettings().catch((error) => reportAsyncError("Reload settings failed", error));
    }, SETTINGS_CHANGE_EVENT);
  }, [loadSettings]);

  useEffect(() => {
    if (getDataSourceMode() === "supabase") return () => undefined;
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
      const cleanupRestaurantSettings = subscribeSupabaseRestaurantSettingsChanges(() => {
        void loadSettings().catch((error) => reportAsyncError("Realtime restaurant settings reload failed", error));
      });
      const cleanupPrinterSettings = authStatus === "signed-in"
        ? subscribeSupabasePrinterSettingsChanges(() => {
          void loadSettings().catch((error) => reportAsyncError("Realtime printer settings reload failed", error));
        })
        : () => undefined;
      cleanup = () => {
        cleanupPrinterSettings();
        cleanupRestaurantSettings();
      };
    }).catch((error) => reportAsyncError("Load Supabase printer settings subscription failed", error));

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [authStatus, loadSettings]);

  useEffect(() => {
    if (getDataSourceMode() === "supabase") return () => undefined;
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
    if (getDataSourceMode() === "supabase") {
      if (authStatus === "signed-in" && staffProfile?.role === "manager") {
        void loadStaff().catch((error) => reportAsyncError("Load staff failed", error));
      }
      return () => undefined;
    }
    return subscribeToStorage("harbour-admin-staff", () => {
      void Promise.resolve(loadStaff()).catch((error) => reportAsyncError("Reload staff failed", error));
    }, STAFF_CHANGE_EVENT);
  }, [authStatus, loadStaff, staffProfile?.role]);

  useEffect(() => {
    if (getDataSourceMode() !== "supabase") return undefined;
    if (authStatus !== "signed-in" || staffProfile?.role !== "manager") return undefined;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void import("./services/supabaseStaffService").then(({ subscribeSupabaseStaffChanges }) => {
      if (cancelled) return;
      cleanup = subscribeSupabaseStaffChanges(() => {
        void loadStaff().catch((error) => reportAsyncError("Realtime staff reload failed", error));
      });
    }).catch((error) => reportAsyncError("Load Supabase staff subscription failed", error));

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [authStatus, loadStaff, staffProfile?.role]);

  useEffect(() => {
    if (getDataSourceMode() === "supabase") return () => undefined;
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
      {view === "guest" ? (
        <GuestApp
          activeMealPeriod={activeMealPeriod}
          tableNumber={tableNumber}
        />
      ) : (
        <AdminApp
          activeMealPeriod={activeMealPeriod}
          guestBaseUrl={guestBaseUrl}
          now={now}
        />
      )}
    </>
  );
}

export default App;
