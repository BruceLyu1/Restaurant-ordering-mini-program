import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimStaffProfile,
  loadCurrentStaffProfile,
  signInWithPassword,
  signOut,
  subscribeAuthChanges,
} from "../authService";

function createAuthClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: "auth-1", email: "alex@example.com" } } },
        error: null,
      })),
      onAuthStateChange: vi.fn((_callback: unknown) => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(async () => ({
        data: { session: { user: { id: "auth-1", email: "alex@example.com" } }, user: { id: "auth-1", email: "alex@example.com" } },
        error: null,
      })),
      signOut: vi.fn(async () => ({ error: null })),
      ...overrides,
    },
  };
}

function createQuery(row: unknown, error: Error | null = null) {
  const query = {
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: row, error })),
    select: vi.fn(() => query),
  };
  return query;
}

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("signs in with email and password", async () => {
    const client = createAuthClient();

    await expect(signInWithPassword("alex@example.com", "secret123", client)).resolves.toMatchObject({
      user: { email: "alex@example.com" },
    });

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "alex@example.com",
      password: "secret123",
    });
  });

  it("claims the staff profile for the configured restaurant slug", async () => {
    vi.stubEnv("VITE_RESTAURANT_SLUG", "harbour-branch");
    const client = {
      rpc: vi.fn(async () => ({
        data: {
          active: true,
          auth_user_id: "auth-1",
          client_id: "101",
          email: "alex@example.com",
          id: 1,
          name: "Alex",
          role: "manager",
        },
        error: null,
      })),
    };

    await expect(claimStaffProfile(client)).resolves.toEqual({
      active: true,
      authUserId: "auth-1",
      email: "alex@example.com",
      id: 101,
      name: "Alex",
      role: "manager",
    });
    expect(client.rpc).toHaveBeenCalledWith("claim_staff_profile", {
      target_restaurant_slug: "harbour-branch",
    });
  });

  it("loads the current staff profile by auth user id", async () => {
    const query = createQuery({
      active: true,
      auth_user_id: "auth-1",
      client_id: "201",
      email: "alex@example.com",
      id: 1,
      name: "Alex",
      role: "cashier",
    });
    const client = {
      ...createAuthClient(),
      from: vi.fn(() => query),
    };

    await expect(loadCurrentStaffProfile(client)).resolves.toEqual({
      active: true,
      authUserId: "auth-1",
      email: "alex@example.com",
      id: 201,
      name: "Alex",
      role: "cashier",
    });
    expect(client.from).toHaveBeenCalledWith("staff_members");
    expect(query.eq).toHaveBeenCalledWith("auth_user_id", "auth-1");
  });

  it("returns null when there is no current session", async () => {
    const client = createAuthClient({
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    });

    await expect(loadCurrentStaffProfile(client)).resolves.toBeNull();
  });

  it("signs out and unsubscribes auth listeners", async () => {
    const unsubscribe = vi.fn();
    const client = createAuthClient({
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe } } })),
    });

    await signOut(client);
    const cleanup = subscribeAuthChanges(vi.fn(), client);
    cleanup();

    expect(client.auth.signOut).toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
