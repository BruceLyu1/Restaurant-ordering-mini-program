import { beforeEach, describe, expect, it } from "vitest";
import { PRINTER_STORAGE_KEY, SETTINGS_STORAGE_KEY } from "../../services/settingsService";
import { useSettingsStore } from "../settingsStore";

describe("settingsStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSettingsStore.getState().load();
  });

  it("updates restaurant settings and persists them through settingsService", () => {
    const next = {
      ...useSettingsStore.getState().restaurant,
      name: "Store Brand",
      pin: "123456",
    };

    useSettingsStore.getState().updateRestaurant(next);

    expect(useSettingsStore.getState().restaurant.name).toBe("Store Brand");
    expect(useSettingsStore.getState().restaurant.pin).toBe("123456");
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}").name).toBe("Store Brand");
  });

  it("updates printer settings immediately and persists the change", () => {
    const next = {
      ...useSettingsStore.getState().printer,
      autoPrint: false,
    };

    useSettingsStore.getState().updatePrinter(next);

    expect(useSettingsStore.getState().printer.autoPrint).toBe(false);
    expect(JSON.parse(window.localStorage.getItem(PRINTER_STORAGE_KEY) || "{}").autoPrint).toBe(false);
  });
});
