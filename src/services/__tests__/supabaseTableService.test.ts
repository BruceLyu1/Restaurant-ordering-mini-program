import { describe, expect, it, vi } from "vitest";
import type { TableInfo } from "../../types";
import {
  saveSupabaseTables,
  subscribeSupabaseTableChanges,
} from "../supabaseTableService";

const tables: TableInfo[] = [
  { number: "01", seats: 4, status: "occupied" },
  { number: "13", seats: 2, status: "available" },
];

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

describe("supabaseTableService", () => {
  it("saves active tables through the demo tables RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    await saveSupabaseTables(tables, { rpc });

    expect(rpc).toHaveBeenCalledWith("save_demo_tables", {
      tables: [
        { number: "01", seats: 4 },
        { number: "13", seats: 2 },
      ],
      target_restaurant_slug: "harbour-demo",
    });
  });

  it("subscribes to table realtime changes", () => {
    const { channel, client } = createRealtimeClient();

    const cleanup = subscribeSupabaseTableChanges(vi.fn(), client);

    expect(client.channel).toHaveBeenCalledWith("harbour-tables-realtime");
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "tables" },
      expect.any(Function),
    );
    expect(channel.subscribe).toHaveBeenCalled();

    cleanup();
  });

  it("debounces table realtime events and cleans up the channel", async () => {
    vi.useFakeTimers();
    try {
      const { channel, client, handlers } = createRealtimeClient();
      const onChange = vi.fn();

      const cleanup = subscribeSupabaseTableChanges(onChange, client);
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

  it("rejects missing clients and Supabase RPC errors", async () => {
    await expect(saveSupabaseTables(tables, null)).rejects.toThrow("Supabase is not configured");
    await expect(saveSupabaseTables(tables, {
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("rpc failed") }),
    })).rejects.toThrow("rpc failed");
  });

  it("returns a noop cleanup when realtime is not configured", () => {
    expect(() => subscribeSupabaseTableChanges(vi.fn(), null)()).not.toThrow();
  });
});
