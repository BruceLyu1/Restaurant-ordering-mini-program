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

function createProfile(overrides: Record<string, unknown> = {}) {
  return {
    active: true,
    auth_user_id: "auth-1",
    client_id: "201",
    email: "alex@example.com",
    id: 1,
    name: "Alex",
    role: "cashier",
    ...overrides,
  };
}

function createRpcClient(data: unknown = createProfile(), error: { code?: string; message: string; status?: number } | null = null) {
  return {
    rpc: vi.fn(async () => ({ data, error })),
  };
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

  it("classifies invalid login credentials without exposing a raw service error", async () => {
    const client = createAuthClient({
      signInWithPassword: vi.fn(async () => ({
        data: { session: null, user: null },
        error: { code: "invalid_credentials", message: "Invalid login credentials", status: 400 },
      })),
    });

    await expect(signInWithPassword("alex@example.com", "wrong-password", client))
      .rejects.toMatchObject({ reason: "invalid-credentials" });
  });

  it("claims the staff profile for the configured restaurant slug", async () => {
    vi.stubEnv("VITE_RESTAURANT_SLUG", "harbour-branch");
    const client = createRpcClient(createProfile({ client_id: "101", role: "manager" }));

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

  it("restores a cashier session through the self-profile RPC", async () => {
    const client = {
      ...createAuthClient(),
      ...createRpcClient(),
    };

    await expect(loadCurrentStaffProfile(client)).resolves.toEqual({
      active: true,
      authUserId: "auth-1",
      email: "alex@example.com",
      id: 201,
      name: "Alex",
      role: "cashier",
    });
    expect(client.rpc).toHaveBeenCalledWith("get_current_staff_profile", {
      target_restaurant_slug: "harbour-demo",
    });
  });

  it("keeps the Supabase client context when invoking RPC methods", async () => {
    const client = {
      restaurantSlug: "harbour-demo",
      rpc(this: { restaurantSlug: string }, _functionName: string, _args: Record<string, unknown>) {
        return Promise.resolve({ data: createProfile({ client_id: this.restaurantSlug === "harbour-demo" ? "201" : "0" }), error: null });
      },
    };

    await expect(claimStaffProfile(client)).resolves.toMatchObject({ id: 201 });
  });

  it("returns null when there is no current session", async () => {
    const client = {
      ...createAuthClient({
        getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      }),
      ...createRpcClient(),
    };

    await expect(loadCurrentStaffProfile(client)).resolves.toBeNull();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("classifies inactive and missing staff profile RPC failures", async () => {
    const inactiveClient = createRpcClient(null, { message: "staff account is inactive" });
    const noAccessClient = createRpcClient(null, { message: "staff profile not found" });

    await expect(claimStaffProfile(inactiveClient)).rejects.toMatchObject({ reason: "inactive" });
    await expect(claimStaffProfile(noAccessClient)).rejects.toMatchObject({ reason: "no-access" });
  });

  it("rejects malformed staff profile responses and incomplete auth clients", async () => {
    await expect(claimStaffProfile(createRpcClient({ active: true, id: "not-a-number" })))
      .rejects.toMatchObject({ reason: "service-unavailable" });
    await expect(signInWithPassword("alex@example.com", "secret123", { auth: {} } as never))
      .rejects.toMatchObject({ reason: "service-unavailable" });
  });

  it("signs out and unsubscribes auth listeners", async () => {
    const unsubscribe = vi.fn();
    const client = createAuthClient({
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe } } })),
    });

    await signOut(client);
    const cleanup = subscribeAuthChanges(vi.fn(), client);
    cleanup();

    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(unsubscribe).toHaveBeenCalled();
  });
});
