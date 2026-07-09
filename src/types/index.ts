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
  items: OrderLine[];
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
