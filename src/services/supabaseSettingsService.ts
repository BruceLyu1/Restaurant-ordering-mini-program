import type { PrinterSettings, RestaurantSettings } from "../types";
import { supabase } from "./supabaseClient";

const RESTAURANT_SLUG = "harbour-demo";

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
  removeChannel?: (channel: SupabaseRealtimeChannel) => unknown;
  rpc?: (fn: string, args: Record<string, unknown>) => Promise<SupabaseRpcResult>;
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

function parseCopies(copies: string): number {
  return Number.parseInt(copies, 10) || 1;
}

function mapRestaurantLanguage(language: string): "zh-Hant" | "en" {
  return language === "English" ? "en" : "zh-Hant";
}

export async function saveSupabasePrinterSettings(
  settings: PrinterSettings,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<void> {
  const { error } = await assertRpcClient(client).rpc("save_demo_printer_settings", {
    settings: {
      auto_print: settings.autoPrint,
      copies: parseCopies(settings.copies),
      printer: settings.printer,
      sound: settings.sound,
    },
    target_restaurant_slug: RESTAURANT_SLUG,
  });

  if (error) throw error;
}

export async function saveSupabaseRestaurantSettings(
  settings: RestaurantSettings,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<void> {
  const { error } = await assertRpcClient(client).rpc("save_demo_restaurant_settings", {
    settings: {
      address: settings.address,
      default_language: mapRestaurantLanguage(settings.language),
      meal_periods: settings.mealPeriods,
      name: settings.name,
      phone: settings.phone,
    },
    target_restaurant_slug: RESTAURANT_SLUG,
  });

  if (error) throw error;
}

function subscribeSupabaseSettingsTablesChanges(
  channelName: string,
  tables: string[],
  onChange: () => void | Promise<void>,
  client: SupabaseLike | null,
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

  const channel = tables.reduce(
    (currentChannel, table) => currentChannel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      scheduleRefresh,
    ),
    client.channel(channelName),
  );
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

export function subscribeSupabasePrinterSettingsChanges(
  onChange: () => void | Promise<void>,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): () => void {
  return subscribeSupabaseSettingsTablesChanges(
    "harbour-printer-settings-realtime",
    ["printer_settings"],
    onChange,
    client,
  );
}

export function subscribeSupabaseRestaurantSettingsChanges(
  onChange: () => void | Promise<void>,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): () => void {
  return subscribeSupabaseSettingsTablesChanges(
    "harbour-restaurant-settings-realtime",
    ["restaurants", "restaurant_settings"],
    onChange,
    client,
  );
}
