import type { MealPeriod, MenuItem, Order, OrderLine, PrinterSettings } from "../types";
import { getRestaurantSlug, supabase } from "./supabaseClient";

interface PlaceSupabaseOrderInput {
  activeMealPeriod: MealPeriod | null;
  items: OrderLine[];
  menuItems: MenuItem[];
  printerSettings: PrinterSettings;
  table: string;
}

interface SupabaseRpcResult {
  data: unknown;
  error: Error | null;
}

interface SupabaseLike {
  channel?: (name: string) => SupabaseRealtimeChannel;
  from?: (table: string) => any;
  removeChannel?: (channel: SupabaseRealtimeChannel) => unknown;
  rpc?: (fn: string, args: Record<string, unknown>) => Promise<SupabaseRpcResult>;
}

interface SupabaseRealtimeChannel {
  on: (
    event: "postgres_changes",
    filter: { event: string; schema: string; table: string },
    callback: () => void,
  ) => SupabaseRealtimeChannel;
  subscribe: () => unknown;
}

interface RemoteOrderRow {
  createdAt?: string;
  created_at?: string;
  id?: number | string;
  items?: RemoteOrderLineRow[];
  order_lines?: RemoteOrderLineRow[];
  order_number?: number;
  sequence?: number;
  status?: string;
  table?: string;
  tables?: { number?: string } | { number?: string }[];
}

interface RemoteOrderLineRow {
  id?: string;
  menu_item_client_id?: string;
  name?: string;
  notes?: string | null;
  quantity?: number;
  unitPrice?: number;
  unit_price_cents?: number;
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

function getTableNumber(row: RemoteOrderRow): string {
  if (row.table) return String(row.table);
  const table = Array.isArray(row.tables) ? row.tables[0] : row.tables;
  return String(table?.number || "");
}

function getOrderSequence(row: RemoteOrderRow): number {
  const sequence = Number(row.sequence ?? row.order_number);
  if (Number.isFinite(sequence) && sequence > 0) return sequence;

  const id = typeof row.id === "string" ? row.id.replace(/^HO-/, "") : row.id;
  const parsedId = Number(id);
  return Number.isFinite(parsedId) ? parsedId : 0;
}

function getOrderStatus(value: string | undefined): Order["status"] {
  if (value === "printed" || value === "settled") return value;
  return "pending";
}

function mapOrderLine(row: RemoteOrderLineRow): OrderLine {
  return {
    id: String(row.id ?? row.menu_item_client_id ?? ""),
    name: row.name,
    notes: row.notes || undefined,
    quantity: Number(row.quantity ?? 0),
    unitPrice: row.unitPrice ?? (typeof row.unit_price_cents === "number" ? row.unit_price_cents / 100 : undefined),
  };
}

function mapOrder(row: RemoteOrderRow): Order {
  const sequence = getOrderSequence(row);
  const lines = row.items || row.order_lines || [];

  return {
    createdAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
    id: typeof row.id === "string" && row.id.startsWith("HO-") ? row.id : `HO-${sequence}`,
    items: lines.map(mapOrderLine),
    sequence,
    status: getOrderStatus(row.status),
    table: getTableNumber(row),
  };
}

export async function placeSupabaseOrder(
  { activeMealPeriod, items, table }: PlaceSupabaseOrderInput,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<Order> {
  if (items.length === 0) throw new Error("Cannot place an empty order");

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
  if (error) throw error;

  return mapOrder(data as RemoteOrderRow);
}

export async function loadSupabaseOrders(
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<Order[]> {
  const db = assertSupabaseClient(client);
  if (!db.from) throw new Error("Supabase is not configured");

  const { data, error } = await db
    .from("orders")
    .select("order_number,status,created_at,tables(number),order_lines(menu_item_client_id,name,notes,quantity,unit_price_cents)")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data || []) as RemoteOrderRow[]).map(mapOrder);
}

export async function loadSupabaseTableOrders(
  tableNumber: string,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<Order[]> {
  const { data, error } = await assertRpcClient(client).rpc("list_table_open_orders", {
    target_restaurant_slug: getRestaurantSlug(),
    target_table_number: tableNumber,
  });

  if (error) throw error;
  return ((data || []) as RemoteOrderRow[]).map(mapOrder);
}

export async function updateSupabaseOrderStatus(
  id: string,
  status: Order["status"],
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<void> {
  const { error } = await assertRpcClient(client).rpc("update_order_status", {
    next_status: status,
    target_order_id: id,
    target_restaurant_slug: getRestaurantSlug(),
  });
  if (error) throw error;
}

export function subscribeSupabaseOrderChanges(
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
