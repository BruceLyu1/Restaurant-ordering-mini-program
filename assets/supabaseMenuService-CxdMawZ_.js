import { s as supabase, g as getRestaurantSlug } from './index-CjqRY2-P.js';

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
function assertStorageClient(client) {
    const resolved = assertSupabaseClient(client);
    if (!resolved.storage)
        throw new Error("Supabase is not configured");
    return resolved;
}
function dataUrlToBlob(dataUrl) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
    if (!match)
        throw new Error("Invalid image data URL");
    const [, contentType, base64] = match;
    const binary = globalThis.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return { blob: new Blob([bytes], { type: contentType }), contentType };
}
function createDishPhotoPath() {
    return `menu/dish-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
}
async function saveSupabaseMenuItems(items, client = supabase) {
    const { error } = await assertRpcClient(client).rpc("save_demo_menu_items", {
        items: items.map((item, index) => ({
            category: item.category,
            client_id: item.id,
            deleted: Boolean(item.deleted),
            description: item.description || "",
            image_url: item.imageUrl || null,
            meal_periods: Array.isArray(item.mealPeriods) ? item.mealPeriods : [],
            name: item.name,
            price_cents: Math.round(item.price * 100),
            sold_out: item.soldOut,
            sort_order: index + 1,
        })),
        target_restaurant_slug: getRestaurantSlug(),
    });
    if (error)
        throw error;
}
async function uploadSupabaseDishPhoto(dataUrl, client = supabase) {
    const storage = assertStorageClient(client).storage.from("dish-photos");
    const { blob } = dataUrlToBlob(dataUrl);
    const path = createDishPhotoPath();
    const { error } = await storage.upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error)
        throw error;
    return storage.getPublicUrl(path).data.publicUrl;
}
function subscribeSupabaseMenuChanges(onChange, client = supabase) {
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
        .channel("harbour-menu-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, scheduleRefresh);
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

export { saveSupabaseMenuItems, subscribeSupabaseMenuChanges, uploadSupabaseDishPhoto };
