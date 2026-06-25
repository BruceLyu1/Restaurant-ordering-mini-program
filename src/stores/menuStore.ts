import { create } from "zustand";
import type { Dispatch, SetStateAction } from "react";
import type { MenuItem } from "../types";
import {
  loadMenuItems,
  saveMenuItems,
  toggleSoldOut as toggleSoldOutService,
} from "../services/menuService";

interface MenuStore {
  items: MenuItem[];
  load: () => void;
  toggleSoldOut: (id: string) => void;
  updateItems: Dispatch<SetStateAction<MenuItem[]>>;
}

export const useMenuStore = create<MenuStore>((set) => ({
  items: loadMenuItems(),

  load: () => {
    set({ items: loadMenuItems() });
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
