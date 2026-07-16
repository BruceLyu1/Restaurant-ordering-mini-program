export interface MealPeriod {
  id: string;
  name: string;
  start: string;
  end: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl?: string;
  mealPeriods?: string[];
  soldOut: boolean;
  deleted?: boolean;
}

export interface OrderLine {
  id: string;
  name?: string;
  notes?: string;
  quantity: number;
  unitPrice?: number;
}

export interface Order {
  id: string;
  sequence: number;
  table: string;
  createdAt: string;
  status: "pending" | "printed" | "settled";
  settledAt?: string;
  settledByName?: string;
  paymentMethod?: PaymentMethod;
  settlementNote?: string;
  statusBeforeSettlement?: "pending" | "printed";
  settlementReversals?: SettlementReversal[];
  items: OrderLine[];
}

export const PAYMENT_METHODS = [
  "cash",
  "octopus",
  "credit_card",
  "wechat_pay",
  "alipay_hk",
  "fps",
  "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentReportMethod = PaymentMethod | "unrecorded";

export interface SettlementInput {
  paymentMethod: PaymentMethod;
  settlementNote?: string;
}

export interface SettlementReversalInput {
  reason: string;
}

export interface SettlementReversal {
  originalPaymentMethod?: PaymentMethod;
  originalSettledAt?: string;
  originalSettledByName?: string;
  originalSettlementNote?: string;
  reason: string;
  restoredStatus: "pending" | "printed";
  reversedAt: string;
  reversedByName: string;
}

export interface TableInfo {
  number: string;
  seats: number;
  status?: "available" | "occupied";
}

export interface StaffMember {
  id: number;
  clientId?: string;
  name: string;
  role: string;
  active: boolean;
  email?: string;
  authUserId?: string | null;
}

export interface PrinterSettings {
  autoPrint: boolean;
  sound: boolean;
  printer: string;
  copies: string;
}

export interface RestaurantSettings {
  name: string;
  phone: string;
  address: string;
  language: string;
  mealPeriods: MealPeriod[];
  pin: string;
}

export interface RevenueSummary {
  day: number;
  week: number;
  month: number;
  year: number;
}

export interface RevenueReportSummary {
  averageOrderValue: number;
  itemCount: number;
  orderCount: number;
  reversalCount: number;
  revenue: number;
}

export interface DishSalesReportItem {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface StaffSalesReportItem {
  name: string;
  orderCount: number;
  revenue: number;
  staffId?: number | null;
}

export interface PaymentSalesReportItem {
  method: PaymentReportMethod;
  orderCount: number;
  revenue: number;
}

export interface RevenueReport {
  dishSales: DishSalesReportItem[];
  paymentSales: PaymentSalesReportItem[];
  staffSales: StaffSalesReportItem[];
  summary: RevenueReportSummary;
}
