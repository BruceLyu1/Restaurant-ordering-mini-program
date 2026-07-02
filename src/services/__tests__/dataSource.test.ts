import { describe, expect, it } from "vitest";
import { getDataSourceMode, normalizeDataSourceMode } from "../dataSource";

describe("data source mode", () => {
  it("defaults to local mode when no mode is configured", () => {
    expect(getDataSourceMode({})).toBe("local");
  });

  it("uses supabase mode when explicitly configured", () => {
    expect(getDataSourceMode({ VITE_DATA_SOURCE: "supabase" })).toBe("supabase");
  });

  it("falls back to local mode for unknown values", () => {
    expect(normalizeDataSourceMode("staging")).toBe("local");
  });
});
