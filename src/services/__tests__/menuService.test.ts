import { beforeEach, describe, expect, it, vi } from "vitest";
import { MENU_STORAGE_KEY } from "../../data/menu";
import { saveSupabaseMenuItems, uploadSupabaseDishPhoto } from "../supabaseMenuService";
import {
  createMenuItem,
  deleteMenuItem,
  loadMenuItems,
  saveMenuItems,
  saveMenuItemsAsync,
  toggleSoldOut,
  updateMenuItem,
  uploadDishPhotoAsync,
} from "../menuService";

vi.mock("../supabaseMenuService", () => ({
  saveSupabaseMenuItems: vi.fn().mockResolvedValue(undefined),
  uploadSupabaseDishPhoto: vi.fn().mockResolvedValue("https://cdn.test/dish.jpg"),
}));

describe("menuService", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_DATA_SOURCE", "local");
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

  it("saves menu items locally in local data source mode", async () => {
    const item = {
      id: "local-test",
      name: "Local Dish",
      category: "Rice",
      description: "Local",
      price: 42,
      soldOut: false,
      deleted: false,
    };

    await saveMenuItemsAsync([item]);

    expect(JSON.parse(window.localStorage.getItem(MENU_STORAGE_KEY) || "[]")[0].id).toBe(item.id);
    expect(saveSupabaseMenuItems).not.toHaveBeenCalled();
  });

  it("delegates menu saves and photo uploads to Supabase in supabase mode", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const item = {
      id: "remote-test",
      name: "Remote Dish",
      category: "Rice",
      description: "Remote",
      price: 42,
      soldOut: false,
      deleted: false,
    };

    await saveMenuItemsAsync([item]);
    await expect(uploadDishPhotoAsync("data:image/jpeg;base64,aGVsbG8=")).resolves.toBe("https://cdn.test/dish.jpg");

    expect(saveSupabaseMenuItems).toHaveBeenCalledWith([item]);
    expect(uploadSupabaseDishPhoto).toHaveBeenCalledWith("data:image/jpeg;base64,aGVsbG8=");
  });

  it("returns the original data URL for local photo uploads", async () => {
    const dataUrl = "data:image/jpeg;base64,aGVsbG8=";

    await expect(uploadDishPhotoAsync(dataUrl)).resolves.toBe(dataUrl);
    expect(uploadSupabaseDishPhoto).not.toHaveBeenCalled();
  });
});
