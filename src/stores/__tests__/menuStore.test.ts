import { beforeEach, describe, expect, it, vi } from "vitest";
import { MENU_STORAGE_KEY } from "../../data/menu";
import * as menuService from "../../services/menuService";
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

const secondMenuItem: MenuItem = {
  ...menuItem,
  id: "store-noodle",
  name: "Store Noodle",
};

const soldOutMenuItem: MenuItem = {
  ...menuItem,
  soldOut: true,
};

const secondSoldOutMenuItem: MenuItem = {
  ...secondMenuItem,
  soldOut: true,
};

describe("menuStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_DATA_SOURCE", "local");
    useMenuStore.setState({ items: [] });
  });

  it("updates menu items and persists through menuService storage", async () => {
    await useMenuStore.getState().updateItems([menuItem]);

    expect(useMenuStore.getState().items).toEqual([menuItem]);
    expect(JSON.parse(window.localStorage.getItem(MENU_STORAGE_KEY) || "[]")).toEqual([menuItem]);
  });

  it("toggles sold out state and persists the changed item", async () => {
    await useMenuStore.getState().updateItems([menuItem]);

    await useMenuStore.getState().toggleSoldOut(menuItem.id);

    expect(useMenuStore.getState().items[0].soldOut).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(MENU_STORAGE_KEY) || "[]")[0].soldOut).toBe(true);
  });

  it("does not publish local menu before supabase load resolves", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify([menuItem]));

    const result = useMenuStore.getState().load();

    expect(useMenuStore.getState().items).toEqual([]);
    await result;
    expect(useMenuStore.getState().items).toContainEqual(menuItem);
  });

  it("serializes rapid sold-out saves so later toggles are not overwritten", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    useMenuStore.setState({ items: [menuItem, secondMenuItem] });
    const savedItems: MenuItem[][] = [];
    const resolvers: Array<() => void> = [];
    vi.spyOn(menuService, "saveMenuItemsAsync").mockImplementation((items) => {
      savedItems.push(items);
      return new Promise<void>((resolve) => {
        resolvers.push(resolve);
      });
    });

    const firstToggle = useMenuStore.getState().toggleSoldOut(menuItem.id);
    const secondToggle = useMenuStore.getState().toggleSoldOut(secondMenuItem.id);

    expect(useMenuStore.getState().items.map((item) => item.soldOut)).toEqual([true, true]);
    await vi.waitFor(() => expect(savedItems).toHaveLength(1));
    resolvers[0]();
    await vi.waitFor(() => expect(savedItems).toHaveLength(2));

    expect(savedItems[1].map((item) => item.soldOut)).toEqual([true, true]);
    resolvers[1]();
    await Promise.all([firstToggle, secondToggle]);
    expect(useMenuStore.getState().items.map((item) => item.soldOut)).toEqual([true, true]);
  });

  it("keeps optimistic menu state when realtime load fires during a pending save", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify([menuItem]));
    useMenuStore.setState({ items: [menuItem] });
    let resolveSave: () => void = () => undefined;
    let saveStarted = false;
    vi.spyOn(menuService, "saveMenuItemsAsync").mockImplementation(() => new Promise<void>((resolve) => {
      saveStarted = true;
      resolveSave = resolve;
    }));

    const toggle = useMenuStore.getState().toggleSoldOut(menuItem.id);
    await vi.waitFor(() => expect(saveStarted).toBe(true));
    await useMenuStore.getState().load();

    expect(useMenuStore.getState().items[0].soldOut).toBe(true);
    resolveSave();
    await toggle;
    expect(useMenuStore.getState().items[0].soldOut).toBe(true);
  });

  it("keeps rapid sold-out cancellations when realtime returns stale sold-out values", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify([soldOutMenuItem, secondSoldOutMenuItem]));
    useMenuStore.setState({ items: [soldOutMenuItem, secondSoldOutMenuItem] });
    const resolvers: Array<() => void> = [];
    vi.spyOn(menuService, "saveMenuItemsAsync").mockImplementation(() => new Promise<void>((resolve) => {
      resolvers.push(resolve);
    }));

    const firstToggle = useMenuStore.getState().toggleSoldOut(menuItem.id);
    const secondToggle = useMenuStore.getState().toggleSoldOut(secondMenuItem.id);

    expect(useMenuStore.getState().items.map((item) => item.soldOut)).toEqual([false, false]);
    await vi.waitFor(() => expect(resolvers).toHaveLength(1));
    resolvers[0]();
    await vi.waitFor(() => expect(resolvers).toHaveLength(2));
    resolvers[1]();
    await Promise.all([firstToggle, secondToggle]);

    await useMenuStore.getState().load();

    expect(useMenuStore.getState().items.slice(0, 2).map((item) => item.soldOut)).toEqual([false, false]);
  });

  it("does not let an older failed toggle rollback a newer toggle for the same dish", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    useMenuStore.setState({ items: [menuItem] });
    let rejectFirstSave: (error: Error) => void = () => undefined;
    let firstSaveStarted = false;
    vi.spyOn(menuService, "saveMenuItemsAsync")
      .mockImplementationOnce(() => new Promise<void>((_resolve, reject) => {
        firstSaveStarted = true;
        rejectFirstSave = reject;
      }))
      .mockResolvedValue(undefined);

    const firstToggle = useMenuStore.getState().toggleSoldOut(menuItem.id);
    const secondToggle = useMenuStore.getState().toggleSoldOut(menuItem.id);

    expect(useMenuStore.getState().items[0].soldOut).toBe(false);
    await vi.waitFor(() => expect(firstSaveStarted).toBe(true));
    rejectFirstSave(new Error("old save failed"));
    await expect(firstToggle).rejects.toThrow("old save failed");
    await secondToggle;

    expect(useMenuStore.getState().items[0].soldOut).toBe(false);
  });

  it("rolls back optimistic menu updates when remote save fails", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    useMenuStore.setState({ items: [menuItem] });
    vi.spyOn(menuService, "saveMenuItemsAsync").mockRejectedValueOnce(new Error("save failed"));

    await expect(useMenuStore.getState().updateItems([{ ...menuItem, name: "Updated" }]))
      .rejects.toThrow("save failed");

    expect(useMenuStore.getState().items).toEqual([menuItem]);
  });
});
