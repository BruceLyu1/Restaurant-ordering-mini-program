import { create } from "zustand";
import type { Dispatch, SetStateAction } from "react";
import type { MenuItem } from "../types";
import {
  loadMenuItemsAsync,
  loadMenuItems,
  saveMenuItems,
  toggleSoldOut as toggleSoldOutService,
} from "../services/menuService";

interface MenuStore {
  items: MenuItem[];
  load: () => Promise<void>;
  toggleSoldOut: (id: string) => void;
  updateItems: Dispatch<SetStateAction<MenuItem[]>>;
}

export const useMenuStore = create<MenuStore>((set) => ({
  items: loadMenuItems(),

  load: async () => {
    set({ items: loadMenuItems() });
    set({ items: await loadMenuItemsAsync() });
  },

  toggleSoldOut: (id) => {
    set((state) => {
      const updated = toggleSoldOutService(state.items, id);
      saveMenuItems(updated);
      return { items: updated };
    });
  },

  updateItems: (nextItems) => {
    set((state) => {
      const resolved = typeof nextItems === "function" ? nextItems(state.items) : nextItems;
      saveMenuItems(resolved);
      return { items: resolved };
    });
  },
}));
