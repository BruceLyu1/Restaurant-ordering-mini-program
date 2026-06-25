import { create } from "zustand";
import type { PrinterSettings, RestaurantSettings } from "../types";
import {
  loadPrinterSettings,
  loadRestaurantSettings,
  savePrinterSettings,
  saveRestaurantSettings,
} from "../services/settingsService";

interface SettingsStore {
  printer: PrinterSettings;
  restaurant: RestaurantSettings;
  load: () => void;
  updatePrinter: (settings: PrinterSettings) => void;
  updateRestaurant: (settings: RestaurantSettings) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  printer: loadPrinterSettings(),
  restaurant: loadRestaurantSettings(),

  load: () => {
    set({
      printer: loadPrinterSettings(),
      restaurant: loadRestaurantSettings(),
    });
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
