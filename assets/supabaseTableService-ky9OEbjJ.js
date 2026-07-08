import { s as supabase, g as getRestaurantSlug } from './index-DI5FOoSV.js';

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
async function saveSupabaseTables(tables, client = supabase) {
    const { error } = await assertRpcClient(client).rpc("save_demo_tables", {
        tables: tables.map((table) => ({
            number: table.number,
            seats: table.seats,
        })),
        target_restaurant_slug: getRestaurantSlug(),
    });
    if (error)
        throw error;
}
function subscribeSupabaseTableChanges(onChange, client = supabase) {
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
        .channel("harbour-tables-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, scheduleRefresh);
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

export { saveSupabaseTables, subscribeSupabaseTableChanges };
