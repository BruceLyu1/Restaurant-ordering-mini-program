import { create } from "zustand";
import type { MealPeriod, MenuItem, Order, OrderLine, PrinterSettings } from "../types";
import {
  loadOrders,
  loadOrdersAsync,
  type LoadOrdersOptions,
  placeOrder as placeOrderService,
  placeOrderAsync as placeOrderServiceAsync,
  resetDemoOrders,
  reverseSettlementAsync,
  type ReverseSettlementInput,
  settleOrderAsync,
  type SettleOrderInput,
  updateOrderStatus,
  updateOrderStatusAsync,
} from "../services/orderService";
import { getDataSourceMode } from "../services/dataSource";

interface PlaceOrderInput {
  activeMealPeriod: MealPeriod | null;
  items: OrderLine[];
  menuItems: MenuItem[];
  printerSettings: PrinterSettings;
  table: string;
}

interface OrderStore {
  hasLoaded: boolean;
  loadError: string | null;
  orders: Order[];
  load: (menuItems: MenuItem[], options?: LoadOrdersOptions) => Promise<void>;
  placeOrder: (params: PlaceOrderInput) => Promise<Order | null>;
  resetDemo: (menuItems: MenuItem[]) => void;
  settle: (id: string, input: SettleOrderInput, menuItems: MenuItem[]) => Promise<void>;
  reverseSettlement: (id: string, input: ReverseSettlementInput, menuItems: MenuItem[]) => Promise<void>;
  updateStatus: (id: string, status: "printed", menuItems: MenuItem[]) => Promise<void>;
}

export const useOrderStore = create<OrderStore>((set) => ({
  hasLoaded: false,
  loadError: null,
  orders: [],

  load: async (menuItems, options = {}) => {
    try {
      const orders = getDataSourceMode() === "supabase"
        ? await loadOrdersAsync(menuItems, options)
        : loadOrders(menuItems);
      set({ hasLoaded: true, loadError: null, orders });
    } catch (error) {
      set({ loadError: "order-load-failed" });
      throw error;
    }
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

  settle: async (id, input, menuItems) => {
    const settlement = await settleOrderAsync(id, input, menuItems);
    set((state) => ({
      orders: state.orders.map((order) => (
        order.id === id ? { ...order, ...settlement } : order
      )),
    }));
  },

  reverseSettlement: async (id, input, menuItems) => {
    const reversal = await reverseSettlementAsync(id, input, menuItems);
    set((state) => ({
      orders: state.orders.map((order) => (
        order.id === id
          ? {
            ...order,
            paymentMethod: undefined,
            settledAt: undefined,
            settledByName: undefined,
            settlementNote: undefined,
            settlementReversals: [...(order.settlementReversals || []), reversal],
            status: reversal.restoredStatus,
            statusBeforeSettlement: undefined,
          }
          : order
      )),
    }));
  },
}));
