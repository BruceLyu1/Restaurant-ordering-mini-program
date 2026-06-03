export const PRINTER_STORAGE_KEY = "harbour-admin-printer";

export const DEFAULT_PRINTER_SETTINGS = {
  autoPrint: true,
  sound: true,
  printer: "廚房熱敏打印機",
  copies: "1",
};

export function loadPrinterSettings() {
  const saved = window.localStorage.getItem(PRINTER_STORAGE_KEY);
  if (!saved) return DEFAULT_PRINTER_SETTINGS;

  try {
    return {
      ...DEFAULT_PRINTER_SETTINGS,
      ...JSON.parse(saved),
    };
  } catch {
    return DEFAULT_PRINTER_SETTINGS;
  }
}
