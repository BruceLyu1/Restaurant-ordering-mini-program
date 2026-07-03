import { create } from "zustand";
import type { SetStateAction } from "react";
import type { MenuItem } from "../types";
import {
  loadMenuItemsAsync,
  loadMenuItems,
  saveMenuItemsAsync,
  toggleSoldOut as toggleSoldOutService,
} from "../services/menuService";
import { getDataSourceMode } from "../services/dataSource";

interface MenuStore {
  items: MenuItem[];
  load: () => Promise<void>;
  toggleSoldOut: (id: string) => Promise<void>;
  updateItems: (nextItems: SetStateAction<MenuItem[]>) => Promise<void>;
}

let menuSaveQueue: Promise<void> = Promise.resolve();
let pendingMenuSaves = 0;
let queuedSupabaseLoad = false;
let soldOutVersion = 0;

const pendingSoldOutById = new Map<string, { soldOut: boolean; version: number }>();

function applyPendingSoldOut(items: MenuItem[]): MenuItem[] {
  return items.map((item) => {
    const pending = pendingSoldOutById.get(item.id);
    if (!pending) return item;

    if (item.soldOut === pending.soldOut) {
      pendingSoldOutById.delete(item.id);
      return item;
    }

    return { ...item, soldOut: pending.soldOut };
  });
}

function rollbackSoldOut(
  id: string,
  version: number,
  soldOut: boolean,
  get: () => MenuStore,
  set: (state: Partial<MenuStore>) => void,
): void {
  const pending = pendingSoldOutById.get(id);
  if (pending?.version !== version) return;

  pendingSoldOutById.delete(id);
  set({
    items: get().items.map((item) => (
      item.id === id && item.soldOut === pending.soldOut
        ? { ...item, soldOut }
        : item
    )),
  });
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  items: getDataSourceMode() === "supabase" ? [] : loadMenuItems(),

  load: async () => {
    if (getDataSourceMode() === "supabase") {
      if (pendingMenuSaves > 0) {
        queuedSupabaseLoad = true;
        return;
      }

      set({ items: applyPendingSoldOut(await loadMenuItemsAsync()) });
      return;
    }

    set({ items: loadMenuItems() });
  },

  toggleSoldOut: async (id) => {
    const previous = get().items;
    const updated = toggleSoldOutService(previous, id);
    const nextItem = updated.find((item) => item.id === id);
    const previousItem = previous.find((item) => item.id === id);
    const shouldProtectSoldOut = getDataSourceMode() === "supabase";
    const version = soldOutVersion + 1;
    soldOutVersion = version;

    if (shouldProtectSoldOut && nextItem) {
      pendingSoldOutById.set(id, { soldOut: nextItem.soldOut, version });
    }
    set({ items: updated });

    try {
      await queueMenuSave(updated, set);
    } catch (error) {
      if (shouldProtectSoldOut && previousItem) {
        rollbackSoldOut(id, version, previousItem.soldOut, get, set);
      } else if (get().items === updated) {
        set({ items: previous });
      }
      throw error;
    }
  },

  updateItems: async (nextItems) => {
    const previous = get().items;
    const resolved = typeof nextItems === "function" ? nextItems(previous) : nextItems;
    set({ items: resolved });

    try {
      await queueMenuSave(resolved, set);
    } catch (error) {
      if (get().items === resolved) set({ items: previous });
      throw error;
    }
  },
}));

async function queueMenuSave(
  items: MenuItem[],
  set: (state: Partial<MenuStore>) => void,
): Promise<void> {
  pendingMenuSaves += 1;
  const saveTask = menuSaveQueue.then(() => saveMenuItemsAsync(items));
  menuSaveQueue = saveTask.catch(() => undefined);

  try {
    await saveTask;
  } finally {
    pendingMenuSaves -= 1;
    if (pendingMenuSaves === 0 && queuedSupabaseLoad) {
      queuedSupabaseLoad = false;
      set({ items: applyPendingSoldOut(await loadMenuItemsAsync()) });
    }
  }
}
