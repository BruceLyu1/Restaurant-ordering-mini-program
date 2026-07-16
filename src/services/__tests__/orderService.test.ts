import { beforeEach, describe, expect, it, vi } from "vitest";
import { ORDER_STORAGE_KEY } from "../../data/orders";
import type { MealPeriod, MenuItem, Order, PrinterSettings } from "../../types";
import {
  listActiveOrders,
  listSettledOrders,
  loadOrders,
  loadOrdersAsync,
  placeOrder,
  placeOrderAsync,
  reverseSettlement,
  settleOrder,
  settleOrderAsync,
  updateOrderStatus,
  updateOrderStatusAsync,
} from "../orderService";
import {
  loadSupabaseOrders,
  loadSupabaseTableOrders,
  placeSupabaseOrder,
  settleSupabaseOrder,
  updateSupabaseOrderStatus,
} from "../supabaseOrderService";

vi.mock("../supabaseOrderService", () => ({
  loadSupabaseOrders: vi.fn(async () => []),
  loadSupabaseTableOrders: vi.fn(async () => []),
  placeSupabaseOrder: vi.fn(async () => ({
    createdAt: "2026-07-02T07:00:00.000Z",
    id: "HO-1001",
    items: [],
    sequence: 1001,
    status: "pending",
    table: "12",
  })),
  updateSupabaseOrderStatus: vi.fn(async () => undefined),
  settleSupabaseOrder: vi.fn(async () => ({
    paymentMethod: "cash",
    settledAt: "2026-07-02T07:20:00.000Z",
    settledByName: "Cashier",
    status: "settled",
  })),
}));

const menuItems: MenuItem[] = [
  {
    category: "Rice",
    description: "Char siu with rice",
    id: "rice",
    name: "BBQ Rice",
    price: 68,
    soldOut: false,
    deleted: false,
    mealPeriods: ["lunch"],
  },
];

const activeMealPeriod: MealPeriod = { id: "lunch", name: "Lunch", start: "11:00", end: "17:00" };
const printerSettings: PrinterSettings = { autoPrint: false, copies: "1", printer: "Kitchen", sound: true };

describe("orderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_DATA_SOURCE", "local");
    window.localStorage.clear();
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify([]));
  });

  it("places, prints, and settles an order", () => {
    const order = placeOrder({
      activeMealPeriod,
      items: [{ id: "rice", name: "BBQ Rice", quantity: 2, unitPrice: 68 }],
      menuItems,
      printerSettings,
      table: "02",
    });

    expect(order?.status).toBe("pending");
    expect(loadOrders(menuItems)).toHaveLength(1);

    updateOrderStatus(order!.id, "printed", menuItems);
    expect(loadOrders(menuItems)[0].status).toBe("printed");

    settleOrder(order!.id, { operatorName: "Local Admin", paymentMethod: "cash", settlementNote: "Cash paid" }, menuItems);
    expect(loadOrders(menuItems)[0]).toMatchObject({
      paymentMethod: "cash",
      settlementNote: "Cash paid",
      settledByName: "Local Admin",
      status: "settled",
    });
  });

  it("reverses a settlement, restores the original status, and preserves its audit snapshot", () => {
    const order = placeOrder({
      activeMealPeriod,
      items: [{ id: "rice", name: "BBQ Rice", quantity: 1, unitPrice: 68 }],
      menuItems,
      printerSettings,
      table: "02",
    });
    updateOrderStatus(order!.id, "printed", menuItems);
    settleOrder(order!.id, { operatorName: "Cashier", paymentMethod: "octopus", settlementNote: "Terminal 1" }, menuItems);

    reverseSettlement(order!.id, { operatorName: "Manager", reason: "Wrong payment method" }, menuItems);

    expect(loadOrders(menuItems)[0].status).toBe("printed");
    expect(loadOrders(menuItems)[0]).not.toHaveProperty("paymentMethod");
    expect(loadOrders(menuItems)[0]).not.toHaveProperty("settledAt");
    expect(loadOrders(menuItems)[0]).not.toHaveProperty("settledByName");
    expect(loadOrders(menuItems)[0]).not.toHaveProperty("settlementNote");
    expect(loadOrders(menuItems)[0].settlementReversals).toMatchObject([{
      originalPaymentMethod: "octopus",
      originalSettledByName: "Cashier",
      originalSettlementNote: "Terminal 1",
      reason: "Wrong payment method",
      restoredStatus: "printed",
      reversedByName: "Manager",
    }]);
  });

  it("deduplicates orders with the same id when loading from storage", () => {
    const duplicateOrders: Order[] = [
      {
        id: "HO-1001",
        sequence: 1001,
        status: "pending",
        table: "12",
        createdAt: "2026-06-23T12:00:00.000Z",
        items: [{ id: "rice", quantity: 1, unitPrice: 68 }],
      },
      {
        id: "HO-1001",
        sequence: 1001,
        status: "printed",
        table: "12",
        createdAt: "2026-06-23T12:00:00.000Z",
        items: [{ id: "rice", quantity: 1, unitPrice: 68 }],
      },
    ];
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(duplicateOrders));

    const loadedOrders = loadOrders(menuItems);
    expect(loadedOrders).toHaveLength(1);
    expect(loadedOrders[0].status).toBe("printed");
  });

  it("lists active orders by oldest created time first", () => {
    const orders: Order[] = [
      { id: "newer", sequence: 1001, status: "pending", table: "02", createdAt: "2026-06-23T12:00:00.000Z", items: [] },
      { id: "older", sequence: 1002, status: "printed", table: "03", createdAt: "2026-06-23T11:00:00.000Z", items: [] },
      { id: "settled", sequence: 1000, status: "settled", table: "04", createdAt: "2026-06-23T10:00:00.000Z", items: [] },
    ];

    expect(listActiveOrders(orders).map((order) => order.id)).toEqual(["older", "newer"]);
  });

  it("lists settled orders by newest created time first", () => {
    const orders: Order[] = [
      { id: "older", sequence: 1002, status: "settled", table: "02", createdAt: "2026-06-23T11:00:00.000Z", items: [] },
      { id: "newer", sequence: 1001, status: "settled", table: "03", createdAt: "2026-06-23T12:00:00.000Z", items: [] },
      { id: "active", sequence: 1000, status: "pending", table: "04", createdAt: "2026-06-23T13:00:00.000Z", items: [] },
    ];

    expect(listSettledOrders(orders).map((order) => order.id)).toEqual(["newer", "older"]);
  });

  it("loads only the current table orders in Supabase guest mode", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const tableOrders: Order[] = [{
      createdAt: "2026-07-02T07:05:00.000Z",
      id: "HO-1003",
      items: [],
      sequence: 1003,
      status: "printed",
      table: "12",
    }];
    vi.mocked(loadSupabaseTableOrders).mockResolvedValue(tableOrders);

    await expect(loadOrdersAsync(menuItems, { tableNumber: "12" })).resolves.toEqual(tableOrders);

    expect(loadSupabaseTableOrders).toHaveBeenCalledWith("12");
    expect(loadSupabaseOrders).not.toHaveBeenCalled();
  });

  it("loads all orders in Supabase admin mode", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const adminOrders: Order[] = [{
      createdAt: "2026-07-02T07:00:00.000Z",
      id: "HO-1002",
      items: [],
      sequence: 1002,
      status: "pending",
      table: "02",
    }];
    vi.mocked(loadSupabaseOrders).mockResolvedValue(adminOrders);

    await expect(loadOrdersAsync(menuItems)).resolves.toEqual(adminOrders);

    expect(loadSupabaseOrders).toHaveBeenCalled();
    expect(loadSupabaseTableOrders).not.toHaveBeenCalled();
  });

  it("does not fall back to local orders when a Supabase order query fails", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify([{
      createdAt: "2026-07-02T07:00:00.000Z",
      id: "HO-1999",
      items: [],
      sequence: 1999,
      status: "pending",
      table: "12",
    }]));
    vi.mocked(loadSupabaseOrders).mockRejectedValueOnce(new Error("column orders.settled_by_name does not exist"));

    await expect(loadOrdersAsync(menuItems)).rejects.toThrow("column orders.settled_by_name does not exist");
    expect(loadOrders(menuItems)).toHaveLength(1);
  });

  it("does not create a local-only order when Supabase order creation fails", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    vi.mocked(placeSupabaseOrder).mockRejectedValueOnce(new Error("create_pending_order failed"));

    await expect(placeOrderAsync({
      activeMealPeriod,
      items: [{ id: "rice", name: "BBQ Rice", quantity: 1, unitPrice: 68 }],
      menuItems,
      printerSettings,
      table: "12",
    })).rejects.toThrow("create_pending_order failed");

    expect(loadOrders(menuItems)).toEqual([]);
  });

  it("does not write local storage when Supabase rejects a settlement", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify([{
      createdAt: "2026-07-02T07:00:00.000Z",
      id: "HO-1002",
      items: [],
      sequence: 1002,
      status: "pending",
      table: "02",
    }]));
    vi.mocked(settleSupabaseOrder).mockRejectedValueOnce(new Error("staff permission denied"));

    await expect(settleOrderAsync("HO-1002", { operatorName: "Cashier", paymentMethod: "cash" }, menuItems)).rejects.toThrow("staff permission denied");

    expect(loadOrders(menuItems)[0].status).toBe("pending");
  });
});
