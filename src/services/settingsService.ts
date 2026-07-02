import { readStorage, writeStorage } from "./storage";
import type { MealPeriod, MenuItem, PrinterSettings, RestaurantSettings } from "../types";
import { getDataSourceMode } from "./dataSource";

export const SETTINGS_STORAGE_KEY = "harbour-admin-settings";
export const SETTINGS_CHANGE_EVENT = "harbour-settings-change";
export const PRINTER_STORAGE_KEY = "harbour-admin-printer";
export const PRINTER_CHANGE_EVENT = "harbour-printer-change";

export const DEFAULT_MEAL_PERIODS: MealPeriod[] = [
  { id: "breakfast", name: "早市", start: "07:00", end: "11:00" },
  { id: "lunch", name: "午市", start: "11:00", end: "17:00" },
  { id: "dinner", name: "晚市", start: "17:00", end: "23:59" },
];

export const DEFAULT_RESTAURANT_SETTINGS: RestaurantSettings = {
  name: "海港小館",
  phone: "2188 6688",
  address: "香港灣仔軒尼詩道 88 號",
  language: "繁體中文",
  mealPeriods: DEFAULT_MEAL_PERIODS,
  pin: "000000",
};

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  autoPrint: true,
  sound: true,
  printer: "廚房熱敏打印機",
  copies: "1",
};

function normalizeMealPeriods(mealPeriods: MealPeriod[] | undefined): MealPeriod[] {
  const savedPeriods = Array.isArray(mealPeriods) ? mealPeriods : [];

  return DEFAULT_MEAL_PERIODS.map((defaultPeriod) => ({
    ...defaultPeriod,
    ...savedPeriods.find((period) => period.id === defaultPeriod.id),
  }));
}

export function loadRestaurantSettings(): RestaurantSettings {
  const settings = readStorage<Partial<RestaurantSettings>>(SETTINGS_STORAGE_KEY, DEFAULT_RESTAURANT_SETTINGS);
  return {
    ...DEFAULT_RESTAURANT_SETTINGS,
    ...settings,
    mealPeriods: normalizeMealPeriods(settings.mealPeriods),
    pin: typeof settings.pin === "string" && /^\d{6}$/.test(settings.pin)
      ? settings.pin
      : DEFAULT_RESTAURANT_SETTINGS.pin,
  };
}

export async function loadRestaurantSettingsAsync(): Promise<RestaurantSettings> {
  if (getDataSourceMode() !== "supabase") return loadRestaurantSettings();

  try {
    const { loadSupabaseRestaurantSettings } = await import("./supabaseReadService");
    return await loadSupabaseRestaurantSettings();
  } catch {
    return loadRestaurantSettings();
  }
}

export function saveRestaurantSettings(settings: RestaurantSettings): void {
  writeStorage(SETTINGS_STORAGE_KEY, settings, SETTINGS_CHANGE_EVENT);
}

export function loadPrinterSettings(): PrinterSettings {
  return {
    ...DEFAULT_PRINTER_SETTINGS,
    ...readStorage(PRINTER_STORAGE_KEY, DEFAULT_PRINTER_SETTINGS),
  };
}

export async function loadPrinterSettingsAsync(): Promise<PrinterSettings> {
  if (getDataSourceMode() !== "supabase") return loadPrinterSettings();

  try {
    const { loadSupabasePrinterSettings } = await import("./supabaseReadService");
    return await loadSupabasePrinterSettings();
  } catch {
    return loadPrinterSettings();
  }
}

export function savePrinterSettings(settings: PrinterSettings): void {
  writeStorage(PRINTER_STORAGE_KEY, settings, PRINTER_CHANGE_EVENT);
}

function timeToMinutes(time: string | undefined): number | null {
  if (!/^\d{2}:\d{2}$/.test(time || "")) return null;
  const [hours, minutes] = time!.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getCurrentMealPeriod(settings: Pick<RestaurantSettings, "mealPeriods">, date: Date = new Date()): MealPeriod | null {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  return settings.mealPeriods.find((period) => {
    const start = timeToMinutes(period.start);
    const end = timeToMinutes(period.end);
    if (start === null || end === null) return false;
    return start <= end
      ? currentMinutes >= start && currentMinutes < end
      : currentMinutes >= start || currentMinutes < end;
  }) || null;
}

export function isItemAvailableForMealPeriod(item: Pick<MenuItem, "mealPeriods">, mealPeriod: MealPeriod | null): boolean {
  if (!mealPeriod) return false;
  return !Array.isArray(item.mealPeriods) || item.mealPeriods.includes(mealPeriod.id);
}
