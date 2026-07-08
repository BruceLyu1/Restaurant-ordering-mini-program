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
function parseCopies(copies) {
    return Number.parseInt(copies, 10) || 1;
}
function mapRestaurantLanguage(language) {
    return language === "English" ? "en" : "zh-Hant";
}
async function saveSupabasePrinterSettings(settings, client = supabase) {
    const { error } = await assertRpcClient(client).rpc("save_demo_printer_settings", {
        settings: {
            auto_print: settings.autoPrint,
            copies: parseCopies(settings.copies),
            printer: settings.printer,
            sound: settings.sound,
        },
        target_restaurant_slug: getRestaurantSlug(),
    });
    if (error)
        throw error;
}
async function saveSupabaseRestaurantSettings(settings, client = supabase) {
    const { error } = await assertRpcClient(client).rpc("save_demo_restaurant_settings", {
        settings: {
            address: settings.address,
            default_language: mapRestaurantLanguage(settings.language),
            meal_periods: settings.mealPeriods,
            name: settings.name,
            phone: settings.phone,
        },
        target_restaurant_slug: getRestaurantSlug(),
    });
    if (error)
        throw error;
}
function subscribeSupabaseSettingsTablesChanges(channelName, tables, onChange, client) {
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
    const channel = tables.reduce((currentChannel, table) => currentChannel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh), client.channel(channelName));
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
function subscribeSupabasePrinterSettingsChanges(onChange, client = supabase) {
    return subscribeSupabaseSettingsTablesChanges("harbour-printer-settings-realtime", ["printer_settings"], onChange, client);
}
function subscribeSupabaseRestaurantSettingsChanges(onChange, client = supabase) {
    return subscribeSupabaseSettingsTablesChanges("harbour-restaurant-settings-realtime", ["restaurants", "restaurant_settings"], onChange, client);
}

export { saveSupabasePrinterSettings, saveSupabaseRestaurantSettings, subscribeSupabasePrinterSettingsChanges, subscribeSupabaseRestaurantSettingsChanges };
