import { create } from "zustand";
import type { PrinterSettings, RestaurantSettings } from "../types";
import {
  loadPrinterSettingsAsync,
  loadPrinterSettings,
  loadRestaurantSettingsAsync,
  loadRestaurantSettings,
  savePrinterSettings,
  saveRestaurantSettings,
} from "../services/settingsService";

interface SettingsStore {
  printer: PrinterSettings;
  restaurant: RestaurantSettings;
  load: () => Promise<void>;
  updatePrinter: (settings: PrinterSettings) => void;
  updateRestaurant: (settings: RestaurantSettings) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  printer: loadPrinterSettings(),
  restaurant: loadRestaurantSettings(),

  load: async () => {
    set({
      printer: loadPrinterSettings(),
      restaurant: loadRestaurantSettings(),
    });
    const [printer, restaurant] = await Promise.all([
      loadPrinterSettingsAsync(),
      loadRestaurantSettingsAsync(),
    ]);
    set({ printer, restaurant });
  },

  updatePrinter: (settings) => {
    savePrinterSettings(settings);
    set({ printer: settings });
  },

  updateRestaurant: (settings) => {
    saveRestaurantSettings(settings);
    set({ restaurant: settings });
  },
}));
