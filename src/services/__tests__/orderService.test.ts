import { beforeEach, describe, expect, it } from "vitest";
import { ORDER_STORAGE_KEY } from "../../data/orders";
import type { MenuItem, Order, PrinterSettings } from "../../types";
import { listActiveOrders, listSettledOrders, loadOrders, placeOrder, updateOrderStatus } from "../orderService";

const menuItems: MenuItem[] = [
  {
    category: "飯類",
    description: "明爐叉燒、時蔬、香米飯",
    id: "rice",
    name: "叉燒飯",
    price: 68,
    soldOut: false,
    deleted: false,
    mealPeriods: ["lunch"],
  },
];

const activeMealPeriod = { id: "lunch", name: "午市", start: "11:00", end: "17:00" };
const printerSettings: PrinterSettings = { autoPrint: false, copies: "1", printer: "廚房熱敏打印機", sound: true };

describe("orderService", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify([]));
  });

  it("places, prints, and settles an order", () => {
    const order = placeOrder({
      activeMealPeriod,
      items: [{ id: "rice", name: "叉燒飯", quantity: 2, unitPrice: 68 }],
      menuItems,
      printerSettings,
      table: "02",
    });

    expect(order?.status).toBe("pending");
    expect(loadOrders(menuItems)).toHaveLength(1);

    updateOrderStatus(order!.id, "printed", menuItems);
    expect(loadOrders(menuItems)[0].status).toBe("printed");

    updateOrderStatus(order!.id, "settled", menuItems);
    expect(loadOrders(menuItems)[0].status).toBe("settled");
  });

  it("lists active orders by oldest created time first", () => {
    const orders: Order[] = [
      { id: "newer", sequence: 1001, status: "pending", table: "02", createdAt: "2026-06-23T12:00:00.000Z", items: [] },
      { id: "older", sequence: 1002, status: "printed", table: "03", createdAt: "2026-06-23T11:00:00.000Z", items: [] },
      { id: "settled", sequence: 1000, status: "settled", table: "04", createdAt: "2026-06-23T10:00:00.000Z", items: [] },
    ];

    expect(listActiveOrders(orders).map((order) => order.id)).toEqual(["older", "newer"]);
  });

  it("lists settled orders by newest created time first", () => {
    const orders: Order[] = [
      { id: "older", sequence: 1002, status: "settled", table: "02", createdAt: "2026-06-23T11:00:00.000Z", items: [] },
      { id: "newer", sequence: 1001, status: "settled", table: "03", createdAt: "2026-06-23T12:00:00.000Z", items: [] },
      { id: "active", sequence: 1000, status: "pending", table: "04", createdAt: "2026-06-23T13:00:00.000Z", items: [] },
    ];

    expect(listSettledOrders(orders).map((order) => order.id)).toEqual(["newer", "older"]);
  });
});
