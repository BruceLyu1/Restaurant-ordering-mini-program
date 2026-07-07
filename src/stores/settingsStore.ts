import { create } from "zustand";
import type { PrinterSettings, RestaurantSettings } from "../types";
import {
  loadPrinterSettingsAsync,
  loadPrinterSettings,
  loadRestaurantSettingsAsync,
  loadRestaurantSettings,
  savePrinterSettingsAsync,
  saveRestaurantSettingsAsync,
} from "../services/settingsService";
import { getDataSourceMode } from "../services/dataSource";

interface SettingsStore {
  printer: PrinterSettings;
  restaurant: RestaurantSettings;
  load: () => Promise<void>;
  updatePrinter: (settings: PrinterSettings) => Promise<void>;
  updateRestaurant: (settings: RestaurantSettings) => Promise<void>;
}

let printerSaveQueue: Promise<void> = Promise.resolve();
let restaurantSaveQueue: Promise<void> = Promise.resolve();
let pendingPrinterSaves = 0;
let pendingRestaurantSaves = 0;
let queuedSupabaseLoad = false;
let printerVersion = 0;
let restaurantVersion = 0;

let pendingPrinterSettings: { settings: PrinterSettings; version: number } | null = null;
let pendingRestaurantSettings: { settings: RestaurantSettings; version: number } | null = null;

function arePrinterSettingsEqual(first: PrinterSettings, second: PrinterSettings): boolean {
  return first.autoPrint === second.autoPrint &&
    first.copies === second.copies &&
    first.printer === second.printer &&
    first.sound === second.sound;
}

function applyPendingPrinterSettings(settings: PrinterSettings): PrinterSettings {
  if (!pendingPrinterSettings) return settings;

  if (arePrinterSettingsEqual(settings, pendingPrinterSettings.settings)) {
    pendingPrinterSettings = null;
    return settings;
  }

  return pendingPrinterSettings.settings;
}

function areMealPeriodsEqual(first: RestaurantSettings["mealPeriods"], second: RestaurantSettings["mealPeriods"]): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function areRestaurantSettingsEqual(
  first: RestaurantSettings,
  second: RestaurantSettings,
  options: { includePin?: boolean } = {},
): boolean {
  const includePin = options.includePin ?? true;
  return first.address === second.address &&
    first.language === second.language &&
    areMealPeriodsEqual(first.mealPeriods, second.mealPeriods) &&
    first.name === second.name &&
    first.phone === second.phone &&
    (!includePin || first.pin === second.pin);
}

function applyPendingRestaurantSettings(settings: RestaurantSettings): RestaurantSettings {
  if (!pendingRestaurantSettings) return settings;

  if (areRestaurantSettingsEqual(settings, pendingRestaurantSettings.settings, { includePin: false })) {
    const nextSettings = { ...settings, pin: pendingRestaurantSettings.settings.pin };
    pendingRestaurantSettings = null;
    return nextSettings;
  }

  return pendingRestaurantSettings.settings;
}

function hasPendingSettingsSaves(): boolean {
  return pendingPrinterSaves > 0 || pendingRestaurantSaves > 0;
}

async function loadRemoteSettings(): Promise<Pick<SettingsStore, "printer" | "restaurant">> {
  const [printer, restaurant] = await Promise.all([
    loadPrinterSettingsAsync(),
    loadRestaurantSettingsAsync(),
  ]);

  return {
    printer: applyPendingPrinterSettings(printer),
    restaurant: applyPendingRestaurantSettings(restaurant),
  };
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  printer: loadPrinterSettings(),
  restaurant: loadRestaurantSettings(),

  load: async () => {
    if (getDataSourceMode() !== "supabase") {
      set({
        printer: loadPrinterSettings(),
        restaurant: loadRestaurantSettings(),
      });
      return;
    }

    if (hasPendingSettingsSaves()) {
      queuedSupabaseLoad = true;
      return;
    }

    set(await loadRemoteSettings());
  },

  updatePrinter: async (settings) => {
    const previous = get().printer;
    const shouldProtectPrinter = getDataSourceMode() === "supabase";
    const version = printerVersion + 1;
    printerVersion = version;

    if (shouldProtectPrinter) {
      pendingPrinterSettings = { settings, version };
    }
    set({ printer: settings });

    try {
      await queuePrinterSave(settings, set);
    } catch (error) {
      if (pendingPrinterSettings?.version === version) {
        pendingPrinterSettings = null;
        if (arePrinterSettingsEqual(get().printer, settings)) set({ printer: previous });
      } else if (!shouldProtectPrinter && get().printer === settings) {
        set({ printer: previous });
      }
      throw error;
    }
  },

  updateRestaurant: async (settings) => {
    const previous = get().restaurant;
    const shouldProtectRestaurant = getDataSourceMode() === "supabase";
    const version = restaurantVersion + 1;
    restaurantVersion = version;

    if (shouldProtectRestaurant) {
      pendingRestaurantSettings = { settings, version };
    }
    set({ restaurant: settings });

    try {
      await queueRestaurantSave(settings, set);
    } catch (error) {
      if (pendingRestaurantSettings?.version === version) {
        pendingRestaurantSettings = null;
        if (areRestaurantSettingsEqual(get().restaurant, settings)) set({ restaurant: previous });
      } else if (!shouldProtectRestaurant && areRestaurantSettingsEqual(get().restaurant, settings)) {
        set({ restaurant: previous });
      }
      throw error;
    }
  },
}));

async function queuePrinterSave(
  settings: PrinterSettings,
  set: (state: Partial<SettingsStore>) => void,
): Promise<void> {
  pendingPrinterSaves += 1;
  const saveTask = printerSaveQueue.then(() => savePrinterSettingsAsync(settings));
  printerSaveQueue = saveTask.catch(() => undefined);

  try {
    await saveTask;
  } finally {
    pendingPrinterSaves -= 1;
    if (!hasPendingSettingsSaves() && queuedSupabaseLoad) {
      queuedSupabaseLoad = false;
      set(await loadRemoteSettings());
    }
  }
}

async function queueRestaurantSave(
  settings: RestaurantSettings,
  set: (state: Partial<SettingsStore>) => void,
): Promise<void> {
  pendingRestaurantSaves += 1;
  const saveTask = restaurantSaveQueue.then(() => saveRestaurantSettingsAsync(settings));
  restaurantSaveQueue = saveTask.catch(() => undefined);

  try {
    await saveTask;
  } finally {
    pendingRestaurantSaves -= 1;
    if (!hasPendingSettingsSaves() && queuedSupabaseLoad) {
      queuedSupabaseLoad = false;
      set(await loadRemoteSettings());
    }
  }
}
