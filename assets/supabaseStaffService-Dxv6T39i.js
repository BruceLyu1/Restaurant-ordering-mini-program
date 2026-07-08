import { s as supabase, n as normalizeStaffRole, g as getRestaurantSlug } from './index-CjqRY2-P.js';

function assertSupabaseClient(client) {
    if (!client)
        throw new Error("Supabase is not configured");
    return client;
}
function assertRpcClient(client) {
    const resolved = assertSupabaseClient(client);
    if (!resolved.rpc)
        throw new Error("Supabase is not configured");
    return resolved;
}
function assertReadClient(client) {
    const resolved = assertSupabaseClient(client);
    if (!resolved.from)
        throw new Error("Supabase is not configured");
    return resolved;
}
function mapStaffId(row) {
    const clientId = Number(row.client_id);
    return Number.isFinite(clientId) && clientId > 0 ? clientId : row.id;
}
function mapStaffMember(row) {
    return {
        active: row.active ?? true,
        authUserId: row.auth_user_id ?? null,
        email: row.email || undefined,
        id: mapStaffId(row),
        name: row.name,
        role: normalizeStaffRole(row.role || "floor"),
    };
}
async function loadSupabaseStaffMembers(client = supabase) {
    const db = assertReadClient(client);
    const { data: restaurant, error: restaurantError } = await db
        .from("restaurants")
        .select("id")
        .eq("slug", getRestaurantSlug())
        .single();
    if (restaurantError)
        throw restaurantError;
    const { data, error } = await db
        .from("staff_members")
        .select("id,client_id,name,email,role,active,auth_user_id")
        .eq("restaurant_id", restaurant.id)
        .order("id", { ascending: true });
    if (error)
        throw error;
    return (data || []).map(mapStaffMember);
}
async function saveSupabaseStaffMembers(staff, client = supabase) {
    const members = staff.map((member) => ({
        active: member.active,
        client_id: String(member.id),
        email: member.email || null,
        name: member.name,
        role: normalizeStaffRole(member.role),
    }));
    const { error } = await assertRpcClient(client).rpc("save_demo_staff_members", {
        members,
        target_restaurant_slug: getRestaurantSlug(),
    });
    if (error)
        throw error;
    return staff.map((member) => ({
        ...member,
        role: normalizeStaffRole(member.role),
    }));
}
function subscribeSupabaseStaffChanges(onChange, client = supabase) {
    if (!client?.channel)
        return () => undefined;
    let active = true;
    let refreshTimer = null;
    const scheduleRefresh = () => {
        if (!active || refreshTimer)
            return;
        refreshTimer = setTimeout(() => {
            refreshTimer = null;
            if (!active)
                return;
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

export { loadSupabaseStaffMembers, saveSupabaseStaffMembers, subscribeSupabaseStaffChanges };
