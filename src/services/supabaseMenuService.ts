import type { MenuItem } from "../types";
import { getRestaurantSlug, supabase } from "./supabaseClient";

interface SupabaseRpcResult {
  data: unknown;
  error: Error | null;
}

interface SupabaseStorageUploadResult {
  data: { path?: string } | null;
  error: Error | null;
}

interface SupabaseStorageBucket {
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
  upload: (
    path: string,
    fileBody: Blob,
    options: { contentType: string; upsert: boolean },
  ) => Promise<SupabaseStorageUploadResult>;
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
  storage?: {
    from: (bucket: string) => SupabaseStorageBucket;
  };
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

function assertStorageClient(client: SupabaseLike | null): Required<Pick<SupabaseLike, "storage">> {
  const resolved = assertSupabaseClient(client);
  if (!resolved.storage) throw new Error("Supabase is not configured");
  return resolved as Required<Pick<SupabaseLike, "storage">>;
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string } {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image data URL");

  const [, contentType, base64] = match;
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return { blob: new Blob([bytes], { type: contentType }), contentType };
}

function createDishPhotoPath(): string {
  return `menu/dish-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
}

export async function saveSupabaseMenuItems(
  items: MenuItem[],
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<void> {
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

  if (error) throw error;
}

export async function uploadSupabaseDishPhoto(
  dataUrl: string,
  client: SupabaseLike | null = supabase as SupabaseLike | null,
): Promise<string> {
  const storage = assertStorageClient(client).storage.from("dish-photos");
  const { blob } = dataUrlToBlob(dataUrl);
  const path = createDishPhotoPath();
  const { error } = await storage.upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;

  return storage.getPublicUrl(path).data.publicUrl;
}

export function subscribeSupabaseMenuChanges(
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
