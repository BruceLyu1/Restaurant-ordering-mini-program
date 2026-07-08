import { create } from "zustand";
import type { StaffMember } from "../types";
import {
  claimStaffProfile,
  loadCurrentStaffProfile,
  signInWithPassword,
  signOut as signOutService,
  subscribeAuthChanges,
} from "../services/authService";
import { getDataSourceMode } from "../services/dataSource";

export type AuthStatus = "loading" | "signed-out" | "signed-in" | "unauthorized";

interface AuthStore {
  loadSession: () => Promise<void>;
  session: unknown | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  staffProfile: StaffMember | null;
  status: AuthStatus;
  subscribe: () => () => void;
}

function assertActiveStaff(profile: StaffMember | null): StaffMember {
  if (!profile) throw new Error("Staff profile not found");
  if (!profile.active) throw new Error("Staff account is not active");
  return profile;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  staffProfile: null,
  status: getDataSourceMode() === "supabase" ? "loading" : "signed-in",

  loadSession: async () => {
    if (getDataSourceMode() !== "supabase") {
      set({ session: null, staffProfile: null, status: "signed-in" });
      return;
    }

    try {
      const profile = await loadCurrentStaffProfile();
      if (!profile) {
        set({ session: null, staffProfile: null, status: "signed-out" });
        return;
      }
      set({ session: null, staffProfile: assertActiveStaff(profile), status: "signed-in" });
    } catch (error) {
      set({ session: null, staffProfile: null, status: "unauthorized" });
      throw error;
    }
  },

  signIn: async (email, password) => {
    try {
      const session = await signInWithPassword(email, password);
      const profile = assertActiveStaff(await claimStaffProfile());
      set({ session, staffProfile: profile, status: "signed-in" });
    } catch (error) {
      await signOutService().catch(() => undefined);
      set({ session: null, staffProfile: null, status: "unauthorized" });
      throw error;
    }
  },

  signOut: async () => {
    await signOutService();
    set({ session: null, staffProfile: null, status: "signed-out" });
  },

  subscribe: () => subscribeAuthChanges((session) => {
    if (!session) {
      set({ session: null, staffProfile: null, status: "signed-out" });
      return;
    }
    void get().loadSession().catch(() => undefined);
  }),
}));
