import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffMember } from "../../types";
import * as authService from "../../services/authService";
import { useAuthStore } from "../authStore";

const manager: StaffMember = {
  active: true,
  authUserId: "auth-1",
  email: "alex@example.com",
  id: 1,
  name: "Alex",
  role: "manager",
};

describe("authStore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    useAuthStore.setState({
      session: null,
      staffProfile: null,
      status: "loading",
    });
  });

  it("loads a signed-in staff session", async () => {
    vi.spyOn(authService, "loadCurrentStaffProfile").mockResolvedValue(manager);

    await useAuthStore.getState().loadSession();

    expect(useAuthStore.getState()).toMatchObject({
      staffProfile: manager,
      status: "signed-in",
    });
  });

  it("signs in and claims the staff profile", async () => {
    vi.spyOn(authService, "signInWithPassword").mockResolvedValue({ user: { id: "auth-1" } });
    vi.spyOn(authService, "claimStaffProfile").mockResolvedValue(manager);

    await useAuthStore.getState().signIn("alex@example.com", "secret123");

    expect(authService.signInWithPassword).toHaveBeenCalledWith("alex@example.com", "secret123");
    expect(useAuthStore.getState()).toMatchObject({
      staffProfile: manager,
      status: "signed-in",
    });
  });

  it("marks inactive or missing staff profiles as unauthorized and signs out", async () => {
    vi.spyOn(authService, "signInWithPassword").mockResolvedValue({ user: { id: "auth-1" } });
    vi.spyOn(authService, "claimStaffProfile").mockResolvedValue({ ...manager, active: false });
    vi.spyOn(authService, "signOut").mockResolvedValue(undefined);

    await expect(useAuthStore.getState().signIn("alex@example.com", "secret123"))
      .rejects.toThrow("Staff account is not active");

    expect(authService.signOut).toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      staffProfile: null,
      status: "unauthorized",
    });
  });

  it("clears state on sign out", async () => {
    vi.spyOn(authService, "signOut").mockResolvedValue(undefined);
    useAuthStore.setState({ staffProfile: manager, status: "signed-in" });

    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState()).toMatchObject({
      staffProfile: null,
      status: "signed-out",
    });
  });
});
