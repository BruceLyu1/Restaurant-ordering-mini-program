
import type { Order } from "../types";

export const ORDER_STORAGE_KEY = "harbour-ordering-demo-orders";

export const seedOrders: Order[] = [
  {
    id: "HO-1001",
    sequence: 1001,
    table: "8",
    createdAt: "2026-06-02T11:36:00+08:00",
    status: "pending",
    items: [
      { id: "shrimp-dumpling", quantity: 2, unitPrice: 42 },
      { id: "mango-pomelo", quantity: 1, unitPrice: 38 },
    ],
  },
  {
    id: "HO-1002",
    sequence: 1002,
    table: "3",
    createdAt: "2026-06-02T11:41:00+08:00",
    status: "pending",
    items: [
      { id: "stir-fried-beef", quantity: 1, unitPrice: 88 },
      { id: "char-siu", quantity: 2, unitPrice: 68 },
    ],
  },
  {
    id: "HO-1003",
    sequence: 1003,
    table: "15",
    createdAt: "2026-06-02T11:48:00+08:00",
    status: "printed",
    items: [
      { id: "wonton-noodle", quantity: 2, unitPrice: 56 },
      { id: "shrimp-dumpling", quantity: 1, unitPrice: 42 },
    ],
  },
  {
    id: "HO-1004",
    sequence: 1004,
    table: "6",
    createdAt: "2026-06-02T12:02:00+08:00",
    status: "settled",
    items: [
      { id: "steamed-fish", quantity: 1, unitPrice: 138 },
      { id: "char-siu", quantity: 1, unitPrice: 68 },
      { id: "mango-pomelo", quantity: 2, unitPrice: 38 },
    ],
  },
];
