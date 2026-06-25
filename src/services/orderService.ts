
import { ORDER_STORAGE_KEY, seedOrders } from "../data/orders";
import type { MealPeriod, MenuItem, Order, OrderLine, PrinterSettings } from "../types";
import { getMenuItem } from "../utils/order";
import { isItemAvailableForMealPeriod } from "./settingsService";
import { readStorage, writeStorage } from "./storage";

export const ORDER_CHANGE_EVENT = "harbour-orders-change";

interface PlaceOrderInput {
  activeMealPeriod: MealPeriod | null;
  items: OrderLine[];
  menuItems: MenuItem[];
  printerSettings: PrinterSettings;
  table: string;
}

function byCreatedAtAsc(a: Order, b: Order): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function byCreatedAtDesc(a: Order, b: Order): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function loadOrders(menuItems: MenuItem[]): Order[] {
  const orders = readStorage<Order[]>(ORDER_STORAGE_KEY, seedOrders);
  if (!Array.isArray(orders)) return seedOrders;

  return orders.map((order) => ({
    ...order,
    items: order.items.map((item) => {
      const menuItem = getMenuItem(item.id, menuItems);
      return {
        ...item,
        name: item.name || menuItem?.name,
        unitPrice: item.unitPrice ?? menuItem?.price,
      };
    }),
  }));
}

export function saveOrders(orders: Order[]): void {
  writeStorage(ORDER_STORAGE_KEY, orders, ORDER_CHANGE_EVENT);
}

export function placeOrder({ activeMealPeriod, items, menuItems, printerSettings, table }: PlaceOrderInput): Order | null {
  if (items.some((line) => {
    const item = getMenuItem(line.id, menuItems);
    return !item || item.soldOut || item.deleted || !isItemAvailableForMealPeriod(item, activeMealPeriod);
  })) return null;

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

export function updateOrderStatus(id: string, status: Order["status"], menuItems: MenuItem[]): void {
  saveOrders(loadOrders(menuItems).map((order) => (order.id === id ? { ...order, status } : order)));
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
