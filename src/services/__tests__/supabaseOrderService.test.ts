import { describe, expect, it, vi } from "vitest";
import type { MealPeriod, MenuItem, PrinterSettings } from "../../types";
import {
  loadSupabaseOrders,
  placeSupabaseOrder,
  subscribeSupabaseOrderChanges,
  updateSupabaseOrderStatus,
} from "../supabaseOrderService";

const activeMealPeriod: MealPeriod = { id: "lunch", name: "Lunch", start: "11:00", end: "17:00" };
const menuItems: MenuItem[] = [{
  category: "Rice",
  deleted: false,
  description: "Char siu with rice",
  id: "rice",
  mealPeriods: ["lunch"],
  name: "BBQ Rice",
  price: 68,
  soldOut: false,
}];
const printerSettings: PrinterSettings = { autoPrint: false, copies: "1", printer: "Kitchen", sound: true };

function createQuery(rows: unknown[], error: Error | null = null) {
  const query = {
    order: () => query,
    select: () => query,
    then: (resolve: (value: { data: unknown[]; error: Error | null }) => void) => (
      Promise.resolve({ data: rows, error }).then(resolve)
    ),
  };
  return query;
}

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

describe("supabaseOrderService", () => {
  it("places a pending order through the create RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        createdAt: "2026-07-02T07:00:00.000Z",
        id: "HO-1001",
        items: [{ id: "rice", name: "BBQ Rice", notes: "Less rice", quantity: 2, unitPrice: 68 }],
        sequence: 1001,
        status: "pending",
        table: "01",
      },
      error: null,
    });
    const client = { rpc };

    const order = await placeSupabaseOrder({
      activeMealPeriod,
      items: [{ id: "rice", name: "BBQ Rice", notes: "Less rice", quantity: 2, unitPrice: 68 }],
      menuItems,
      printerSettings,
      table: "01",
    }, client);

    expect(rpc).toHaveBeenCalledWith("create_pending_order", {
      line_items: [{ client_id: "rice", notes: "Less rice", quantity: 2 }],
      target_meal_period_id: "lunch",
      target_restaurant_slug: "harbour-demo",
      target_table_number: "01",
    });
    expect(order).toMatchObject({
      id: "HO-1001",
      sequence: 1001,
      status: "pending",
      table: "01",
    });
  });

  it("maps remote order rows and nested lines to local orders", async () => {
    const client = {
      from: () => createQuery([{
        created_at: "2026-07-02T07:00:00.000Z",
        order_lines: [{
          menu_item_client_id: "rice",
          name: "BBQ Rice",
          notes: null,
          quantity: 1,
          unit_price_cents: 6800,
        }],
        order_number: 1002,
        status: "printed",
        tables: { number: "02" },
      }]),
    };

    await expect(loadSupabaseOrders(client)).resolves.toEqual([{
      createdAt: "2026-07-02T07:00:00.000Z",
      id: "HO-1002",
      items: [{ id: "rice", name: "BBQ Rice", notes: undefined, quantity: 1, unitPrice: 68 }],
      sequence: 1002,
      status: "printed",
      table: "02",
    }]);
  });

  it("updates order status through the status RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = { rpc };

    await updateSupabaseOrderStatus("HO-1002", "settled", client);

    expect(rpc).toHaveBeenCalledWith("update_order_status", {
      next_status: "settled",
      target_order_id: "HO-1002",
      target_restaurant_slug: "harbour-demo",
    });
  });

  it("rejects empty orders and missing Supabase configuration", async () => {
    await expect(placeSupabaseOrder({
      activeMealPeriod,
      items: [],
      menuItems,
      printerSettings,
      table: "01",
    }, { rpc: vi.fn() })).rejects.toThrow("Cannot place an empty order");

    await expect(loadSupabaseOrders(null)).rejects.toThrow("Supabase is not configured");
  });

  it("subscribes to order and order line realtime changes", () => {
    const { channel, client } = createRealtimeClient();

    const cleanup = subscribeSupabaseOrderChanges(vi.fn(), client);

    expect(client.channel).toHaveBeenCalledWith("harbour-orders-realtime");
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      expect.any(Function),
    );
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "order_lines" },
      expect.any(Function),
    );
    expect(channel.subscribe).toHaveBeenCalled();

    cleanup();
  });

  it("debounces multiple realtime events into one refresh", async () => {
    vi.useFakeTimers();
    try {
      const { client, handlers } = createRealtimeClient();
      const onChange = vi.fn();

      subscribeSupabaseOrderChanges(onChange, client);
      handlers.forEach((handler) => handler());

      expect(onChange).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(100);

      expect(onChange).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes the realtime channel and cancels pending refresh on cleanup", async () => {
    vi.useFakeTimers();
    try {
      const { channel, client, handlers } = createRealtimeClient();
      const onChange = vi.fn();

      const cleanup = subscribeSupabaseOrderChanges(onChange, client);
      handlers[0]();
      cleanup();
      await vi.advanceTimersByTimeAsync(100);

      expect(client.removeChannel).toHaveBeenCalledWith(channel);
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns a noop cleanup when Supabase realtime is unavailable", () => {
    const cleanup = subscribeSupabaseOrderChanges(vi.fn(), null);

    expect(() => cleanup()).not.toThrow();
  });
});
