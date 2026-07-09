import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleStaffAccountRequest } from "./handler";

function jsonRequest(body: unknown, authorization = "Bearer manager-token") {
  return new Request("https://example.functions.supabase.co/staff-account", {
    body: JSON.stringify(body),
    headers: { authorization, "content-type": "application/json" },
    method: "POST",
  });
}

function createQuery(data: unknown, error: { message: string } | null = null) {
  const query = {
    eq: vi.fn(() => query),
    insert: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error })),
    select: vi.fn(() => query),
    single: vi.fn(async () => ({ data, error })),
    update: vi.fn(() => query),
  };
  return query;
}

function createSupabaseClient(overrides: {
  authCreateError?: { message: string } | null;
  currentStaff?: unknown | null;
  staffWriteError?: { message: string } | null;
  targetStaff?: unknown | null;
} = {}) {
  const queries: Record<string, ReturnType<typeof createQuery>[]> = {};
  const auth = {
    admin: {
      createUser: vi.fn(async () => ({
        data: { user: { id: "auth-staff" } },
        error: overrides.authCreateError ?? null,
      })),
      deleteUser: vi.fn(async () => ({ data: {}, error: null })),
    },
    getUser: vi.fn(async () => ({ data: { user: { id: "auth-manager" } }, error: null })),
  };

  const from = vi.fn((table: string) => {
    const tableQueries = queries[table] ?? [];
    let query: ReturnType<typeof createQuery>;

    if (table === "restaurants") {
      query = createQuery({ id: 7 });
    } else if (table === "staff_members" && tableQueries.length === 0) {
      query = createQuery(overrides.currentStaff ?? { active: true, role: "manager" });
    } else if (table === "staff_members" && tableQueries.length === 1) {
      query = createQuery(overrides.targetStaff ?? null);
    } else if (table === "staff_members") {
      query = createQuery({ id: 12 }, overrides.staffWriteError ?? null);
    } else {
      query = createQuery(null);
    }

    tableQueries.push(query);
    queries[table] = tableQueries;
    return query;
  });

  return { auth, from, queries };
}

describe("staff-account Edge Function handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns CORS preflight responses", async () => {
    const response = await handleStaffAccountRequest(
      new Request("https://example.functions.supabase.co/staff-account", { method: "OPTIONS" }),
      { createClient: () => createSupabaseClient(), env: {} },
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("rejects callers that are not active managers", async () => {
    const response = await handleStaffAccountRequest(
      jsonRequest({
        action: "create-staff-account",
        email: "alex@example.com",
        name: "Alex",
        password: "staff-pass-123",
        role: "cashier",
      }),
      {
        createClient: () => createSupabaseClient({ currentStaff: { active: true, role: "floor" } }),
        env: { SUPABASE_SERVICE_ROLE_KEY: "service-role", SUPABASE_URL: "https://example.supabase.co" },
      },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ message: "manager permission required" });
  });

  it("uses the custom harbour service role secret when provided", async () => {
    const createClient = vi.fn(() => createSupabaseClient());

    const response = await handleStaffAccountRequest(
      jsonRequest({
        action: "create-staff-account",
        email: "alex@example.com",
        name: "Alex",
        password: "staff-pass-123",
        role: "cashier",
      }),
      {
        createClient,
        env: {
          HARBOUR_SUPABASE_SERVICE_ROLE_KEY: "custom-service-role",
          SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role",
          SUPABASE_URL: "https://example.supabase.co",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "custom-service-role",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  });

  it("returns a clear configuration error when no service role secret is available", async () => {
    const response = await handleStaffAccountRequest(
      jsonRequest({
        action: "create-staff-account",
        email: "alex@example.com",
        name: "Alex",
        password: "staff-pass-123",
        role: "cashier",
      }),
      {
        createClient: () => createSupabaseClient(),
        env: { SUPABASE_URL: "https://example.supabase.co" },
      },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      message: "staff account function is not configured",
    });
  });

  it("creates Auth users and inserts staff members for managers", async () => {
    const client = createSupabaseClient();

    const response = await handleStaffAccountRequest(
      jsonRequest({
        action: "create-staff-account",
        email: "Alex@Example.com",
        name: "Alex",
        password: "staff-pass-123",
        role: "cashier",
      }),
      {
        createClient: () => client,
        env: { SUPABASE_SERVICE_ROLE_KEY: "service-role", SUPABASE_URL: "https://example.supabase.co" },
      },
    );

    expect(response.status).toBe(200);
    expect(client.auth.admin.createUser).toHaveBeenCalledWith({
      email: "alex@example.com",
      email_confirm: true,
      password: "staff-pass-123",
      user_metadata: { name: "Alex", role: "cashier" },
    });
    expect(client.queries.staff_members[2].insert).toHaveBeenCalledWith({
      active: true,
      auth_user_id: "auth-staff",
      client_id: "auth-staff",
      email: "alex@example.com",
      name: "Alex",
      restaurant_id: 7,
      role: "cashier",
    });
    await expect(response.json()).resolves.toEqual({
      action: "create-staff-account",
      email: "alex@example.com",
      ok: true,
    });
  });

  it("updates an existing unlinked staff profile when creating the Auth user", async () => {
    const client = createSupabaseClient({
      targetStaff: { active: true, auth_user_id: null, id: 21 },
    });

    const response = await handleStaffAccountRequest(
      jsonRequest({
        action: "create-staff-account",
        email: "alex@example.com",
        name: "Alex",
        password: "staff-pass-123",
        role: "floor",
      }),
      {
        createClient: () => client,
        env: { SUPABASE_SERVICE_ROLE_KEY: "service-role", SUPABASE_URL: "https://example.supabase.co" },
      },
    );

    expect(response.status).toBe(200);
    expect(client.queries.staff_members[2].update).toHaveBeenCalledWith({
      active: true,
      auth_user_id: "auth-staff",
      email: "alex@example.com",
      name: "Alex",
      role: "floor",
    });
  });

  it("rejects missing required fields", async () => {
    const response = await handleStaffAccountRequest(
      jsonRequest({ action: "create-staff-account", email: "alex@example.com", name: "Alex", role: "cashier" }),
      {
        createClient: () => createSupabaseClient(),
        env: { SUPABASE_SERVICE_ROLE_KEY: "service-role", SUPABASE_URL: "https://example.supabase.co" },
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ message: "password is required" });
  });

  it("returns Auth creation errors", async () => {
    const response = await handleStaffAccountRequest(
      jsonRequest({
        action: "create-staff-account",
        email: "alex@example.com",
        name: "Alex",
        password: "staff-pass-123",
        role: "cashier",
      }),
      {
        createClient: () => createSupabaseClient({ authCreateError: { message: "User already registered" } }),
        env: { SUPABASE_SERVICE_ROLE_KEY: "service-role", SUPABASE_URL: "https://example.supabase.co" },
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ message: "User already registered" });
  });

  it("rejects staff profiles that are already linked", async () => {
    const response = await handleStaffAccountRequest(
      jsonRequest({
        action: "create-staff-account",
        email: "alex@example.com",
        name: "Alex",
        password: "staff-pass-123",
        role: "cashier",
      }),
      {
        createClient: () => createSupabaseClient({
          targetStaff: { active: true, auth_user_id: "auth-existing", id: 21 },
        }),
        env: { SUPABASE_SERVICE_ROLE_KEY: "service-role", SUPABASE_URL: "https://example.supabase.co" },
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ message: "staff account is already linked" });
  });

  it("rolls back the Auth user when staff binding fails", async () => {
    const client = createSupabaseClient({ staffWriteError: { message: "staff write failed" } });

    const response = await handleStaffAccountRequest(
      jsonRequest({
        action: "create-staff-account",
        email: "alex@example.com",
        name: "Alex",
        password: "staff-pass-123",
        role: "cashier",
      }),
      {
        createClient: () => client,
        env: { SUPABASE_SERVICE_ROLE_KEY: "service-role", SUPABASE_URL: "https://example.supabase.co" },
      },
    );

    expect(response.status).toBe(500);
    expect(client.auth.admin.deleteUser).toHaveBeenCalledWith("auth-staff");
    await expect(response.json()).resolves.toMatchObject({ message: "staff write failed" });
  });
});
