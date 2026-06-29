import { create } from "zustand";
import type { MealPeriod, MenuItem, Order, OrderLine, PrinterSettings } from "../types";
import {
  loadOrders,
  placeOrder as placeOrderService,
  resetDemoOrders,
  updateOrderStatus,
} from "../services/orderService";

interface PlaceOrderInput {
  activeMealPeriod: MealPeriod | null;
  items: OrderLine[];
  menuItems: MenuItem[];
  printerSettings: PrinterSettings;
  table: string;
}

interface OrderStore {
  orders: Order[];
  load: (menuItems: MenuItem[]) => void;
  placeOrder: (params: PlaceOrderInput) => Order | null;
  resetDemo: (menuItems: MenuItem[]) => void;
  updateStatus: (id: string, status: Order["status"], menuItems: MenuItem[]) => void;
}

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],

  load: (menuItems) => {
    set({ orders: loadOrders(menuItems) });
  },

  placeOrder: (params) => {
    const order = placeOrderService(params);
    if (order) {
      set((state) => (
        state.orders.some((entry) => entry.id === order.id)
          ? { orders: state.orders }
          : { orders: [...state.orders, order] }
      ));
    }
    return order;
  },

  resetDemo: (menuItems) => {
    resetDemoOrders();
    set({ orders: loadOrders(menuItems) });
  },

  updateStatus: (id, status, menuItems) => {
    updateOrderStatus(id, status, menuItems);
    set((state) => ({
      orders: state.orders.map((order) => (
        order.id === id ? { ...order, status } : order
      )),
    }));
  },
}));
