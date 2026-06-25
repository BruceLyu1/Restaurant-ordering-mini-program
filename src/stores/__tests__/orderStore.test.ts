import { beforeEach, describe, expect, it } from "vitest";
import { ORDER_STORAGE_KEY, seedOrders } from "../../data/orders";
import type { MealPeriod, MenuItem, PrinterSettings } from "../../types";
import { useOrderStore } from "../orderStore";

const menuItems: MenuItem[] = [
  {
    category: "Rice",
    deleted: false,
    description: "Char siu and rice",
    id: "store-rice",
    mealPeriods: ["lunch"],
    name: "Store Rice",
    price: 68,
    soldOut: false,
  },
];

const activeMealPeriod: MealPeriod = { id: "lunch", name: "Lunch", start: "11:00", end: "17:00" };
const printerSettings: PrinterSettings = {
  autoPrint: false,
  copies: "1",
  printer: "Kitchen",
  sound: true,
};

describe("orderStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify([]));
    useOrderStore.setState({ orders: [] });
  });

  it("places an order through orderService and refreshes store state", () => {
    const order = useOrderStore.getState().placeOrder({
      activeMealPeriod,
      items: [{ id: "store-rice", name: "Store Rice", quantity: 2, unitPrice: 68 }],
      menuItems,
      printerSettings,
      table: "12",
    });

    expect(order?.status).toBe("pending");
    expect(useOrderStore.getState().orders).toHaveLength(1);
    expect(JSON.parse(window.localStorage.getItem(ORDER_STORAGE_KEY) || "[]")).toHaveLength(1);
  });

  it("updates order status and resets demo orders without reading another store", () => {
    const order = useOrderStore.getState().placeOrder({
      activeMealPeriod,
      items: [{ id: "store-rice", name: "Store Rice", quantity: 1, unitPrice: 68 }],
      menuItems,
      printerSettings,
      table: "12",
    });

    useOrderStore.getState().updateStatus(order!.id, "settled", menuItems);
    expect(useOrderStore.getState().orders[0].status).toBe("settled");

    useOrderStore.getState().resetDemo(menuItems);
    expect(useOrderStore.getState().orders).toHaveLength(seedOrders.length);
  });
});
