import { create } from "zustand";
import type { StaffMember } from "../types";
import { getDataSourceMode } from "../services/dataSource";
import {
  createStaffMember,
  loadStaff,
  loadStaffAsync,
  saveStaffAsync,
  saveStaff,
  toggleStaffActive,
} from "../services/staffService";

interface StaffStore {
  add: (member: Omit<StaffMember, "id">) => Promise<void>;
  load: () => Promise<void>;
  staff: StaffMember[];
  toggleActive: (id: number) => Promise<void>;
}

let staffSaveQueue: Promise<StaffMember[]> = Promise.resolve([]);
let pendingStaffSaves = 0;
let queuedSupabaseLoad = false;
let staffVersion = 0;
let pendingStaffMembers: { staff: StaffMember[]; version: number } | null = null;

function areStaffMembersEqual(first: StaffMember[], second: StaffMember[]): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function applyPendingStaff(staff: StaffMember[]): StaffMember[] {
  if (!pendingStaffMembers) return staff;

  if (areStaffMembersEqual(staff, pendingStaffMembers.staff)) {
    pendingStaffMembers = null;
    return staff;
  }

  return pendingStaffMembers.staff;
}

async function loadRemoteStaff(): Promise<StaffMember[]> {
  return applyPendingStaff(await loadStaffAsync());
}

export const useStaffStore = create<StaffStore>((set) => ({
  staff: getDataSourceMode() === "supabase" ? [] : loadStaff(),

  add: async (member) => {
    const previous = useStaffStore.getState().staff;
    const updated = createStaffMember(previous, member);
    await updateStaffMembers(updated, previous, set);
  },

  load: async () => {
    if (getDataSourceMode() !== "supabase") {
      set({ staff: loadStaff() });
      return;
    }

    if (pendingStaffSaves > 0) {
      queuedSupabaseLoad = true;
      return;
    }

    set({ staff: await loadRemoteStaff() });
  },

  toggleActive: async (id) => {
    const previous = useStaffStore.getState().staff;
    const updated = toggleStaffActive(previous, id);
    await updateStaffMembers(updated, previous, set);
  },
}));

async function updateStaffMembers(
  staff: StaffMember[],
  previous: StaffMember[],
  set: (state: Partial<StaffStore>) => void,
): Promise<void> {
  const shouldProtectStaff = getDataSourceMode() === "supabase";
  const version = staffVersion + 1;
  staffVersion = version;

  if (shouldProtectStaff) {
    pendingStaffMembers = { staff, version };
  }
  set({ staff });

  try {
    if (shouldProtectStaff) {
      await queueStaffSave(staff, set);
    } else {
      saveStaff(staff);
    }
  } catch (error) {
    if (pendingStaffMembers?.version === version) {
      pendingStaffMembers = null;
      if (areStaffMembersEqual(useStaffStore.getState().staff, staff)) set({ staff: previous });
    } else if (!shouldProtectStaff && areStaffMembersEqual(useStaffStore.getState().staff, staff)) {
      set({ staff: previous });
    }
    throw error;
  }
}

async function queueStaffSave(
  staff: StaffMember[],
  set: (state: Partial<StaffStore>) => void,
): Promise<void> {
  pendingStaffSaves += 1;
  const saveTask = staffSaveQueue.then(() => saveStaffAsync(staff));
  staffSaveQueue = saveTask.catch(() => []);

  try {
    await saveTask;
  } finally {
    pendingStaffSaves -= 1;
    if (pendingStaffSaves === 0 && queuedSupabaseLoad) {
      queuedSupabaseLoad = false;
      set({ staff: await loadRemoteStaff() });
    }
  }
}
