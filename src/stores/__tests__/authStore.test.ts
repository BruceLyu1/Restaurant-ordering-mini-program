import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffMember } from "../../types";
import { AuthServiceError } from "../../services/authService";
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
      error: null,
      session: null,
      staffProfile: null,
      status: "loading",
    });
  });

  it("loads a signed-in cashier session from the self-profile service", async () => {
    const cashier = { ...manager, role: "cashier" as const };
    vi.spyOn(authService, "loadCurrentStaffProfile").mockResolvedValue(cashier);

    await useAuthStore.getState().loadSession();

    expect(useAuthStore.getState()).toMatchObject({
      error: null,
      staffProfile: cashier,
      status: "signed-in",
    });
  });

  it("marks service failures as errors instead of unauthorized", async () => {
    vi.spyOn(authService, "loadCurrentStaffProfile")
      .mockRejectedValue(new AuthServiceError("service-unavailable", "network failed"));

    await expect(useAuthStore.getState().loadSession()).rejects.toThrow("network failed");

    expect(useAuthStore.getState()).toMatchObject({
      error: "service-unavailable",
      staffProfile: null,
      status: "error",
    });
  });

  it("signs in and claims the staff profile", async () => {
    vi.spyOn(authService, "signInWithPassword").mockResolvedValue({ user: { id: "auth-1" } });
    vi.spyOn(authService, "claimStaffProfile").mockResolvedValue(manager);

    await useAuthStore.getState().signIn("alex@example.com", "secret123");

    expect(authService.signInWithPassword).toHaveBeenCalledWith("alex@example.com", "secret123");
    expect(useAuthStore.getState()).toMatchObject({
      error: null,
      staffProfile: manager,
      status: "signed-in",
    });
  });

  it("reports disabled staff accounts and signs out", async () => {
    vi.spyOn(authService, "signInWithPassword").mockResolvedValue({ user: { id: "auth-1" } });
    vi.spyOn(authService, "claimStaffProfile").mockResolvedValue({ ...manager, active: false });
    vi.spyOn(authService, "signOut").mockResolvedValue(undefined);

    await expect(useAuthStore.getState().signIn("alex@example.com", "secret123"))
      .rejects.toThrow("Staff account is not active");

    expect(authService.signOut).toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      error: "inactive",
      staffProfile: null,
      status: "unauthorized",
    });
  });

  it("finishes auth subscription failures with a visible service error", async () => {
    let onChange: ((session: { user: { id: string } } | null) => void) | undefined;
    vi.spyOn(authService, "subscribeAuthChanges").mockImplementation((callback) => {
      onChange = callback as typeof onChange;
      return () => undefined;
    });
    vi.spyOn(authService, "loadCurrentStaffProfile")
      .mockRejectedValue(new AuthServiceError("service-unavailable", "network failed"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    useAuthStore.getState().subscribe();
    onChange?.({ user: { id: "auth-1" } });

    await vi.waitFor(() => expect(useAuthStore.getState()).toMatchObject({
      error: "service-unavailable",
      status: "error",
    }));
  });

  it("clears state and errors on sign out", async () => {
    vi.spyOn(authService, "signOut").mockResolvedValue(undefined);
    useAuthStore.setState({ error: "no-access", staffProfile: manager, status: "unauthorized" });

    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState()).toMatchObject({
      error: null,
      staffProfile: null,
      status: "signed-out",
    });
  });
});
