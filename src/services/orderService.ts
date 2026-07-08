
import { ORDER_STORAGE_KEY, seedOrders } from "../data/orders";
import type { MealPeriod, MenuItem, Order, OrderLine, PrinterSettings } from "../types";
import { getMenuItem } from "../utils/order";
import { getDataSourceMode } from "./dataSource";
import { isItemAvailableForMealPeriod } from "./settingsService";
import { readStorage, writeStorage } from "./storage";

export const ORDER_CHANGE_EVENT = "harbour-orders-change";

export interface PlaceOrderInput {
  activeMealPeriod: MealPeriod | null;
  items: OrderLine[];
  menuItems: MenuItem[];
  printerSettings: PrinterSettings;
  table: string;
}

export interface LoadOrdersOptions {
  tableNumber?: string;
}

function byCreatedAtAsc(a: Order, b: Order): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function byCreatedAtDesc(a: Order, b: Order): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function normalizeOrder(order: Order, menuItems: MenuItem[]): Order {
  return {
    ...order,
    items: order.items.map((item) => {
      const menuItem = getMenuItem(item.id, menuItems);
      return {
        ...item,
        name: item.name || menuItem?.name,
        unitPrice: item.unitPrice ?? menuItem?.price,
      };
    }),
  };
}

function canPlaceOrder({ activeMealPeriod, items, menuItems }: PlaceOrderInput): boolean {
  return !items.some((line) => {
    const item = getMenuItem(line.id, menuItems);
    return !item || item.soldOut || item.deleted || !isItemAvailableForMealPeriod(item, activeMealPeriod);
  });
}

export function loadOrders(menuItems: MenuItem[]): Order[] {
  const orders = readStorage<Order[]>(ORDER_STORAGE_KEY, seedOrders);
  if (!Array.isArray(orders)) return seedOrders;

  const ordersById = new Map<string, Order>();
  orders.forEach((order) => {
    ordersById.set(order.id, order);
  });

  return Array.from(ordersById.values()).map((order) => normalizeOrder(order, menuItems));
}

export async function loadOrdersAsync(menuItems: MenuItem[], options: LoadOrdersOptions = {}): Promise<Order[]> {
  if (getDataSourceMode() !== "supabase") return loadOrders(menuItems);

  try {
    const { loadSupabaseOrders, loadSupabaseTableOrders } = await import("./supabaseOrderService");
    return options.tableNumber
      ? await loadSupabaseTableOrders(options.tableNumber)
      : await loadSupabaseOrders();
  } catch {
    return loadOrders(menuItems);
  }
}

export function saveOrders(orders: Order[]): void {
  writeStorage(ORDER_STORAGE_KEY, orders, ORDER_CHANGE_EVENT);
}

export function placeOrder({ activeMealPeriod, items, menuItems, printerSettings, table }: PlaceOrderInput): Order | null {
  if (!canPlaceOrder({ activeMealPeriod, items, menuItems, printerSettings, table })) return null;

  const latestOrders = loadOrders(menuItems);
  const maxSequence = Math.max(...latestOrders.map((order) => order.sequence), 1000);
  const order: Order = {
    id: `HO-${maxSequence + 1}`,
    sequence: maxSequence + 1,
    table,
    createdAt: new Date().toISOString(),
    status: printerSettings.autoPrint ? "printed" : "pending",
    items,
  };
  saveOrders([...latestOrders, order]);
  return order;
}

export async function placeOrderAsync(params: PlaceOrderInput): Promise<Order | null> {
  if (!canPlaceOrder(params)) return null;
  if (getDataSourceMode() !== "supabase") return placeOrder(params);

  try {
    const { placeSupabaseOrder } = await import("./supabaseOrderService");
    return await placeSupabaseOrder(params);
  } catch {
    return placeOrder(params);
  }
}

export function updateOrderStatus(id: string, status: Order["status"], menuItems: MenuItem[]): void {
  saveOrders(loadOrders(menuItems).map((order) => (order.id === id ? { ...order, status } : order)));
}

export async function updateOrderStatusAsync(id: string, status: Order["status"], menuItems: MenuItem[]): Promise<void> {
  if (getDataSourceMode() !== "supabase") {
    updateOrderStatus(id, status, menuItems);
    return;
  }

  try {
    const { updateSupabaseOrderStatus } = await import("./supabaseOrderService");
    await updateSupabaseOrderStatus(id, status);
  } catch {
    updateOrderStatus(id, status, menuItems);
  }
}

export function listActiveOrders(orders: Order[]): Order[] {
  return orders
    .filter((order) => order.status !== "settled")
    .sort(byCreatedAtAsc);
}

export function listSettledOrders(orders: Order[]): Order[] {
  return orders
    .filter((order) => order.status === "settled")
    .sort(byCreatedAtDesc);
}

export function listOrdersByTable(orders: Order[], table: string): Order[] {
  return orders
    .filter((order) => order.table === table && order.status !== "settled")
    .sort(byCreatedAtDesc);
}

export function resetDemoOrders(): void {
  saveOrders(seedOrders);
}
