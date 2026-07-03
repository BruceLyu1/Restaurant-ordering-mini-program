import { describe, expect, it, vi } from "vitest";
import type { MenuItem } from "../../types";
import {
  saveSupabaseMenuItems,
  subscribeSupabaseMenuChanges,
  uploadSupabaseDishPhoto,
} from "../supabaseMenuService";

const menuItems: MenuItem[] = [{
  category: "Rice",
  deleted: false,
  description: "Char siu and rice",
  id: "char-siu",
  imageUrl: "https://example.test/char-siu.jpg",
  mealPeriods: ["lunch"],
  name: "Char Siu Rice",
  price: 68,
  soldOut: true,
}];

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

describe("supabaseMenuService", () => {
  it("saves menu items through the demo menu RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    await saveSupabaseMenuItems(menuItems, { rpc });

    expect(rpc).toHaveBeenCalledWith("save_demo_menu_items", {
      items: [{
        category: "Rice",
        client_id: "char-siu",
        deleted: false,
        description: "Char siu and rice",
        image_url: "https://example.test/char-siu.jpg",
        meal_periods: ["lunch"],
        name: "Char Siu Rice",
        price_cents: 6800,
        sold_out: true,
        sort_order: 1,
      }],
      target_restaurant_slug: "harbour-demo",
    });
  });

  it("uploads a data URL dish photo and returns a public URL", async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: "menu/photo.jpg" }, error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://cdn.test/storage/v1/object/public/dish-photos/menu/photo.jpg" },
    });
    const from = vi.fn().mockReturnValue({ getPublicUrl, upload });

    const url = await uploadSupabaseDishPhoto("data:image/jpeg;base64,aGVsbG8=", { storage: { from } });

    expect(from).toHaveBeenCalledWith("dish-photos");
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^menu\/dish-\d+-[a-z0-9]+\.jpg$/),
      expect.any(Blob),
      { contentType: "image/jpeg", upsert: true },
    );
    expect(url).toBe("https://cdn.test/storage/v1/object/public/dish-photos/menu/photo.jpg");
  });

  it("subscribes to menu item realtime changes", () => {
    const { channel, client } = createRealtimeClient();

    const cleanup = subscribeSupabaseMenuChanges(vi.fn(), client);

    expect(client.channel).toHaveBeenCalledWith("harbour-menu-realtime");
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "menu_items" },
      expect.any(Function),
    );
    expect(channel.subscribe).toHaveBeenCalled();

    cleanup();
  });

  it("debounces menu realtime events and cleans up the channel", async () => {
    vi.useFakeTimers();
    try {
      const { channel, client, handlers } = createRealtimeClient();
      const onChange = vi.fn();

      const cleanup = subscribeSupabaseMenuChanges(onChange, client);
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

  it("rejects missing clients and Supabase errors", async () => {
    await expect(saveSupabaseMenuItems(menuItems, null)).rejects.toThrow("Supabase is not configured");
    await expect(saveSupabaseMenuItems(menuItems, {
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("rpc failed") }),
    })).rejects.toThrow("rpc failed");
    await expect(uploadSupabaseDishPhoto("not-a-data-url", null)).rejects.toThrow("Supabase is not configured");
    await expect(uploadSupabaseDishPhoto("data:image/jpeg;base64,aGVsbG8=", {
      storage: {
        from: () => ({
          upload: vi.fn().mockResolvedValue({ data: null, error: new Error("upload failed") }),
          getPublicUrl: vi.fn(),
        }),
      },
    })).rejects.toThrow("upload failed");
  });
});
