import { create } from "zustand";
import type { MealPeriod, MenuItem, Order, OrderLine, PrinterSettings } from "../types";
import {
  loadOrders,
  loadOrdersAsync,
  placeOrder as placeOrderService,
  placeOrderAsync as placeOrderServiceAsync,
  resetDemoOrders,
  updateOrderStatus,
  updateOrderStatusAsync,
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
  load: (menuItems: MenuItem[]) => Promise<void>;
  placeOrder: (params: PlaceOrderInput) => Promise<Order | null>;
  resetDemo: (menuItems: MenuItem[]) => void;
  updateStatus: (id: string, status: Order["status"], menuItems: MenuItem[]) => Promise<void>;
}

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],

  load: async (menuItems) => {
    set({ orders: loadOrders(menuItems) });
    set({ orders: await loadOrdersAsync(menuItems) });
  },

  placeOrder: async (params) => {
    const order = await placeOrderServiceAsync(params);
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

  updateStatus: async (id, status, menuItems) => {
    await updateOrderStatusAsync(id, status, menuItems);
    set((state) => ({
      orders: state.orders.map((order) => (
        order.id === id ? { ...order, status } : order
      )),
    }));
  },
}));
