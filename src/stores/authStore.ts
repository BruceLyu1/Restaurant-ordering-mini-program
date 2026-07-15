import { create } from "zustand";
import type { StaffMember } from "../types";
import {
  AuthServiceError,
  type AuthFailureReason,
  claimStaffProfile,
  loadCurrentStaffProfile,
  signInWithPassword,
  signOut as signOutService,
  subscribeAuthChanges,
} from "../services/authService";
import { getDataSourceMode } from "../services/dataSource";

export type AuthStatus = "error" | "loading" | "signed-out" | "signed-in" | "unauthorized";

interface AuthStore {
  error: AuthFailureReason | null;
  loadSession: () => Promise<void>;
  session: unknown | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  staffProfile: StaffMember | null;
  status: AuthStatus;
  subscribe: () => () => void;
}

function getFailureReason(error: unknown): AuthFailureReason {
  return error instanceof AuthServiceError ? error.reason : "service-unavailable";
}

function getFailureStatus(reason: AuthFailureReason): AuthStatus {
  return reason === "service-unavailable" ? "error" : "unauthorized";
}

function assertActiveStaff(profile: StaffMember | null): StaffMember {
  if (!profile) throw new AuthServiceError("no-access", "Staff profile not found");
  if (!profile.active) throw new AuthServiceError("inactive", "Staff account is not active");
  return profile;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  error: null,
  session: null,
  staffProfile: null,
  status: getDataSourceMode() === "supabase" ? "loading" : "signed-in",

  loadSession: async () => {
    if (getDataSourceMode() !== "supabase") {
      set({ error: null, session: null, staffProfile: null, status: "signed-in" });
      return;
    }

    try {
      const profile = await loadCurrentStaffProfile();
      if (!profile) {
        set({ error: null, session: null, staffProfile: null, status: "signed-out" });
        return;
      }
      set({ error: null, session: null, staffProfile: assertActiveStaff(profile), status: "signed-in" });
    } catch (error) {
      const reason = getFailureReason(error);
      if (reason !== "service-unavailable") await signOutService().catch(() => undefined);
      set({ error: reason, session: null, staffProfile: null, status: getFailureStatus(reason) });
      throw error;
    }
  },

  signIn: async (email, password) => {
    set({ error: null });
    try {
      const session = await signInWithPassword(email, password);
      const profile = assertActiveStaff(await claimStaffProfile());
      set({ error: null, session, staffProfile: profile, status: "signed-in" });
    } catch (error) {
      const reason = getFailureReason(error);
      await signOutService().catch(() => undefined);
      set({ error: reason, session: null, staffProfile: null, status: getFailureStatus(reason) });
      throw error;
    }
  },

  signOut: async () => {
    await signOutService();
    set({ error: null, session: null, staffProfile: null, status: "signed-out" });
  },

  subscribe: () => subscribeAuthChanges((session) => {
    if (!session) {
      set({ error: null, session: null, staffProfile: null, status: "signed-out" });
      return;
    }
    void get().loadSession().catch((error) => console.error("Session validation failed", error));
  }),
}));
