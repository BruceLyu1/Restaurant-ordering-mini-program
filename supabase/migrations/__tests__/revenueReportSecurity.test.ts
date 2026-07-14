import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260702014000_revenue_report_rpc.sql"), "utf8");

describe("revenue report security migration", () => {
  it("creates a manager-only revenue report RPC", () => {
    expect(migration).toContain("create or replace function public.get_revenue_report");
    expect(migration).toContain("private.is_active_staff(target_restaurant_id, array['manager'])");
    expect(migration).toContain("revoke execute on function public.get_revenue_report(text, timestamptz, timestamptz) from anon");
    expect(migration).toContain("grant execute on function public.get_revenue_report(text, timestamptz, timestamptz) to authenticated");
  });

  it("only reports settled orders inside the settlement time range", () => {
    expect(migration).toContain("and status = 'settled'");
    expect(migration).toContain("and settled_at >= range_start");
    expect(migration).toContain("and settled_at < range_end");
  });

  it("aggregates dish and staff sales from settlement audit data", () => {
    expect(migration).toContain("sum(order_line.quantity * order_line.unit_price_cents)");
    expect(migration).toContain("settled_orders.settled_by_staff_member_id");
    expect(migration).toContain("settled_orders.settled_by_name");
  });
});
