import type { MealPeriod, MenuItem, PrinterSettings, RestaurantSettings, TableInfo } from "../types";
import { DEFAULT_PRINTER_SETTINGS, DEFAULT_RESTAURANT_SETTINGS } from "./settingsService";
import { supabase } from "./supabaseClient";

interface SupabaseQueryResult {
  data: unknown;
  error: Error | null;
}

interface SupabaseLike {
  from: (table: string) => any;
}

interface MenuItemRow {
  category: string | null;
  client_id: string;
  deleted: boolean | null;
  description: string | null;
  image_path: string | null;
  image_url: string | null;
  meal_periods: string[] | null;
  name: string;
  price_cents: number;
  sold_out: boolean | null;
}

interface RestaurantRow {
  address: string | null;
  default_language: string | null;
  id: number;
  name: string;
  phone: string | null;
}

interface RestaurantSettingsRow {
  meal_periods: unknown;
}

interface PrinterSettingsRow {
  auto_print: boolean | null;
  copies: number | null;
  printer: string | null;
  sound: boolean | null;
}

interface TableRow {
  active: boolean | null;
  number: string;
  seats: number | null;
}

function assertSupabaseClient(client: SupabaseLike | null): SupabaseLike {
  if (!client) throw new Error("Supabase is not configured");
  return client;
}

function mapLanguage(language: string | null): RestaurantSettings["language"] {
  return language === "en" ? "English" : "繁體中文";
}

function mapMealPeriods(value: unknown): MealPeriod[] {
  if (!Array.isArray(value)) return DEFAULT_RESTAURANT_SETTINGS.mealPeriods;

  return value
    .filter((period): period is MealPeriod => (
      typeof period?.id === "string" &&
      typeof period?.name === "string" &&
      typeof period?.start === "string" &&
      typeof period?.end === "string"
    ));
}

function mapMenuItem(row: MenuItemRow): MenuItem {
  const imageUrl = row.image_url || (row.image_path ? `${import.meta.env.BASE_URL}dish-photos/${row.image_path}` : undefined);
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

export async function loadSupabaseMenuItems(client: SupabaseLike | null = supabase as SupabaseLike | null): Promise<MenuItem[]> {
  const { data, error } = await assertSupabaseClient(client)
    .from("menu_items")
    .select("client_id,name,description,category,price_cents,image_path,image_url,meal_periods,sold_out,deleted,sort_order")
    .eq("deleted", false)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return ((data || []) as MenuItemRow[]).map(mapMenuItem);
}

export async function loadSupabaseRestaurantSettings(client: SupabaseLike | null = supabase as SupabaseLike | null): Promise<RestaurantSettings> {
  const db = assertSupabaseClient(client);
  const { data: restaurant, error: restaurantError } = await db
    .from("restaurants")
    .select("id,name,phone,address,default_language")
    .eq("slug", "harbour-demo")
    .single();
  if (restaurantError) throw restaurantError;

  const { data: settings, error: settingsError } = await db
    .from("restaurant_settings")
    .select("meal_periods")
    .eq("restaurant_id", (restaurant as RestaurantRow).id)
    .maybeSingle();
  if (settingsError) throw settingsError;

  const restaurantRow = restaurant as RestaurantRow;
  const settingsRow = settings as RestaurantSettingsRow | null;

  return {
    address: restaurantRow.address || "",
    language: mapLanguage(restaurantRow.default_language),
    mealPeriods: mapMealPeriods(settingsRow?.meal_periods),
    name: restaurantRow.name,
    phone: restaurantRow.phone || "",
    pin: DEFAULT_RESTAURANT_SETTINGS.pin,
  };
}

export async function loadSupabasePrinterSettings(client: SupabaseLike | null = supabase as SupabaseLike | null): Promise<PrinterSettings> {
  const { data, error } = await assertSupabaseClient(client)
    .from("printer_settings")
    .select("auto_print,sound,printer,copies")
    .eq("restaurant_id", 1)
    .maybeSingle();

  if (error) throw error;
  const row = data as PrinterSettingsRow | null;
  if (!row) return DEFAULT_PRINTER_SETTINGS;

  return {
    autoPrint: row.auto_print ?? DEFAULT_PRINTER_SETTINGS.autoPrint,
    copies: String(row.copies ?? DEFAULT_PRINTER_SETTINGS.copies),
    printer: row.printer || DEFAULT_PRINTER_SETTINGS.printer,
    sound: row.sound ?? DEFAULT_PRINTER_SETTINGS.sound,
  };
}

export async function loadSupabaseTables(client: SupabaseLike | null = supabase as SupabaseLike | null): Promise<TableInfo[]> {
  const { data, error } = await assertSupabaseClient(client)
    .from("tables")
    .select("number,seats,active")
    .eq("active", true)
    .order("number", { ascending: true });

  if (error) throw error;
  return ((data || []) as TableRow[]).map((row) => ({
    number: row.number,
    seats: row.seats || 4,
    status: "available",
  }));
}
