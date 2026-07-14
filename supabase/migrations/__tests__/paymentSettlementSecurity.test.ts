import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260702015000_payment_settlement.sql"), "utf8");

describe("payment settlement migration", () => {
  it("adds validated payment audit fields", () => {
    expect(migration).toContain("add column if not exists payment_method text");
    expect(migration).toContain("add column if not exists settlement_note text");
    expect(migration).toContain("orders_payment_method_check");
    expect(migration).toContain("orders_settlement_note_length_check");
  });

  it("uses a cashier and manager-only settlement RPC", () => {
    expect(migration).toContain("create or replace function public.settle_order");
    expect(migration).toContain("and role in ('manager', 'cashier')");
    expect(migration).toContain("revoke execute on function public.settle_order(text, text, text, text) from anon");
    expect(migration).toContain("grant execute on function public.settle_order(text, text, text, text) to authenticated");
  });

  it("prevents the generic status RPC from settling orders", () => {
    expect(migration).toContain("if next_status <> 'printed' then");
  });

  it("groups historical settlement records without a payment method", () => {
    expect(migration).toContain("coalesce(settled_orders.payment_method, 'unrecorded')");
    expect(migration).toContain("'paymentSales'");
  });
});
