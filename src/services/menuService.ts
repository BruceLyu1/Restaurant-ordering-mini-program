import { getDefaultMenuItems, MENU_STORAGE_KEY, seedMenuItems } from "../data/menu";
import type { MenuItem } from "../types";
import { getDataSourceMode } from "./dataSource";
import { readStorage, writeStorage } from "./storage";

export const MENU_CHANGE_EVENT = "harbour-menu-change";

function isUsableImageUrl(imageUrl: string): boolean {
  return Boolean(imageUrl) &&
    !imageUrl.includes("loremflickr.com") &&
    !imageUrl.startsWith("data:image/svg+xml") &&
    !imageUrl.startsWith("undefined");
}

function normalizeMenuItem(item: Partial<MenuItem>, defaultItem?: MenuItem): MenuItem {
  const savedImageUrl = typeof item.imageUrl === "string" ? item.imageUrl : "";
  const shouldUseDefaultPhoto = defaultItem && !isUsableImageUrl(savedImageUrl);

  return {
    ...(defaultItem || {}),
    ...item,
    category: String(item.category || defaultItem?.category || "未分類"),
    deleted: Boolean(item.deleted),
    description: String(item.description || defaultItem?.description || ""),
    id: String(item.id || defaultItem?.id || `custom-${Date.now()}`),
    imageUrl: shouldUseDefaultPhoto ? defaultItem.imageUrl : savedImageUrl,
    name: String(item.name || defaultItem?.name || "未命名菜品"),
    price: Number(item.price ?? defaultItem?.price ?? 0),
    soldOut: Boolean(item.soldOut),
  };
}

export function loadMenuItems(): MenuItem[] {
  const savedItems = readStorage<unknown>(MENU_STORAGE_KEY, null);
  if (!Array.isArray(savedItems)) return getDefaultMenuItems();

  const defaultItemsById = new Map(seedMenuItems.map((item) => [item.id, item]));
  const savedMenuItems = savedItems as Partial<MenuItem>[];
  const savedIds = new Set(savedMenuItems.map((item) => item.id));
  const newDefaultItems = seedMenuItems
    .filter((item) => !savedIds.has(item.id))
    .map((item) => ({ ...item, soldOut: false }));
  const mergedItems = [
    ...savedMenuItems.map((item) => {
      const defaultItem = item.id ? defaultItemsById.get(item.id) : undefined;
      return normalizeMenuItem(item, defaultItem);
    }),
    ...newDefaultItems,
  ];

  if (newDefaultItems.length > 0 || JSON.stringify(savedItems) !== JSON.stringify(mergedItems)) {
    saveMenuItems(mergedItems);
  }

  return mergedItems;
}

export async function loadMenuItemsAsync(): Promise<MenuItem[]> {
  if (getDataSourceMode() !== "supabase") return loadMenuItems();

  try {
    const { loadSupabaseMenuItems } = await import("./supabaseReadService");
    return await loadSupabaseMenuItems();
  } catch {
    return loadMenuItems();
  }
}

export function saveMenuItems(items: MenuItem[]): void {
  writeStorage(MENU_STORAGE_KEY, items, MENU_CHANGE_EVENT);
}

export function createMenuItem(items: MenuItem[], item: MenuItem): MenuItem[] {
  return [...items, item];
}

export function updateMenuItem(items: MenuItem[], id: string, updates: Partial<MenuItem>): MenuItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...updates } : item));
}

export function deleteMenuItem(items: MenuItem[], id: string): MenuItem[] {
  return updateMenuItem(items, id, { deleted: true });
}

export function toggleSoldOut(items: MenuItem[], id: string): MenuItem[] {
  return items.map((item) => (item.id === id ? { ...item, soldOut: !item.soldOut } : item));
}
