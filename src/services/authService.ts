import type { StaffMember } from "../types";
import { getRestaurantSlug, supabase } from "./supabaseClient";

interface SupabaseAuthError {
  code?: string;
  message: string;
  status?: number;
}

interface SupabaseAuthResult<T> {
  data: T;
  error: SupabaseAuthError | null;
}

interface SupabaseRpcResult {
  data: unknown;
  error: SupabaseAuthError | null;
}

interface SupabaseAuthSubscription {
  unsubscribe: () => void;
}

interface SupabaseAuthLike {
  getSession: () => Promise<SupabaseAuthResult<{ session: SupabaseSession | null }>>;
  onAuthStateChange: (
    callback: (event: string, session: SupabaseSession | null) => void,
  ) => { data: { subscription: SupabaseAuthSubscription } };
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<SupabaseAuthResult<{ session?: SupabaseSession | null; user?: SupabaseUser | null }>>;
  signOut: (options?: { scope?: "global" | "local" | "others" }) => Promise<{ error: SupabaseAuthError | null }>;
}

interface SupabaseLike {
  auth?: SupabaseAuthLike;
  rpc?: (fn: string, args: Record<string, unknown>) => Promise<SupabaseRpcResult>;
}

interface SupabaseRpcClient extends SupabaseLike {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<SupabaseRpcResult>;
}

interface SupabaseSession {
  user?: SupabaseUser;
}

interface SupabaseUser {
  email?: string;
  id?: string;
}

interface StaffProfileRow {
  active: boolean;
  auth_user_id: string | null;
  client_id: string | null;
  email: string | null;
  id: number;
  name: string;
  role: StaffMember["role"];
}

export type AuthFailureReason = "inactive" | "invalid-credentials" | "no-access" | "service-unavailable";

export class AuthServiceError extends Error {
  code?: string;
  reason: AuthFailureReason;
  status?: number;

  constructor(reason: AuthFailureReason, message: string, details: Pick<SupabaseAuthError, "code" | "status"> = {}) {
    super(message);
    this.name = "AuthServiceError";
    this.code = details.code;
    this.reason = reason;
    this.status = details.status;
  }
}

export interface SignInResult {
  session?: SupabaseSession | null;
  user?: SupabaseUser | null;
}

function getErrorDetails(error: unknown): SupabaseAuthError | null {
  if (!error || typeof error !== "object" || !("message" in error)) return null;

  const candidate = error as { code?: unknown; message?: unknown; status?: unknown };
  if (typeof candidate.message !== "string") return null;
  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    message: candidate.message,
    status: typeof candidate.status === "number" ? candidate.status : undefined,
  };
}

function createAuthServiceError(error: unknown, reason: AuthFailureReason): AuthServiceError {
  if (error instanceof AuthServiceError) return error;

  const details = getErrorDetails(error);
  return new AuthServiceError(reason, details?.message || "Supabase authentication request failed", details || {});
}

function classifySignInError(error: SupabaseAuthError): AuthFailureReason {
  const message = error.message.toLowerCase();
  if (
    error.code === "invalid_credentials"
    || error.status === 400
    || error.status === 401
    || message.includes("invalid login credentials")
  ) {
    return "invalid-credentials";
  }
  return "service-unavailable";
}

function classifyStaffProfileError(error: SupabaseAuthError): AuthFailureReason {
  const message = error.message.toLowerCase();
  if (message.includes("staff account is inactive")) return "inactive";
  if (
    message.includes("staff profile not found")
    || message.includes("staff profile is linked")
    || message.includes("authenticated email is required")
    || message.includes("authenticated user is required")
  ) {
    return "no-access";
  }
  return "service-unavailable";
}

function assertAuthClient(client: SupabaseLike | null): SupabaseAuthLike {
  const auth = client?.auth;
  if (!auth) throw new AuthServiceError("service-unavailable", "Supabase Auth is not configured");
  if (
    typeof auth.getSession !== "function"
    || typeof auth.onAuthStateChange !== "function"
    || typeof auth.signInWithPassword !== "function"
    || typeof auth.signOut !== "function"
  ) {
    throw new AuthServiceError("service-unavailable", "Supabase Auth client is incomplete");
  }
  return auth;
}

function isSupabaseRpcClient(client: SupabaseLike | null): client is SupabaseRpcClient {
  return typeof client?.rpc === "function";
}

function assertRpcClient(client: SupabaseLike | null): SupabaseRpcClient {
  if (!isSupabaseRpcClient(client)) {
    throw new AuthServiceError("service-unavailable", "Supabase RPC client is not configured");
  }
  return client;
}

function isStaffRole(value: unknown): value is StaffMember["role"] {
  return value === "manager" || value === "cashier" || value === "floor";
}

function mapStaffId(row: StaffProfileRow): number {
  const clientId = Number(row.client_id);
  return Number.isFinite(clientId) && clientId > 0 ? clientId : row.id;
}

function mapStaffProfile(data: unknown): StaffMember {
  if (!data || typeof data !== "object") {
    throw new AuthServiceError("service-unavailable", "Invalid staff profile returned from server");
  }

  const row = data as Partial<StaffProfileRow>;
  if (
    typeof row.active !== "boolean"
    || typeof row.id !== "number"
    || !Number.isFinite(row.id)
    || row.id <= 0
    || typeof row.name !== "string"
    || !row.name.trim()
    || !isStaffRole(row.role)
    || (row.auth_user_id !== null && typeof row.auth_user_id !== "string")
    || (row.client_id !== null && typeof row.client_id !== "string")
    || (row.email !== null && typeof row.email !== "string")
  ) {
    throw new AuthServiceError("service-unavailable", "Invalid staff profile returned from server");
  }

  return {
    active: row.active,
    authUserId: row.auth_user_id,
    email: row.email || undefined,
    id: mapStaffId(row as StaffProfileRow),
    name: row.name,
    role: row.role,
  };
}

async function requestStaffProfile(
  functionName: "claim_staff_profile" | "get_current_staff_profile",
  client: SupabaseLike | null,
): Promise<StaffMember> {
  const rpcClient = assertRpcClient(client);
  const { data, error } = await rpcClient.rpc(functionName, {
    target_restaurant_slug: getRestaurantSlug(),
  });
  if (error) throw createAuthServiceError(error, classifyStaffProfileError(error));
  return mapStaffProfile(data);
}

export async function signInWithPassword(
  email: string,
  password: string,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<SignInResult> {
  const auth = assertAuthClient(client);
  const { data, error } = await auth.signInWithPassword({ email, password });
  if (error) throw createAuthServiceError(error, classifySignInError(error));
  return data;
}

export async function signOut(client: SupabaseLike | null = supabase as SupabaseLike | null): Promise<void> {
  const { error } = await assertAuthClient(client).signOut({ scope: "local" });
  if (error) throw createAuthServiceError(error, "service-unavailable");
}

export async function claimStaffProfile(
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<StaffMember> {
  return requestStaffProfile("claim_staff_profile", client);
}

export async function loadCurrentStaffProfile(
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<StaffMember | null> {
  const auth = assertAuthClient(client);
  const { data, error } = await auth.getSession();
  if (error) throw createAuthServiceError(error, error.status === 401 ? "no-access" : "service-unavailable");
  if (!data.session?.user?.id) return null;
  return requestStaffProfile("get_current_staff_profile", client);
}

export function subscribeAuthChanges(
  onChange: (session: SupabaseSession | null) => void,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): () => void {
  const { data } = assertAuthClient(client).onAuthStateChange((_event, session) => {
    onChange(session);
  });

  return () => data.subscription.unsubscribe();
}
