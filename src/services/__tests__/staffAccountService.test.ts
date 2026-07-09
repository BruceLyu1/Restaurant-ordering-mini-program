import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStaffAccount,
} from "../staffAccountService";

function createClient(error: Error | null = null) {
  return {
    functions: {
      invoke: vi.fn(async () => ({ data: { ok: true }, error })),
    },
  };
}

function createFunctionErrorClient() {
  return {
    functions: {
      invoke: vi.fn(async () => ({
        data: { message: "permission denied for table restaurants" },
        error: { message: "Edge Function returned a non-2xx status code" },
      })),
    },
  };
}

function createFunctionHttpErrorClient() {
  return {
    functions: {
      invoke: vi.fn(async () => ({
        data: null,
        error: {
          context: new Response(JSON.stringify({ message: "staff account function is not configured" }), {
            headers: { "content-type": "application/json" },
            status: 500,
          }),
          message: "Edge Function returned a non-2xx status code",
        },
      })),
    },
  };
}

describe("staffAccountService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("creates staff accounts through the staff-account Edge Function", async () => {
    vi.stubEnv("VITE_RESTAURANT_SLUG", "harbour-branch");
    const client = createClient();

    await createStaffAccount({
      email: "Alex@Example.com",
      name: "Alex",
      password: "staff-pass-123",
      role: "cashier",
    }, client);

    expect(client.functions.invoke).toHaveBeenCalledWith("staff-account", {
      body: {
        action: "create-staff-account",
        email: "alex@example.com",
        name: "Alex",
        password: "staff-pass-123",
        restaurantSlug: "harbour-branch",
        role: "cashier",
      },
    });
  });

  it("rejects Edge Function errors", async () => {
    await expect(createStaffAccount({
      email: "alex@example.com",
      name: "Alex",
      password: "staff-pass-123",
      role: "cashier",
    }, createClient(new Error("not allowed"))))
      .rejects.toThrow("not allowed");
  });

  it("prefers Edge Function response messages over generic invoke errors", async () => {
    await expect(createStaffAccount({
      email: "alex@example.com",
      name: "Alex",
      password: "staff-pass-123",
      role: "cashier",
    }, createFunctionErrorClient()))
      .rejects.toThrow("permission denied for table restaurants");
  });

  it("reads Edge Function messages from non-2xx response context", async () => {
    await expect(createStaffAccount({
      email: "alex@example.com",
      name: "Alex",
      password: "staff-pass-123",
      role: "cashier",
    }, createFunctionHttpErrorClient()))
      .rejects.toThrow("staff account function is not configured");
  });

  it("rejects when Supabase Functions are not configured", async () => {
    await expect(createStaffAccount({
      email: "alex@example.com",
      name: "Alex",
      password: "staff-pass-123",
      role: "cashier",
    }, null)).rejects.toThrow("Supabase Functions are not configured");
  });
});
