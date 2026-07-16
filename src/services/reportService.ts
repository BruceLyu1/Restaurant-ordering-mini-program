
import { getOrderTotal } from "../utils/order";
import { getPeriodRevenue } from "../utils/revenue";
import type {
  DishSalesReportItem,
  MenuItem,
  Order,
  PaymentReportMethod,
  PaymentSalesReportItem,
  RevenueReport,
  RevenueSummary,
  StaffSalesReportItem,
} from "../types";
import { PAYMENT_METHODS } from "../types";
import { getDataSourceMode } from "./dataSource";
import { getRestaurantSlug, supabase } from "./supabaseClient";

export { getPeriodRevenue };

export interface SalesRankingItem extends MenuItem {
  quantity: number;
  revenue: number;
}

export interface ReportRange {
  end: Date;
  start: Date;
}

interface SupabaseRpcResult {
  data: unknown;
  error: Error | null;
}

interface SupabaseLike {
  rpc?: (fn: string, args: Record<string, unknown>) => Promise<SupabaseRpcResult>;
}

interface RemoteRevenueReport {
  dishSales?: RemoteDishSalesItem[];
  paymentSales?: RemotePaymentSalesItem[];
  staffSales?: RemoteStaffSalesItem[];
  summary?: Partial<RevenueReport["summary"]>;
}

interface RemoteDishSalesItem {
  id?: string;
  name?: string;
  quantity?: number;
  revenue?: number;
}

interface RemotePaymentSalesItem {
  method?: string;
  orderCount?: number;
  revenue?: number;
}

interface RemoteStaffSalesItem {
  name?: string;
  orderCount?: number;
  revenue?: number;
  staffId?: number | null;
}

const EMPTY_REPORT: RevenueReport = {
  dishSales: [],
  paymentSales: [],
  staffSales: [],
  summary: {
    averageOrderValue: 0,
    itemCount: 0,
    orderCount: 0,
    reversalCount: 0,
    revenue: 0,
  },
};

function assertRpcClient(client: SupabaseLike | null): Required<Pick<SupabaseLike, "rpc">> {
  if (!client?.rpc) throw new Error("Supabase is not configured");
  return client as Required<Pick<SupabaseLike, "rpc">>;
}

function isSettledInRange(order: Order, { end, start }: ReportRange): boolean {
  if (order.status !== "settled" || !order.settledAt) return false;
  const settledAt = new Date(order.settledAt);
  return settledAt >= start && settledAt < end;
}

function toMoneyValue(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toCount(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, Math.trunc(numberValue)) : 0;
}

function toPaymentReportMethod(value: unknown): PaymentReportMethod {
  return value === "unrecorded" || PAYMENT_METHODS.some((method) => method === value)
    ? value as PaymentReportMethod
    : "unrecorded";
}

function getReportOrders(orders: Order[], range: ReportRange): Order[] {
  return orders.filter((order) => isSettledInRange(order, range));
}

function getReversalCount(orders: Order[], range: ReportRange): number {
  return orders.reduce((count, order) => (
    count + (order.settlementReversals || []).filter((reversal) => {
      const reversedAt = new Date(reversal.reversedAt);
      return reversedAt >= range.start && reversedAt < range.end;
    }).length
  ), 0);
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
    .filter((item) => item.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity);
}

export function getRevenueSummary(orders: Order[], menuItems: MenuItem[]): RevenueSummary {
  return getPeriodRevenue(orders, menuItems);
}

export function getOrderRevenue(order: Order, menuItems: MenuItem[]): number {
  return getOrderTotal(order, menuItems);
}

export function getLocalRevenueReport(
  orders: Order[],
  menuItems: MenuItem[],
  range: ReportRange,
): RevenueReport {
  const reportOrders = getReportOrders(orders, range);
  const dishMap = new Map<string, DishSalesReportItem>();
  const paymentMap = new Map<PaymentReportMethod, PaymentSalesReportItem>();
  const staffMap = new Map<string, StaffSalesReportItem>();
  let revenue = 0;
  let itemCount = 0;

  reportOrders.forEach((order) => {
    const orderTotal = getOrderTotal(order, menuItems);
    revenue += orderTotal;
    const paymentMethod = order.paymentMethod || "unrecorded";
    const paymentEntry = paymentMap.get(paymentMethod) || { method: paymentMethod, orderCount: 0, revenue: 0 };
    paymentEntry.orderCount += 1;
    paymentEntry.revenue += orderTotal;
    paymentMap.set(paymentMethod, paymentEntry);
    const staffName = order.settledByName || "Unknown";
    const staffEntry = staffMap.get(staffName) || {
      name: staffName,
      orderCount: 0,
      revenue: 0,
      staffId: null,
    };
    staffEntry.orderCount += 1;
    staffEntry.revenue += orderTotal;
    staffMap.set(staffName, staffEntry);

    order.items.forEach((line) => {
      const menuItem = menuItems.find((entry) => entry.id === line.id);
      const unitPrice = line.unitPrice ?? menuItem?.price ?? 0;
      const lineRevenue = unitPrice * line.quantity;
      const entry = dishMap.get(line.id) || {
        id: line.id,
        name: line.name || menuItem?.name || line.id,
        quantity: 0,
        revenue: 0,
      };
      entry.quantity += line.quantity;
      entry.revenue += lineRevenue;
      itemCount += line.quantity;
      dishMap.set(line.id, entry);
    });
  });

  return {
    dishSales: Array.from(dishMap.values()).sort((a, b) => (
      b.quantity - a.quantity || b.revenue - a.revenue || a.name.localeCompare(b.name)
    )),
    paymentSales: Array.from(paymentMap.values()).sort((a, b) => (
      b.revenue - a.revenue || b.orderCount - a.orderCount || a.method.localeCompare(b.method)
    )),
    staffSales: Array.from(staffMap.values()).sort((a, b) => (
      b.revenue - a.revenue || b.orderCount - a.orderCount || a.name.localeCompare(b.name)
    )),
    summary: {
      averageOrderValue: reportOrders.length ? revenue / reportOrders.length : 0,
      itemCount,
      orderCount: reportOrders.length,
      reversalCount: getReversalCount(orders, range),
      revenue,
    },
  };
}

function mapRemoteReport(value: unknown): RevenueReport {
  const report = (value || {}) as RemoteRevenueReport;
  const summary = report.summary || {};

  return {
    dishSales: (report.dishSales || []).map((item) => ({
      id: String(item.id || ""),
      name: item.name || "",
      quantity: toCount(item.quantity),
      revenue: toMoneyValue(item.revenue),
    })).filter((item) => item.id && item.name),
    paymentSales: (report.paymentSales || []).map((item) => ({
      method: toPaymentReportMethod(item.method),
      orderCount: toCount(item.orderCount),
      revenue: toMoneyValue(item.revenue),
    })),
    staffSales: (report.staffSales || []).map((item) => ({
      name: item.name || "Unknown",
      orderCount: toCount(item.orderCount),
      revenue: toMoneyValue(item.revenue),
      staffId: item.staffId ?? null,
    })),
    summary: {
      averageOrderValue: toMoneyValue(summary.averageOrderValue),
      itemCount: toCount(summary.itemCount),
      orderCount: toCount(summary.orderCount),
      reversalCount: toCount(summary.reversalCount),
      revenue: toMoneyValue(summary.revenue),
    },
  };
}

export async function loadSupabaseRevenueReport(
  range: ReportRange,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<RevenueReport> {
  const { data, error } = await assertRpcClient(client).rpc("get_revenue_report", {
    range_end: range.end.toISOString(),
    range_start: range.start.toISOString(),
    target_restaurant_slug: getRestaurantSlug(),
  });
  if (error) throw error;
  return mapRemoteReport(data);
}

export async function loadRevenueReport(
  orders: Order[],
  menuItems: MenuItem[],
  range: ReportRange,
): Promise<RevenueReport> {
  if (getDataSourceMode() === "supabase") return loadSupabaseRevenueReport(range);
  return getLocalRevenueReport(orders, menuItems, range);
}

export function getEmptyRevenueReport(): RevenueReport {
  return {
    dishSales: [...EMPTY_REPORT.dishSales],
    paymentSales: [...EMPTY_REPORT.paymentSales],
    staffSales: [...EMPTY_REPORT.staffSales],
    summary: { ...EMPTY_REPORT.summary },
  };
}
