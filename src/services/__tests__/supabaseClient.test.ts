import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  createHarbourSupabaseClient,
  getRestaurantSlug,
  getSupabaseConfig,
  isSupabaseConfigured,
} from "../supabaseClient";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn((url: string, key: string, options: unknown) => ({ key, options, url })),
}));

describe("supabase client configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null config until both public Supabase values are configured", () => {
    expect(getSupabaseConfig({})).toBeNull();
    expect(getSupabaseConfig({ VITE_SUPABASE_URL: "https://example.supabase.co" })).toBeNull();
  });

  it("reads the public Supabase URL and publishable key from Vite env", () => {
    expect(getSupabaseConfig({
      VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      VITE_SUPABASE_URL: "https://example.supabase.co",
    })).toEqual({
      publishableKey: "publishable-key",
      url: "https://example.supabase.co",
    });
  });

  it("normalizes copied Data API URLs to the project root URL", () => {
    expect(getSupabaseConfig({
      VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      VITE_SUPABASE_URL: "https://example.supabase.co/rest/v1/",
    })).toEqual({
      publishableKey: "publishable-key",
      url: "https://example.supabase.co",
    });
  });

  it("reports whether Supabase is configured", () => {
    expect(isSupabaseConfigured({})).toBe(false);
    expect(isSupabaseConfigured({
      VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      VITE_SUPABASE_URL: "https://example.supabase.co",
    })).toBe(true);
  });

  it("uses harbour-demo as the default restaurant slug and trims env overrides", () => {
    expect(getRestaurantSlug({})).toBe("harbour-demo");
    expect(getRestaurantSlug({ VITE_RESTAURANT_SLUG: " harbour-branch " })).toBe("harbour-branch");
  });

  it("creates a Supabase client only when config is complete", () => {
    expect(createHarbourSupabaseClient(null)).toBeNull();

    const client = createHarbourSupabaseClient({
      publishableKey: "publishable-key",
      url: "https://example.supabase.co",
    });

    expect(client).toEqual({
      key: "publishable-key",
      options: {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
          storage: window.sessionStorage,
        },
      },
      url: "https://example.supabase.co",
    });
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "publishable-key",
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
          storage: window.sessionStorage,
        },
      },
    );
  });
});
