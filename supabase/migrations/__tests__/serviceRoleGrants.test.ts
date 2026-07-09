import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260702012000_staff_account_service_role_grants.sql",
);

describe("staff account service role grants migration", () => {
  it("grants the Edge Function service role enough access for staff account creation", () => {
    const sql = readFileSync(migrationPath, "utf8").replace(/\s+/g, " ").toLowerCase();

    expect(sql).toContain("grant usage on schema public to service_role");
    expect(sql).toContain("public.restaurants");
    expect(sql).toContain("grant select, insert, update on table public.staff_members to service_role");
    expect(sql).toContain("grant usage, select on all sequences in schema public to service_role");
    expect(sql).toContain("to service_role");
  });
});
