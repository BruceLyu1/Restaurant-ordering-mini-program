import type { StaffMember } from "../types";
import { normalizeStaffRole } from "./staffService";
import { getRestaurantSlug, supabase } from "./supabaseClient";

interface SupabaseAuthError {
  message: string;
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
  signOut: () => Promise<{ error: SupabaseAuthError | null }>;
}

interface SupabaseLike {
  auth?: SupabaseAuthLike;
  from?: (table: string) => any;
  rpc?: (fn: string, args: Record<string, unknown>) => Promise<SupabaseRpcResult>;
}

interface SupabaseSession {
  user?: SupabaseUser;
}

interface SupabaseUser {
  email?: string;
  id?: string;
}

interface StaffProfileRow {
  active: boolean | null;
  auth_user_id: string | null;
  client_id: string | null;
  email: string | null;
  id: number;
  name: string;
  role: string | null;
}

export interface SignInResult {
  session?: SupabaseSession | null;
  user?: SupabaseUser | null;
}

function assertAuthClient(client: SupabaseLike | null): Required<Pick<SupabaseLike, "auth">> {
  if (!client?.auth) throw new Error("Supabase Auth is not configured");
  return client as Required<Pick<SupabaseLike, "auth">>;
}

function assertRpcClient(client: SupabaseLike | null): Required<Pick<SupabaseLike, "rpc">> {
  if (!client?.rpc) throw new Error("Supabase is not configured");
  return client as Required<Pick<SupabaseLike, "rpc">>;
}

function assertReadClient(client: SupabaseLike | null): Required<Pick<SupabaseLike, "auth" | "from">> {
  if (!client?.auth || !client.from) throw new Error("Supabase is not configured");
  return client as Required<Pick<SupabaseLike, "auth" | "from">>;
}

function mapStaffId(row: StaffProfileRow): number {
  const clientId = Number(row.client_id);
  return Number.isFinite(clientId) && clientId > 0 ? clientId : row.id;
}

function mapStaffProfile(row: StaffProfileRow | null): StaffMember | null {
  if (!row) return null;
  return {
    active: row.active ?? true,
    authUserId: row.auth_user_id,
    email: row.email || undefined,
    id: mapStaffId(row),
    name: row.name,
    role: normalizeStaffRole(row.role || "floor"),
  };
}

export async function signInWithPassword(
  email: string,
  password: string,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<SignInResult> {
  const { data, error } = await assertAuthClient(client).auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut(client: SupabaseLike | null = supabase as SupabaseLike | null): Promise<void> {
  const { error } = await assertAuthClient(client).auth.signOut();
  if (error) throw new Error(error.message);
}

export async function claimStaffProfile(
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<StaffMember | null> {
  const { data, error } = await assertRpcClient(client).rpc("claim_staff_profile", {
    target_restaurant_slug: getRestaurantSlug(),
  });
  if (error) throw new Error(error.message);
  return mapStaffProfile(data as StaffProfileRow | null);
}

export async function loadCurrentStaffProfile(
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<StaffMember | null> {
  const authClient = assertAuthClient(client);
  const { data: sessionData, error: sessionError } = await authClient.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;

  const resolved = assertReadClient(client);
  const { data, error } = await resolved
    .from("staff_members")
    .select("id,client_id,name,email,role,active,auth_user_id")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return mapStaffProfile(data as StaffProfileRow | null);
}

export function subscribeAuthChanges(
  onChange: (session: SupabaseSession | null) => void,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): () => void {
  const { data } = assertAuthClient(client).auth.onAuthStateChange((_event, session) => {
    onChange(session);
  });

  return () => data.subscription.unsubscribe();
}
