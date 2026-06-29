import { create } from "zustand";
import type { StaffMember } from "../types";
import {
  createStaffMember,
  loadStaff,
  saveStaff,
  toggleStaffActive,
} from "../services/staffService";

interface StaffStore {
  add: (member: Omit<StaffMember, "id">) => void;
  load: () => void;
  staff: StaffMember[];
  toggleActive: (id: number) => void;
}

export const useStaffStore = create<StaffStore>((set) => ({
  staff: loadStaff(),

  add: (member) => {
    set((state) => {
      const updated = createStaffMember(state.staff, member);
      saveStaff(updated);
      return { staff: updated };
    });
  },

  load: () => {
    set({ staff: loadStaff() });
  },

  toggleActive: (id) => {
    set((state) => {
      const updated = toggleStaffActive(state.staff, id);
      saveStaff(updated);
      return { staff: updated };
    });
  },
}));
