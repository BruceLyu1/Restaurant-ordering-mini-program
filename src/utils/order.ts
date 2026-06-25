
import type { MenuItem, Order } from "../types";

type MenuLookupItem = Pick<MenuItem, "id" | "price"> & Partial<Pick<MenuItem, "name">>;
type OrderWithItems = Pick<Order, "items">;

export function getMenuItem<T extends MenuLookupItem>(id: string, items: T[]): T | undefined {
  return items.find((item) => item.id === id);
}

export function getOrderTotal(order: OrderWithItems, items: MenuLookupItem[]): number {
  return order.items.reduce(
    (total: number, item) => total + (item.unitPrice ?? getMenuItem(item.id, items)?.price ?? 0) * item.quantity,
    0,
  );
}

export function getOrderCount(order: OrderWithItems): number {
  return order.items.reduce((total: number, item) => total + item.quantity, 0);
}
