import type { StaffMember } from "../types";
import { normalizeStaffRole } from "./staffService";
import { getRestaurantSlug, supabase } from "./supabaseClient";

interface SupabaseQueryResult {
  data: unknown;
  error: Error | null;
}

interface SupabaseRpcResult {
  data: unknown;
  error: Error | null;
}

interface SupabaseRealtimeChannel {
  on: (
    event: "postgres_changes",
    filter: { event: string; schema: string; table: string },
    callback: () => void,
  ) => SupabaseRealtimeChannel;
  subscribe: () => unknown;
}

interface SupabaseLike {
  channel?: (name: string) => SupabaseRealtimeChannel;
  from?: (table: string) => any;
  removeChannel?: (channel: SupabaseRealtimeChannel) => unknown;
  rpc?: (fn: string, args: Record<string, unknown>) => Promise<SupabaseRpcResult>;
}

interface RestaurantRow {
  id: number;
}

interface StaffMemberRow {
  active: boolean | null;
  auth_user_id?: string | null;
  client_id: string | null;
  email?: string | null;
  id: number;
  name: string;
  role: string | null;
}

function assertSupabaseClient(client: SupabaseLike | null): SupabaseLike {
  if (!client) throw new Error("Supabase is not configured");
  return client;
}

function assertRpcClient(client: SupabaseLike | null): Required<Pick<SupabaseLike, "rpc">> {
  const resolved = assertSupabaseClient(client);
  if (!resolved.rpc) throw new Error("Supabase is not configured");
  return resolved as Required<Pick<SupabaseLike, "rpc">>;
}

function assertReadClient(client: SupabaseLike | null): Required<Pick<SupabaseLike, "from">> {
  const resolved = assertSupabaseClient(client);
  if (!resolved.from) throw new Error("Supabase is not configured");
  return resolved as Required<Pick<SupabaseLike, "from">>;
}

function mapStaffId(row: StaffMemberRow): number {
  const clientId = Number(row.client_id);
  return Number.isFinite(clientId) && clientId > 0 ? clientId : row.id;
}

function mapStaffMember(row: StaffMemberRow): StaffMember {
  const id = mapStaffId(row);
  return {
    active: row.active ?? true,
    authUserId: row.auth_user_id ?? null,
    clientId: row.client_id || String(id),
    email: row.email || undefined,
    id,
    name: row.name,
    role: normalizeStaffRole(row.role || "floor"),
  };
}

export async function loadSupabaseStaffMembers(
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<StaffMember[]> {
  const db = assertReadClient(client);
  const { data: restaurant, error: restaurantError } = await db
    .from("restaurants")
    .select("id")
    .eq("slug", getRestaurantSlug())
    .single() as SupabaseQueryResult;
  if (restaurantError) throw restaurantError;

  const { data, error } = await db
    .from("staff_members")
    .select("id,client_id,name,email,role,active,auth_user_id")
    .eq("restaurant_id", (restaurant as RestaurantRow).id)
    .order("id", { ascending: true }) as SupabaseQueryResult;

  if (error) throw error;
  return ((data || []) as StaffMemberRow[]).map(mapStaffMember);
}

export async function saveSupabaseStaffMembers(
  staff: StaffMember[],
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<StaffMember[]> {
  const members = staff.map((member) => ({
    active: member.active,
    client_id: member.clientId || String(member.id),
    email: member.email || null,
    name: member.name,
    role: normalizeStaffRole(member.role),
  }));

  const { error } = await assertRpcClient(client).rpc("save_demo_staff_members", {
    members,
    target_restaurant_slug: getRestaurantSlug(),
  });
  if (error) throw error;

  return staff.map((member) => ({
    ...member,
    role: normalizeStaffRole(member.role),
  }));
}

export function subscribeSupabaseStaffChanges(
  onChange: () => void | Promise<void>,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): () => void {
  if (!client?.channel) return () => undefined;

  let active = true;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleRefresh = () => {
    if (!active || refreshTimer) return;

    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      if (!active) return;
      void onChange();
    }, 100);
  };

  const channel = client
    .channel("harbour-staff-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "staff_members" }, scheduleRefresh);
  channel.subscribe();

  return () => {
    active = false;
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    client.removeChannel?.(channel);
  };
}
