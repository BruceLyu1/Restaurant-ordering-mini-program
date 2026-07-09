import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffMember } from "../../types";
import {
  loadSupabaseStaffMembers,
  saveSupabaseStaffMembers,
  subscribeSupabaseStaffChanges,
} from "../supabaseStaffService";

const staff: StaffMember[] = [
  { active: true, email: "alex@example.com", id: 101, name: "Alex", role: "manager" },
  { active: false, email: "casey@example.com", id: 102, name: "Casey", role: "cashier" },
];

function createRpcClient(error: Error | null = null) {
  return {
    rpc: vi.fn(async () => ({ data: null, error })),
  };
}

function createQuery(rows: unknown[], error: Error | null = null) {
  const query = {
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(async () => ({ data: rows[0] ?? null, error })),
    then: (resolve: (value: { data: unknown[]; error: Error | null }) => void) => (
      Promise.resolve({ data: rows, error }).then(resolve)
    ),
  };
  return query;
}

describe("supabaseStaffService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("saves staff through the demo RPC with stable client ids and normalized roles", async () => {
    const client = createRpcClient();

    await saveSupabaseStaffMembers([
      ...staff,
      { active: true, id: 104, name: "Legacy", role: "floor" },
      { active: true, email: "may@example.com", id: 103, name: "May", role: "Cashier" },
    ], client);

    expect(client.rpc).toHaveBeenCalledWith("save_demo_staff_members", {
      members: [
        { active: true, client_id: "101", email: "alex@example.com", name: "Alex", role: "manager" },
        { active: false, client_id: "102", email: "casey@example.com", name: "Casey", role: "cashier" },
        { active: true, client_id: "104", email: null, name: "Legacy", role: "floor" },
        { active: true, client_id: "103", email: "may@example.com", name: "May", role: "cashier" },
      ],
      target_restaurant_slug: "harbour-demo",
    });
  });

  it("preserves non-numeric Supabase client ids when saving loaded staff", async () => {
    const client = createRpcClient();

    await saveSupabaseStaffMembers([
      { active: false, authUserId: "auth-123", clientId: "auth-123", email: "new@example.com", id: 21, name: "New Staff", role: "cashier" },
    ], client);

    expect(client.rpc).toHaveBeenCalledWith("save_demo_staff_members", {
      members: [
        { active: false, client_id: "auth-123", email: "new@example.com", name: "New Staff", role: "cashier" },
      ],
      target_restaurant_slug: "harbour-demo",
    });
  });

  it("uses the configured restaurant slug when saving staff", async () => {
    vi.stubEnv("VITE_RESTAURANT_SLUG", "harbour-branch");
    const client = createRpcClient();

    await saveSupabaseStaffMembers(staff, client);

    expect(client.rpc).toHaveBeenCalledWith("save_demo_staff_members", expect.objectContaining({
      target_restaurant_slug: "harbour-branch",
    }));
  });

  it("rejects RPC errors", async () => {
    await expect(saveSupabaseStaffMembers(staff, createRpcClient(new Error("rpc failed"))))
      .rejects.toThrow("rpc failed");
  });

  it("loads staff members for the configured restaurant", async () => {
    vi.stubEnv("VITE_RESTAURANT_SLUG", "harbour-branch");
    const restaurantsQuery = createQuery([{ id: 7 }]);
    const staffQuery = createQuery([
      { active: true, auth_user_id: "auth-1", client_id: "201", email: "alex@example.com", id: 1, name: "Alex", role: "manager" },
      { active: false, auth_user_id: null, client_id: null, email: "casey@example.com", id: 2, name: "Casey", role: "floor" },
    ]);
    const client = {
      from: vi.fn((table: string) => ({
        select: () => (table === "restaurants" ? restaurantsQuery : staffQuery),
      })),
    };

    await expect(loadSupabaseStaffMembers(client)).resolves.toEqual([
      { active: true, authUserId: "auth-1", clientId: "201", email: "alex@example.com", id: 201, name: "Alex", role: "manager" },
      { active: false, authUserId: null, clientId: "2", email: "casey@example.com", id: 2, name: "Casey", role: "floor" },
    ]);
    expect(restaurantsQuery.eq).toHaveBeenCalledWith("slug", "harbour-branch");
    expect(staffQuery.eq).toHaveBeenCalledWith("restaurant_id", 7);
  });

  it("subscribes to staff_members changes with debounce and cleanup", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const channel = {
      on: vi.fn(() => channel),
      subscribe: vi.fn(),
    };
    const client = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    };

    const cleanup = subscribeSupabaseStaffChanges(callback, client);
    const calls = channel.on.mock.calls as unknown as Array<[string, { event: string; schema: string; table: string }, () => void]>;
    const [, filter, handler] = calls[0];

    expect(client.channel).toHaveBeenCalledWith("harbour-staff-realtime");
    expect(filter).toEqual({ event: "*", schema: "public", table: "staff_members" });

    handler();
    handler();
    vi.advanceTimersByTime(99);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);

    cleanup();
    handler();
    vi.advanceTimersByTime(100);
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
    expect(callback).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
