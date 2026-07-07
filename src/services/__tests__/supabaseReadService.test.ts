import { describe, expect, it, vi } from "vitest";
import {
  loadSupabaseMenuItems,
  loadSupabasePrinterSettings,
  loadSupabaseRestaurantSettings,
  loadSupabaseTables,
} from "../supabaseReadService";

function createQuery(rows: unknown[], error: Error | null = null) {
  const query = {
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: rows[0] ?? null, error })),
    order: vi.fn(() => query),
    single: async () => ({ data: rows[0] ?? null, error }),
    then: (resolve: (value: { data: unknown[]; error: Error | null }) => void) => (
      Promise.resolve({ data: rows, error }).then(resolve)
    ),
  };
  return query;
}

function createClient(tables: Record<string, unknown[]>) {
  return {
    from: (table: string) => ({
      select: () => createQuery(tables[table] || []),
    }),
  };
}

describe("supabaseReadService", () => {
  it("maps menu rows to local menu items", async () => {
    const client = createClient({
      menu_items: [{
        category: "飯類",
        client_id: "char-siu",
        deleted: false,
        description: "明爐叉燒",
        image_path: "char-siu.jpg",
        image_url: null,
        meal_periods: ["lunch"],
        name: "蜜汁叉燒飯",
        price_cents: 6800,
        sold_out: true,
      }],
    });

    const items = await loadSupabaseMenuItems(client);

    expect(items).toEqual([{
      category: "飯類",
      deleted: false,
      description: "明爐叉燒",
      id: "char-siu",
      imageUrl: expect.stringContaining("dish-photos/char-siu.jpg"),
      mealPeriods: ["lunch"],
      name: "蜜汁叉燒飯",
      price: 68,
      soldOut: true,
    }]);
  });

  it("treats empty meal period arrays as all-day menu items", async () => {
    const client = createClient({
      menu_items: [{
        category: "飯類",
        client_id: "all-day-rice",
        deleted: false,
        description: "全日供應",
        image_path: null,
        image_url: null,
        meal_periods: [],
        name: "全日飯",
        price_cents: 5000,
        sold_out: false,
      }],
    });

    const [item] = await loadSupabaseMenuItems(client);

    expect(item.mealPeriods).toBeUndefined();
  });

  it("maps restaurant settings from restaurant and settings rows", async () => {
    const client = createClient({
      restaurant_settings: [{
        meal_periods: [{ id: "lunch", name: "午市", start: "11:00", end: "17:00" }],
      }],
      restaurants: [{
        address: "香港灣仔",
        default_language: "zh-Hant",
        id: 7,
        name: "海港小館",
        phone: "2188 6688",
      }],
    });

    await expect(loadSupabaseRestaurantSettings(client)).resolves.toMatchObject({
      address: "香港灣仔",
      language: "繁體中文",
      mealPeriods: [{ id: "lunch", name: "午市", start: "11:00", end: "17:00" }],
      name: "海港小館",
      phone: "2188 6688",
      pin: "000000",
    });
  });

  it("maps printer settings and table rows", async () => {
    const client = createClient({
      printer_settings: [{ auto_print: false, copies: 2, printer: "Kitchen", sound: true }],
      restaurants: [{ id: 1 }],
      tables: [{ active: true, number: "01", seats: 4 }],
    });

    await expect(loadSupabasePrinterSettings(client)).resolves.toEqual({
      autoPrint: false,
      copies: "2",
      printer: "Kitchen",
      sound: true,
    });
    await expect(loadSupabaseTables(client)).resolves.toEqual([
      { number: "01", seats: 4, status: "available" },
    ]);
  });

  it("loads printer settings for the configured restaurant slug instead of a hard-coded restaurant id", async () => {
    const restaurantsQuery = createQuery([{ id: 9 }]);
    const printerQuery = createQuery([{ auto_print: true, copies: 3, printer: "Kitchen", sound: false }]);
    const client = {
      from: vi.fn((table: string) => ({
        select: () => (table === "restaurants" ? restaurantsQuery : printerQuery),
      })),
    };

    await expect(loadSupabasePrinterSettings(client)).resolves.toEqual({
      autoPrint: true,
      copies: "3",
      printer: "Kitchen",
      sound: false,
    });

    expect(restaurantsQuery.eq).toHaveBeenCalledWith("slug", "harbour-demo");
    expect(printerQuery.eq).toHaveBeenCalledWith("restaurant_id", 9);
  });
});
