
import { getOrderTotal } from "../utils/order";
import { getPeriodRevenue } from "../utils/revenue";
import type { MenuItem, Order, RevenueSummary } from "../types";

export { getPeriodRevenue };

export interface SalesRankingItem extends MenuItem {
  quantity: number;
  revenue: number;
}

export function getSalesRanking(orders: Order[], menuItems: MenuItem[]): SalesRankingItem[] {
  const quantities = new Map(menuItems.map((item) => [item.id, 0]));
  const revenue = new Map(menuItems.map((item) => [item.id, 0]));

  orders.forEach((order) => order.items.forEach((item) => {
    const menuItem = menuItems.find((entry) => entry.id === item.id);
    quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity);
    revenue.set(item.id, (revenue.get(item.id) || 0) + (item.unitPrice ?? menuItem?.price ?? 0) * item.quantity);
  }));

  return menuItems
    .map((item) => ({ ...item, quantity: quantities.get(item.id) || 0, revenue: revenue.get(item.id) || 0 }))
    .sort((a, b) => b.quantity - a.quantity);
}

export function getRevenueSummary(orders: Order[], menuItems: MenuItem[]): RevenueSummary {
  return getPeriodRevenue(orders, menuItems);
}

export function getOrderRevenue(order: Order, menuItems: MenuItem[]): number {
  return getOrderTotal(order, menuItems);
}
