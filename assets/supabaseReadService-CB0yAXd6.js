import { D as DEFAULT_PRINTER_SETTINGS, a as DEFAULT_RESTAURANT_SETTINGS } from './index-B330-g_S.js';
import { s as supabase } from './supabaseClient-DHMtQ5c0.js';

function assertSupabaseClient(client) {
    if (!client)
        throw new Error("Supabase is not configured");
    return client;
}
function mapLanguage(language) {
    return language === "en" ? "English" : "繁體中文";
}
function mapMealPeriods(value) {
    if (!Array.isArray(value))
        return DEFAULT_RESTAURANT_SETTINGS.mealPeriods;
    return value
        .filter((period) => (typeof period?.id === "string" &&
        typeof period?.name === "string" &&
        typeof period?.start === "string" &&
        typeof period?.end === "string"));
}
function mapMenuItem(row) {
    const imageUrl = row.image_url || (row.image_path ? `${"./"}dish-photos/${row.image_path}` : undefined);
    const mealPeriods = row.meal_periods && row.meal_periods.length > 0 ? row.meal_periods : undefined;
    return {
        category: row.category || "未分類",
        deleted: Boolean(row.deleted),
        description: row.description || "",
        id: row.client_id,
        imageUrl,
        mealPeriods,
        name: row.name,
        price: row.price_cents / 100,
        soldOut: Boolean(row.sold_out),
    };
}
async function loadSupabaseMenuItems(client = supabase) {
    const { data, error } = await assertSupabaseClient(client)
        .from("menu_items")
        .select("client_id,name,description,category,price_cents,image_path,image_url,meal_periods,sold_out,deleted,sort_order")
        .eq("deleted", false)
        .order("sort_order", { ascending: true });
    if (error)
        throw error;
    return (data || []).map(mapMenuItem);
}
async function loadSupabaseRestaurantSettings(client = supabase) {
    const db = assertSupabaseClient(client);
    const { data: restaurant, error: restaurantError } = await db
        .from("restaurants")
        .select("id,name,phone,address,default_language")
        .eq("slug", "harbour-demo")
        .single();
    if (restaurantError)
        throw restaurantError;
    const { data: settings, error: settingsError } = await db
        .from("restaurant_settings")
        .select("meal_periods")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();
    if (settingsError)
        throw settingsError;
    const restaurantRow = restaurant;
    const settingsRow = settings;
    return {
        address: restaurantRow.address || "",
        language: mapLanguage(restaurantRow.default_language),
        mealPeriods: mapMealPeriods(settingsRow?.meal_periods),
        name: restaurantRow.name,
        phone: restaurantRow.phone || "",
        pin: DEFAULT_RESTAURANT_SETTINGS.pin,
    };
}
async function loadSupabasePrinterSettings(client = supabase) {
    const { data, error } = await assertSupabaseClient(client)
        .from("printer_settings")
        .select("auto_print,sound,printer,copies")
        .eq("restaurant_id", 1)
        .maybeSingle();
    if (error)
        throw error;
    const row = data;
    if (!row)
        return DEFAULT_PRINTER_SETTINGS;
    return {
        autoPrint: row.auto_print ?? DEFAULT_PRINTER_SETTINGS.autoPrint,
        copies: String(row.copies ?? DEFAULT_PRINTER_SETTINGS.copies),
        printer: row.printer || DEFAULT_PRINTER_SETTINGS.printer,
        sound: row.sound ?? DEFAULT_PRINTER_SETTINGS.sound,
    };
}
async function loadSupabaseTables(client = supabase) {
    const { data, error } = await assertSupabaseClient(client)
        .from("tables")
        .select("number,seats,active")
        .eq("active", true)
        .order("number", { ascending: true });
    if (error)
        throw error;
    return (data || []).map((row) => ({
        number: row.number,
        seats: row.seats || 4,
        status: "available",
    }));
}

export { loadSupabaseMenuItems, loadSupabasePrinterSettings, loadSupabaseRestaurantSettings, loadSupabaseTables };
