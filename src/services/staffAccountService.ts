import { getDataSourceMode } from "./dataSource";
import { getRestaurantSlug, supabase } from "./supabaseClient";

interface CreateStaffAccountInput {
  email: string;
  name: string;
  password: string;
  role: string;
}

interface SupabaseFunctionResult {
  data?: unknown;
  error: Error | { context?: unknown; message?: string } | null;
}

interface SupabaseFunctionsLike {
  functions?: {
    invoke: (name: string, options: { body: Record<string, unknown> }) => Promise<SupabaseFunctionResult>;
  };
}

function assertFunctionsClient(client: SupabaseFunctionsLike | null): Required<SupabaseFunctionsLike> {
  if (!client?.functions) throw new Error("Supabase Functions are not configured");
  return client as Required<SupabaseFunctionsLike>;
}

function getFunctionMessage(data: unknown): string | null {
  if (!data || typeof data !== "object" || !("message" in data)) return null;
  const message = (data as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : null;
}

function isReadableResponse(value: unknown): value is Response {
  return typeof Response !== "undefined" && value instanceof Response;
}

async function getErrorContextMessage(error: SupabaseFunctionResult["error"]): Promise<string | null> {
  if (!error || !("context" in error) || !isReadableResponse(error.context)) return null;

  const response = error.context;
  try {
    return getFunctionMessage(await response.clone().json());
  } catch {
    try {
      const text = await response.clone().text();
      return text.trim() || null;
    } catch {
      return null;
    }
  }
}

async function getFunctionErrorMessage(
  data: unknown,
  error: SupabaseFunctionResult["error"],
): Promise<string> {
  return getFunctionMessage(data)
    || await getErrorContextMessage(error)
    || error?.message
    || "Staff account request failed";
}

async function invokeStaffAccountAction(
  staff: CreateStaffAccountInput,
  client: SupabaseFunctionsLike | null = supabase as SupabaseFunctionsLike | null,
): Promise<void> {
  if (getDataSourceMode() !== "supabase" && client === supabase) {
    throw new Error("Staff account creation is only available in Supabase mode");
  }

  const { data, error } = await assertFunctionsClient(client).functions.invoke("staff-account", {
    body: {
      action: "create-staff-account",
      email: staff.email.trim().toLowerCase(),
      name: staff.name.trim(),
      password: staff.password,
      restaurantSlug: getRestaurantSlug(),
      role: staff.role,
    },
  });

  if (error) throw new Error(await getFunctionErrorMessage(data, error));
}

export async function createStaffAccount(
  staff: CreateStaffAccountInput,
  client?: SupabaseFunctionsLike | null,
): Promise<void> {
  return invokeStaffAccountAction(staff, client);
}
