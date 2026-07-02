import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseRuntimeConfig {
  publishableKey: string;
  url: string;
}

interface SupabaseEnv {
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_URL?: string;
}

function normalizeSupabaseUrl(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

export function getSupabaseConfig(env: SupabaseEnv = import.meta.env): SupabaseRuntimeConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim();
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) return null;

  return { publishableKey, url: normalizeSupabaseUrl(url) };
}

export function isSupabaseConfigured(env: SupabaseEnv = import.meta.env): boolean {
  return getSupabaseConfig(env) !== null;
}

export function createHarbourSupabaseClient(
  config: SupabaseRuntimeConfig | null = getSupabaseConfig(),
): SupabaseClient | null {
  if (!config) return null;

  return createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
}

export const supabase = createHarbourSupabaseClient();
