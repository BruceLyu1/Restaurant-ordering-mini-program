import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_RESTAURANT_SETTINGS,
  getCurrentMealPeriod,
  isItemAvailableForMealPeriod,
  loadRestaurantSettings,
  PRINTER_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  savePrinterSettings,
  savePrinterSettingsAsync,
  saveRestaurantSettingsAsync,
} from "../settingsService";

import { saveSupabasePrinterSettings, saveSupabaseRestaurantSettings } from "../supabaseSettingsService";

vi.mock("../supabaseSettingsService", () => ({
  saveSupabasePrinterSettings: vi.fn(async () => undefined),
  saveSupabaseRestaurantSettings: vi.fn(async () => undefined),
}));

const settings = {
  mealPeriods: [
    { id: "breakfast", name: "早餐", start: "07:00", end: "11:00" },
    { id: "lunch", name: "午市", start: "11:00", end: "17:00" },
  ],
};

describe("settingsService", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_DATA_SOURCE", "local");
  });

  it("finds the active meal period at the start boundary", () => {
    expect(getCurrentMealPeriod(settings, new Date("2026-06-23T11:00:00"))?.id).toBe("lunch");
  });

  it("checks whether a dish is available in the active meal period", () => {
    expect(isItemAvailableForMealPeriod({ mealPeriods: ["lunch"] }, settings.mealPeriods[1])).toBe(true);
    expect(isItemAvailableForMealPeriod({ mealPeriods: ["breakfast"] }, settings.mealPeriods[1])).toBe(false);
  });

  it("persists printer settings and dispatches the printer change event", () => {
    const listener = vi.fn();
    window.addEventListener("harbour-printer-change", listener);

    savePrinterSettings({
      autoPrint: false,
      copies: "2",
      printer: "Kitchen",
      sound: true,
    });

    window.removeEventListener("harbour-printer-change", listener);
    expect(JSON.parse(window.localStorage.getItem(PRINTER_STORAGE_KEY) || "{}").autoPrint).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("persists printer settings through the async local path and dispatches the printer change event", async () => {
    const listener = vi.fn();
    window.addEventListener("harbour-printer-change", listener);

    await savePrinterSettingsAsync({
      autoPrint: false,
      copies: "2",
      printer: "Kitchen",
      sound: true,
    });

    window.removeEventListener("harbour-printer-change", listener);
    expect(JSON.parse(window.localStorage.getItem(PRINTER_STORAGE_KEY) || "{}").copies).toBe("2");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(saveSupabasePrinterSettings).not.toHaveBeenCalled();
  });

  it("saves printer settings through Supabase in supabase mode", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const settings = {
      autoPrint: false,
      copies: "3",
      printer: "Cashier",
      sound: false,
    };

    await savePrinterSettingsAsync(settings);

    expect(saveSupabasePrinterSettings).toHaveBeenCalledWith(settings);
    expect(window.localStorage.getItem(PRINTER_STORAGE_KEY)).toBeNull();
  });

  it("persists restaurant settings through the async local path and dispatches the settings change event", async () => {
    const listener = vi.fn();
    window.addEventListener("harbour-settings-change", listener);
    const next = { ...DEFAULT_RESTAURANT_SETTINGS, name: "Local Harbour" };

    await saveRestaurantSettingsAsync(next);

    window.removeEventListener("harbour-settings-change", listener);
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}").name).toBe("Local Harbour");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(saveSupabaseRestaurantSettings).not.toHaveBeenCalled();
  });

  it("saves restaurant settings through Supabase in supabase mode", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const next = { ...DEFAULT_RESTAURANT_SETTINGS, name: "Remote Harbour" };

    await saveRestaurantSettingsAsync(next);

    expect(saveSupabaseRestaurantSettings).toHaveBeenCalledWith(next);
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
  });

  it("adds the default PIN when loading legacy restaurant settings", () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      address: "Legacy address",
      language: "繁體中文",
      mealPeriods: [],
      name: "Legacy",
      phone: "1234",
    }));

    expect(loadRestaurantSettings().pin).toBe(DEFAULT_RESTAURANT_SETTINGS.pin);
  });

  it("falls back to the default PIN when stored PIN is invalid", () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      ...DEFAULT_RESTAURANT_SETTINGS,
      pin: "12345",
    }));

    expect(loadRestaurantSettings().pin).toBe(DEFAULT_RESTAURANT_SETTINGS.pin);
  });
});
