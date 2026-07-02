export type DataSourceMode = "local" | "supabase";

interface DataSourceEnv {
  VITE_DATA_SOURCE?: string;
}

export function normalizeDataSourceMode(value: string | undefined): DataSourceMode {
  return value === "supabase" ? "supabase" : "local";
}

export function getDataSourceMode(env: DataSourceEnv = import.meta.env): DataSourceMode {
  return normalizeDataSourceMode(env.VITE_DATA_SOURCE);
}
