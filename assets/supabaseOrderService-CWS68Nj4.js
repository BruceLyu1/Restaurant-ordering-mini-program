import { s as supabase, g as getRestaurantSlug } from './index-D4soc4s-.js';

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
function getTableNumber(row) {
    if (row.table)
        return String(row.table);
    const table = Array.isArray(row.tables) ? row.tables[0] : row.tables;
    return String(table?.number || "");
}
function getOrderSequence(row) {
    const sequence = Number(row.sequence ?? row.order_number);
    if (Number.isFinite(sequence) && sequence > 0)
        return sequence;
    const id = typeof row.id === "string" ? row.id.replace(/^HO-/, "") : row.id;
    const parsedId = Number(id);
    return Number.isFinite(parsedId) ? parsedId : 0;
}
function getOrderStatus(value) {
    if (value === "printed" || value === "settled")
        return value;
    return "pending";
}
function mapOrderLine(row) {
    return {
        id: String(row.id ?? row.menu_item_client_id ?? ""),
        name: row.name,
        notes: row.notes || undefined,
        quantity: Number(row.quantity ?? 0),
        unitPrice: row.unitPrice ?? (typeof row.unit_price_cents === "number" ? row.unit_price_cents / 100 : undefined),
    };
}
function mapOrder(row) {
    const sequence = getOrderSequence(row);
    const lines = row.items || row.order_lines || [];
    return {
        createdAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
        id: typeof row.id === "string" && row.id.startsWith("HO-") ? row.id : `HO-${sequence}`,
        items: lines.map(mapOrderLine),
        sequence,
        settledAt: row.settled_at || undefined,
        settledByName: row.settled_by_name || undefined,
        status: getOrderStatus(row.status),
        table: getTableNumber(row),
    };
}
async function placeSupabaseOrder({ activeMealPeriod, items, table }, client = supabase) {
    if (items.length === 0)
        throw new Error("Cannot place an empty order");
    const { data, error } = await assertRpcClient(client).rpc("create_pending_order", {
        line_items: items.map((item) => ({
            client_id: item.id,
            notes: item.notes?.trim() || null,
            quantity: item.quantity,
        })),
        target_meal_period_id: activeMealPeriod?.id ?? null,
        target_restaurant_slug: getRestaurantSlug(),
        target_table_number: table,
    });
    if (error)
        throw error;
    return mapOrder(data);
}
async function loadSupabaseOrders(client = supabase) {
    const db = assertSupabaseClient(client);
    if (!db.from)
        throw new Error("Supabase is not configured");
    const { data, error } = await db
        .from("orders")
        .select("order_number,status,created_at,settled_at,settled_by_name,tables(number),order_lines(menu_item_client_id,name,notes,quantity,unit_price_cents)")
        .order("created_at", { ascending: true });
    if (error)
        throw error;
    return (data || []).map(mapOrder);
}
async function loadSupabaseTableOrders(tableNumber, client = supabase) {
    const { data, error } = await assertRpcClient(client).rpc("list_table_open_orders", {
        target_restaurant_slug: getRestaurantSlug(),
        target_table_number: tableNumber,
    });
    if (error)
        throw error;
    return (data || []).map(mapOrder);
}
async function updateSupabaseOrderStatus(id, status, client = supabase) {
    const { error } = await assertRpcClient(client).rpc("update_order_status", {
        next_status: status,
        target_order_id: id,
        target_restaurant_slug: getRestaurantSlug(),
    });
    if (error)
        throw error;
}
function subscribeSupabaseOrderChanges(onChange, client = supabase) {
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
        .channel("harbour-orders-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "order_lines" }, scheduleRefresh);
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

export { loadSupabaseOrders, loadSupabaseTableOrders, placeSupabaseOrder, subscribeSupabaseOrderChanges, updateSupabaseOrderStatus };
