import { describe, expect, it } from "vitest";
import { getMenuItem, getOrderCount, getOrderTotal } from "../order";

const menuItems = [
  { id: "rice", name: "叉燒飯", price: 68 },
  { id: "tea", name: "奶茶", price: 24 },
];

describe("order utils", () => {
  it("looks up menu items from the provided menu array", () => {
    expect(getMenuItem("tea", menuItems)?.name).toBe("奶茶");
  });

  it("calculates totals and quantities from order lines", () => {
    const order = {
      items: [
        { id: "rice", quantity: 2, unitPrice: 70 },
        { id: "tea", quantity: 1 },
      ],
    };

    expect(getOrderCount(order)).toBe(3);
    expect(getOrderTotal(order, menuItems)).toBe(164);
  });
});
