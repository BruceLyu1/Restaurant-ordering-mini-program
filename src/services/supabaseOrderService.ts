import type { MealPeriod, MenuItem, Order, OrderLine, PrinterSettings, SettlementReversal } from "../types";
import { getRestaurantSlug, supabase } from "./supabaseClient";
import type { ReverseSettlementInput, SettlementRecord, SettleOrderInput } from "./orderService";

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
  settled_at?: string | null;
  settled_by_name?: string | null;
  payment_method?: string | null;
  settlement_note?: string | null;
  status_before_settlement?: string | null;
  order_settlement_reversals?: RemoteSettlementReversalRow[];
  status?: string;
  table?: string;
  tables?: { number?: string } | { number?: string }[];
}

interface RemoteSettlementReversalRow {
  original_payment_method?: string | null;
  original_settled_at?: string | null;
  original_settled_by_name?: string | null;
  original_settlement_note?: string | null;
  reason?: string;
  restored_status?: string;
  reversed_at?: string;
  reversed_by_name?: string;
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

function mapSettlementReversal(row: RemoteSettlementReversalRow): SettlementReversal | null {
  if (
    typeof row.reason !== "string"
    || !row.reason.trim()
    || (row.restored_status !== "pending" && row.restored_status !== "printed")
    || typeof row.reversed_at !== "string"
    || typeof row.reversed_by_name !== "string"
    || !row.reversed_by_name.trim()
  ) return null;

  return {
    ...(row.original_payment_method ? { originalPaymentMethod: row.original_payment_method as SettlementReversal["originalPaymentMethod"] } : {}),
    ...(row.original_settled_at ? { originalSettledAt: row.original_settled_at } : {}),
    ...(row.original_settled_by_name ? { originalSettledByName: row.original_settled_by_name } : {}),
    ...(row.original_settlement_note ? { originalSettlementNote: row.original_settlement_note } : {}),
    reason: row.reason,
    restoredStatus: row.restored_status,
    reversedAt: row.reversed_at,
    reversedByName: row.reversed_by_name,
  };
}

function mapOrder(row: RemoteOrderRow): Order {
  const sequence = getOrderSequence(row);
  const lines = row.items || row.order_lines || [];
  const reversals = (row.order_settlement_reversals || [])
    .map(mapSettlementReversal)
    .filter((entry): entry is SettlementReversal => entry !== null)
    .sort((a, b) => new Date(a.reversedAt).getTime() - new Date(b.reversedAt).getTime());

  return {
    createdAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
    id: typeof row.id === "string" && row.id.startsWith("HO-") ? row.id : `HO-${sequence}`,
    items: lines.map(mapOrderLine),
    sequence,
    settledAt: row.settled_at || undefined,
    settledByName: row.settled_by_name || undefined,
    ...(row.payment_method ? { paymentMethod: row.payment_method as Order["paymentMethod"] } : {}),
    ...(row.settlement_note ? { settlementNote: row.settlement_note } : {}),
    ...(row.status_before_settlement === "pending" || row.status_before_settlement === "printed" ? { statusBeforeSettlement: row.status_before_settlement } : {}),
    ...(reversals.length ? { settlementReversals: reversals } : {}),
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
    .select("order_number,status,created_at,settled_at,settled_by_name,payment_method,settlement_note,status_before_settlement,tables(number),order_lines(menu_item_client_id,name,notes,quantity,unit_price_cents),order_settlement_reversals(original_payment_method,original_settled_at,original_settled_by_name,original_settlement_note,reason,restored_status,reversed_at,reversed_by_name)")
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
  status: "printed",
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<void> {
  const { error } = await assertRpcClient(client).rpc("update_order_status", {
    next_status: status,
    target_order_id: id,
    target_restaurant_slug: getRestaurantSlug(),
  });
  if (error) throw error;
}

export async function settleSupabaseOrder(
  id: string,
  input: SettleOrderInput,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<SettlementRecord> {
  const { data, error } = await assertRpcClient(client).rpc("settle_order", {
    target_order_id: id,
    target_payment_method: input.paymentMethod,
    target_restaurant_slug: getRestaurantSlug(),
    target_settlement_note: input.settlementNote?.trim() || null,
  });
  if (error) throw error;

  const settledOrder = mapOrder(data as RemoteOrderRow);
  if (settledOrder.status !== "settled" || !settledOrder.settledAt || !settledOrder.settledByName || !settledOrder.paymentMethod || !settledOrder.statusBeforeSettlement) {
    throw new Error("Settlement response is invalid");
  }
  return {
    paymentMethod: settledOrder.paymentMethod,
    settledAt: settledOrder.settledAt,
    settledByName: settledOrder.settledByName,
    settlementNote: settledOrder.settlementNote,
    statusBeforeSettlement: settledOrder.statusBeforeSettlement,
    status: "settled",
  };
}

export async function reverseSupabaseSettlement(
  id: string,
  input: ReverseSettlementInput,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<SettlementReversal> {
  const { data, error } = await assertRpcClient(client).rpc("reverse_order_settlement", {
    target_order_id: id,
    target_reason: input.reason.trim(),
    target_restaurant_slug: getRestaurantSlug(),
  });
  if (error) throw error;

  const response = data as { settlement_reversal?: RemoteSettlementReversalRow; status?: string };
  const reversal = response?.settlement_reversal ? mapSettlementReversal(response.settlement_reversal) : null;
  if (!reversal || response.status !== reversal.restoredStatus) throw new Error("Settlement reversal response is invalid");
  return reversal;
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
