import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260702018000_daily_settlement_report.sql"),
  "utf8",
);

describe("daily settlement report migration", () => {
  it("counts reversal audit events by restaurant and reversal time", () => {
    expect(migration).toContain("from public.order_settlement_reversals");
    expect(migration).toContain("where restaurant_id = target_restaurant_id");
    expect(migration).toContain("and reversed_at >= range_start");
    expect(migration).toContain("and reversed_at < range_end");
    expect(migration).toContain("'reversalCount', reversal_summary.reversal_count");
  });

  it("keeps the manager-only report boundary and API grants", () => {
    expect(migration).toContain("private.is_active_staff(target_restaurant_id, array['manager'])");
    expect(migration).toContain("revoke all on function public.get_revenue_report(text, timestamptz, timestamptz) from public, anon");
    expect(migration).toContain("grant execute on function public.get_revenue_report(text, timestamptz, timestamptz) to authenticated");
  });

  it("adds an index for restaurant reversal-range reporting", () => {
    expect(migration).toContain("order_settlement_reversals_restaurant_reversed_at_idx");
    expect(migration).toContain("on public.order_settlement_reversals (restaurant_id, reversed_at)");
  });
});