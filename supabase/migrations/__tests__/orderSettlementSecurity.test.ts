import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260702013000_order_settlement_staff.sql"), "utf8");

describe("order settlement security migration", () => {
  it("records the settlement staff member and name snapshot", () => {
    expect(migration).toContain("settled_by_staff_member_id bigint references public.staff_members(id) on delete restrict");
    expect(migration).toContain("add column if not exists settled_by_name text");
  });

  it("allows floor staff to print but limits settlement to managers and cashiers", () => {
    expect(migration).toContain("if next_status = 'settled' and current_staff_role not in ('manager', 'cashier') then");
    expect(migration).toContain("if next_status not in ('printed', 'settled') then");
  });

  it("prevents changing a settled order again and keeps the RPC authenticated", () => {
    expect(migration).toContain("and status <> 'settled'");
    expect(migration).toContain("revoke execute on function public.update_order_status(text, text, text) from anon");
    expect(migration).toContain("grant execute on function public.update_order_status(text, text, text) to authenticated");
  });
});
