import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRINTER_STORAGE_KEY, SETTINGS_STORAGE_KEY } from "../../services/settingsService";
import * as settingsService from "../../services/settingsService";
import { useSettingsStore } from "../settingsStore";

describe("settingsStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_DATA_SOURCE", "local");
    useSettingsStore.getState().load();
  });

  it("updates restaurant settings and persists them through settingsService", async () => {
    const next = {
      ...useSettingsStore.getState().restaurant,
      name: "Store Brand",
      pin: "123456",
    };

    await useSettingsStore.getState().updateRestaurant(next);

    expect(useSettingsStore.getState().restaurant.name).toBe("Store Brand");
    expect(useSettingsStore.getState().restaurant.pin).toBe("123456");
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}").name).toBe("Store Brand");
  });

  it("rolls back optimistic restaurant updates when remote save fails", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const previous = { ...useSettingsStore.getState().restaurant, name: "Before" };
    useSettingsStore.setState({ restaurant: previous });
    vi.spyOn(settingsService, "saveRestaurantSettingsAsync").mockRejectedValueOnce(new Error("save failed"));

    await expect(useSettingsStore.getState().updateRestaurant({
      ...previous,
      name: "After",
    })).rejects.toThrow("save failed");

    expect(useSettingsStore.getState().restaurant).toEqual(previous);
  });

  it("keeps optimistic restaurant settings when realtime reload fires during a pending save", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const initial = { ...useSettingsStore.getState().restaurant, name: "Before" };
    const next = { ...initial, name: "After" };
    useSettingsStore.setState({ restaurant: initial });
    let resolveSave: () => void = () => undefined;
    let saveStarted = false;
    vi.spyOn(settingsService, "saveRestaurantSettingsAsync").mockImplementation(() => new Promise<void>((resolve) => {
      saveStarted = true;
      resolveSave = resolve;
    }));
    vi.spyOn(settingsService, "loadRestaurantSettingsAsync").mockResolvedValue(initial);

    const save = useSettingsStore.getState().updateRestaurant(next);
    await vi.waitFor(() => expect(saveStarted).toBe(true));
    await useSettingsStore.getState().load();

    expect(useSettingsStore.getState().restaurant).toEqual(next);
    resolveSave();
    await save;
    expect(useSettingsStore.getState().restaurant).toEqual(next);
  });

  it("serializes rapid restaurant saves so later settings are not overwritten", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const initial = { ...useSettingsStore.getState().restaurant, name: "Initial", phone: "1000" };
    const first = { ...initial, name: "First" };
    const second = { ...first, phone: "2000" };
    const savedSettings: typeof initial[] = [];
    const resolvers: Array<() => void> = [];
    useSettingsStore.setState({ restaurant: initial });
    vi.spyOn(settingsService, "saveRestaurantSettingsAsync").mockImplementation((settings) => {
      savedSettings.push(settings);
      return new Promise<void>((resolve) => {
        resolvers.push(resolve);
      });
    });

    const firstSave = useSettingsStore.getState().updateRestaurant(first);
    const secondSave = useSettingsStore.getState().updateRestaurant(second);

    expect(useSettingsStore.getState().restaurant).toEqual(second);
    await vi.waitFor(() => expect(savedSettings).toHaveLength(1));
    expect(savedSettings[0]).toEqual(first);

    resolvers[0]();
    await vi.waitFor(() => expect(savedSettings).toHaveLength(2));
    expect(savedSettings[1]).toEqual(second);

    resolvers[1]();
    await Promise.all([firstSave, secondSave]);
    expect(useSettingsStore.getState().restaurant).toEqual(second);
  });

  it("does not let an older failed restaurant save rollback a newer setting", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const initial = { ...useSettingsStore.getState().restaurant, name: "Initial" };
    const first = { ...initial, name: "First" };
    const second = { ...first, name: "Second" };
    let rejectFirstSave: (error: Error) => void = () => undefined;
    let firstSaveStarted = false;
    useSettingsStore.setState({ restaurant: initial });
    vi.spyOn(settingsService, "saveRestaurantSettingsAsync")
      .mockImplementationOnce(() => new Promise<void>((_resolve, reject) => {
        firstSaveStarted = true;
        rejectFirstSave = reject;
      }))
      .mockResolvedValue(undefined);

    const firstSave = useSettingsStore.getState().updateRestaurant(first);
    const secondSave = useSettingsStore.getState().updateRestaurant(second);

    expect(useSettingsStore.getState().restaurant).toEqual(second);
    await vi.waitFor(() => expect(firstSaveStarted).toBe(true));
    rejectFirstSave(new Error("old save failed"));
    await expect(firstSave).rejects.toThrow("old save failed");
    await secondSave;

    expect(useSettingsStore.getState().restaurant).toEqual(second);
  });

  it("updates printer settings immediately and persists the change", async () => {
    const next = {
      ...useSettingsStore.getState().printer,
      autoPrint: false,
    };

    await useSettingsStore.getState().updatePrinter(next);

    expect(useSettingsStore.getState().printer.autoPrint).toBe(false);
    expect(JSON.parse(window.localStorage.getItem(PRINTER_STORAGE_KEY) || "{}").autoPrint).toBe(false);
  });

  it("rolls back optimistic printer updates when remote save fails", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const previous = { autoPrint: true, copies: "1", printer: "Kitchen", sound: true };
    useSettingsStore.setState({ printer: previous });
    vi.spyOn(settingsService, "savePrinterSettingsAsync").mockRejectedValueOnce(new Error("save failed"));

    await expect(useSettingsStore.getState().updatePrinter({
      ...previous,
      autoPrint: false,
    })).rejects.toThrow("save failed");

    expect(useSettingsStore.getState().printer).toEqual(previous);
  });

  it("serializes rapid printer saves so later settings are not overwritten", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const initial = { autoPrint: true, copies: "1", printer: "Kitchen", sound: true };
    const first = { ...initial, printer: "Cashier" };
    const second = { ...first, copies: "2" };
    const savedSettings: typeof initial[] = [];
    const resolvers: Array<() => void> = [];
    useSettingsStore.setState({ printer: initial });
    vi.spyOn(settingsService, "savePrinterSettingsAsync").mockImplementation((settings) => {
      savedSettings.push(settings);
      return new Promise<void>((resolve) => {
        resolvers.push(resolve);
      });
    });

    const firstSave = useSettingsStore.getState().updatePrinter(first);
    const secondSave = useSettingsStore.getState().updatePrinter(second);

    expect(useSettingsStore.getState().printer).toEqual(second);
    await vi.waitFor(() => expect(savedSettings).toHaveLength(1));
    expect(savedSettings[0]).toEqual(first);

    resolvers[0]();
    await vi.waitFor(() => expect(savedSettings).toHaveLength(2));
    expect(savedSettings[1]).toEqual(second);

    resolvers[1]();
    await Promise.all([firstSave, secondSave]);
    expect(useSettingsStore.getState().printer).toEqual(second);
  });

  it("keeps optimistic printer settings when realtime reload fires during a pending save", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const initial = { autoPrint: true, copies: "1", printer: "Kitchen", sound: true };
    const next = { ...initial, autoPrint: false };
    useSettingsStore.setState({ printer: initial });
    let resolveSave: () => void = () => undefined;
    let saveStarted = false;
    vi.spyOn(settingsService, "savePrinterSettingsAsync").mockImplementation(() => new Promise<void>((resolve) => {
      saveStarted = true;
      resolveSave = resolve;
    }));
    vi.spyOn(settingsService, "loadPrinterSettingsAsync").mockResolvedValue(initial);

    const save = useSettingsStore.getState().updatePrinter(next);
    await vi.waitFor(() => expect(saveStarted).toBe(true));
    await useSettingsStore.getState().load();

    expect(useSettingsStore.getState().printer).toEqual(next);
    resolveSave();
    await save;
    expect(useSettingsStore.getState().printer).toEqual(next);
  });

  it("keeps optimistic printer settings when a stale remote snapshot loads after save", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const initial = { autoPrint: true, copies: "1", printer: "Kitchen", sound: true };
    const next = { ...initial, autoPrint: false, sound: false };
    useSettingsStore.setState({ printer: initial });
    vi.spyOn(settingsService, "savePrinterSettingsAsync").mockResolvedValue(undefined);
    vi.spyOn(settingsService, "loadPrinterSettingsAsync").mockResolvedValue(initial);

    await useSettingsStore.getState().updatePrinter(next);
    await useSettingsStore.getState().load();

    expect(useSettingsStore.getState().printer).toEqual(next);
  });

  it("does not let an older failed printer save rollback a newer setting", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const initial = { autoPrint: true, copies: "1", printer: "Kitchen", sound: true };
    const first = { ...initial, autoPrint: false };
    const second = { ...first, autoPrint: true };
    let rejectFirstSave: (error: Error) => void = () => undefined;
    let firstSaveStarted = false;
    useSettingsStore.setState({ printer: initial });
    vi.spyOn(settingsService, "savePrinterSettingsAsync")
      .mockImplementationOnce(() => new Promise<void>((_resolve, reject) => {
        firstSaveStarted = true;
        rejectFirstSave = reject;
      }))
      .mockResolvedValue(undefined);

    const firstSave = useSettingsStore.getState().updatePrinter(first);
    const secondSave = useSettingsStore.getState().updatePrinter(second);

    expect(useSettingsStore.getState().printer).toEqual(second);
    await vi.waitFor(() => expect(firstSaveStarted).toBe(true));
    rejectFirstSave(new Error("old save failed"));
    await expect(firstSave).rejects.toThrow("old save failed");
    await secondSave;

    expect(useSettingsStore.getState().printer).toEqual(second);
  });
});
