import { describe, expect, it, vi } from "vitest";
import type { PrinterSettings, RestaurantSettings } from "../../types";
import {
  saveSupabasePrinterSettings,
  saveSupabaseRestaurantSettings,
  subscribeSupabasePrinterSettingsChanges,
  subscribeSupabaseRestaurantSettingsChanges,
} from "../supabaseSettingsService";

const printerSettings: PrinterSettings = {
  autoPrint: false,
  copies: "2",
  printer: "Kitchen",
  sound: true,
};

const restaurantSettings: RestaurantSettings = {
  address: "88 Harbour Road",
  language: "English",
  mealPeriods: [
    { id: "breakfast", name: "Breakfast", start: "07:00", end: "11:00" },
    { id: "dinner", name: "Dinner", start: "17:00", end: "23:59" },
  ],
  name: "Harbour Test",
  phone: "2888 9999",
  pin: "123456",
};

function createRealtimeClient() {
  const handlers: Array<() => void> = [];
  const channel = {
    on: vi.fn((_event: string, _filter: Record<string, string>, callback: () => void) => {
      handlers.push(callback);
      return channel;
    }),
    subscribe: vi.fn(() => channel),
  };
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  };
  return { channel, client, handlers };
}

describe("supabaseSettingsService", () => {
  it("saves printer settings through the demo printer settings RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    await saveSupabasePrinterSettings(printerSettings, { rpc });

    expect(rpc).toHaveBeenCalledWith("save_demo_printer_settings", {
      settings: {
        auto_print: false,
        copies: 2,
        printer: "Kitchen",
        sound: true,
      },
      target_restaurant_slug: "harbour-demo",
    });
  });

  it("saves restaurant settings through the demo restaurant settings RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    await saveSupabaseRestaurantSettings(restaurantSettings, { rpc });

    expect(rpc).toHaveBeenCalledWith("save_demo_restaurant_settings", {
      settings: {
        address: "88 Harbour Road",
        default_language: "en",
        meal_periods: restaurantSettings.mealPeriods,
        name: "Harbour Test",
        phone: "2888 9999",
      },
      target_restaurant_slug: "harbour-demo",
    });
  });

  it("rejects missing clients and Supabase RPC errors", async () => {
    await expect(saveSupabasePrinterSettings(printerSettings, null)).rejects.toThrow("Supabase is not configured");
    await expect(saveSupabasePrinterSettings(printerSettings, {
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("rpc failed") }),
    })).rejects.toThrow("rpc failed");
    await expect(saveSupabaseRestaurantSettings(restaurantSettings, {
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("restaurant rpc failed") }),
    })).rejects.toThrow("restaurant rpc failed");
  });

  it("subscribes to printer settings realtime changes", () => {
    const { channel, client } = createRealtimeClient();

    const cleanup = subscribeSupabasePrinterSettingsChanges(vi.fn(), client);

    expect(client.channel).toHaveBeenCalledWith("harbour-printer-settings-realtime");
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "printer_settings" },
      expect.any(Function),
    );
    expect(channel.subscribe).toHaveBeenCalled();

    cleanup();
  });

  it("subscribes to restaurant settings realtime changes", () => {
    const { channel, client } = createRealtimeClient();

    const cleanup = subscribeSupabaseRestaurantSettingsChanges(vi.fn(), client);

    expect(client.channel).toHaveBeenCalledWith("harbour-restaurant-settings-realtime");
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "restaurants" },
      expect.any(Function),
    );
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "restaurant_settings" },
      expect.any(Function),
    );
    expect(channel.subscribe).toHaveBeenCalled();

    cleanup();
  });

  it("debounces printer settings realtime events and cleans up the channel", async () => {
    vi.useFakeTimers();
    try {
      const { channel, client, handlers } = createRealtimeClient();
      const onChange = vi.fn();

      const cleanup = subscribeSupabasePrinterSettingsChanges(onChange, client);
      handlers[0]();
      handlers[0]();
      await vi.advanceTimersByTimeAsync(99);

      expect(onChange).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(onChange).toHaveBeenCalledTimes(1);

      handlers[0]();
      cleanup();
      await vi.advanceTimersByTimeAsync(100);

      expect(client.removeChannel).toHaveBeenCalledWith(channel);
      expect(onChange).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("debounces restaurant settings realtime events across both tables and cleans up the channel", async () => {
    vi.useFakeTimers();
    try {
      const { channel, client, handlers } = createRealtimeClient();
      const onChange = vi.fn();

      const cleanup = subscribeSupabaseRestaurantSettingsChanges(onChange, client);
      handlers[0]();
      handlers[1]();
      await vi.advanceTimersByTimeAsync(99);

      expect(onChange).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(onChange).toHaveBeenCalledTimes(1);

      handlers[0]();
      cleanup();
      await vi.advanceTimersByTimeAsync(100);

      expect(client.removeChannel).toHaveBeenCalledWith(channel);
      expect(onChange).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns a noop cleanup when realtime is not configured", () => {
    expect(() => subscribeSupabasePrinterSettingsChanges(vi.fn(), null)()).not.toThrow();
    expect(() => subscribeSupabaseRestaurantSettingsChanges(vi.fn(), null)()).not.toThrow();
  });
});
