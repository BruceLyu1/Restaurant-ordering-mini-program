import { beforeEach, describe, expect, it } from "vitest";
import { MENU_STORAGE_KEY } from "../../data/menu";
import { createMenuItem, deleteMenuItem, loadMenuItems, saveMenuItems, toggleSoldOut, updateMenuItem } from "../menuService";

describe("menuService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads seed menu items when storage is empty", () => {
    expect(loadMenuItems().length).toBeGreaterThan(0);
  });

  it("normalizes stale persisted seed menu items", () => {
    window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify([
      { id: "char-siu", imageUrl: "", soldOut: true },
      { id: "custom-stale" },
    ]));

    const items = loadMenuItems();
    const seedItem = items.find((item) => item.id === "char-siu");
    const customItem = items.find((item) => item.id === "custom-stale");

    expect(seedItem?.name).toBe("蜜汁叉燒飯");
    expect(seedItem?.imageUrl).toContain("dish-photos/char-siu.jpg");
    expect(customItem).toMatchObject({
      category: "未分類",
      name: "未命名菜品",
      price: 0,
    });
  });

  it("updates menu item lifecycle in memory and storage", () => {
    const custom = {
      id: "custom-test",
      name: "測試菜",
      category: "小菜",
      description: "測試",
      price: 88,
      soldOut: false,
      deleted: false,
    };
    let items = createMenuItem([], custom);
    items = updateMenuItem(items, custom.id, { price: 98 });
    items = toggleSoldOut(items, custom.id);
    items = deleteMenuItem(items, custom.id);

    expect(items[0]).toMatchObject({ price: 98, soldOut: true, deleted: true });

    saveMenuItems(items);
    expect(JSON.parse(window.localStorage.getItem(MENU_STORAGE_KEY) || "[]")[0].id).toBe(custom.id);
  });
});
