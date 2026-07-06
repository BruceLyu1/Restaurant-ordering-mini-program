import type { TableInfo } from "../types";
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

export async function saveSupabaseTables(
  tables: TableInfo[],
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<void> {
  const { error } = await assertRpcClient(client).rpc("save_demo_tables", {
    tables: tables.map((table) => ({
      number: table.number,
      seats: table.seats,
    })),
    target_restaurant_slug: RESTAURANT_SLUG,
  });

  if (error) throw error;
}

export function subscribeSupabaseTableChanges(
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
