
import { getOrderTotal } from "./order";
import type { MenuItem, Order, RevenueSummary } from "../types";

export function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getStartOfWeek(date: Date): Date {
  const start = getStartOfDay(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start;
}

export function getPeriodRevenue(orders: Order[], items: MenuItem[]): RevenueSummary {
  const now = new Date();
  const starts: Record<keyof RevenueSummary, Date> = {
    day: getStartOfDay(now),
    week: getStartOfWeek(now),
    month: new Date(now.getFullYear(), now.getMonth(), 1),
    year: new Date(now.getFullYear(), 0, 1),
  };
  const totals: RevenueSummary = { day: 0, week: 0, month: 0, year: 0 };

  orders.forEach((order) => {
    const createdAt = new Date(order.createdAt);
    const total = getOrderTotal(order, items);
    (Object.entries(starts) as [keyof RevenueSummary, Date][]).forEach(([period, start]) => {
      if (createdAt >= start) totals[period] += total;
    });
  });

  return totals;
}
