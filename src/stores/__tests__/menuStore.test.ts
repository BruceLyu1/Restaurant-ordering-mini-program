import { beforeEach, describe, expect, it } from "vitest";
import { MENU_STORAGE_KEY } from "../../data/menu";
import type { MenuItem } from "../../types";
import { useMenuStore } from "../menuStore";

const menuItem: MenuItem = {
  category: "Rice",
  deleted: false,
  description: "Char siu and rice",
  id: "store-rice",
  imageUrl: "/dish-photos/store-rice.jpg",
  mealPeriods: ["lunch"],
  name: "Store Rice",
  price: 68,
  soldOut: false,
};

describe("menuStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useMenuStore.setState({ items: [] });
  });

  it("updates menu items and persists through menuService storage", () => {
    useMenuStore.getState().updateItems([menuItem]);

    expect(useMenuStore.getState().items).toEqual([menuItem]);
    expect(JSON.parse(window.localStorage.getItem(MENU_STORAGE_KEY) || "[]")).toEqual([menuItem]);
  });

  it("toggles sold out state and persists the changed item", () => {
    useMenuStore.getState().updateItems([menuItem]);

    useMenuStore.getState().toggleSoldOut(menuItem.id);

    expect(useMenuStore.getState().items[0].soldOut).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(MENU_STORAGE_KEY) || "[]")[0].soldOut).toBe(true);
  });
});
