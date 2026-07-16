import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260702017000_order_settlement_reversal.sql"), "utf8");
const accessRepairMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260702017100_grant_settlement_reversal_read_access.sql"),
  "utf8",
);

describe("settlement reversal migration", () => {
  it("preserves the pre-settlement status and immutable audit details", () => {
    expect(migration).toContain("add column if not exists status_before_settlement text");
    expect(migration).toContain("create table if not exists public.order_settlement_reversals");
    expect(migration).toContain("original_payment_method text");
    expect(migration).toContain("original_settled_at timestamptz");
    expect(migration).toContain("reason text not null check (char_length(btrim(reason)) between 1 and 500)");
    expect(migration).toContain("status_before_settlement = status");
  });

  it("uses a manager-only atomic reversal RPC", () => {
    expect(migration).toContain("create or replace function public.reverse_order_settlement");
    expect(migration).toContain("private.is_active_staff(target_restaurant_id, array['manager'])");
    expect(migration).toContain("for update");
    expect(migration).toContain("insert into public.order_settlement_reversals");
    expect(migration).toContain("settled_at = null");
    expect(migration).toContain("payment_method = null");
    expect(migration).toContain("grant select on table public.order_settlement_reversals to authenticated");
    expect(migration).toContain("revoke all on function public.reverse_order_settlement(text, text, text) from public, anon");
    expect(migration).toContain("grant execute on function public.reverse_order_settlement(text, text, text) to authenticated");
    expect(migration).toContain("notify pgrst, 'reload schema'");
  });

  it("uses the legacy printed timestamp only as a safe historical fallback", () => {
    expect(migration).toContain("case when locked_order.printed_at is null then 'pending' else 'printed' end");
  });

  it("includes an idempotent access repair for projects that already applied the reversal migration", () => {
    expect(accessRepairMigration).toContain("grant select on table public.order_settlement_reversals to authenticated");
    expect(accessRepairMigration).toContain("notify pgrst, 'reload schema'");
  });
});