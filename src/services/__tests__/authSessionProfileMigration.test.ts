import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260702016000_auth_session_profile_rpc.sql"),
  "utf8",
);

describe("auth session profile migration", () => {
  it("restores only the authenticated staff member through a secure RPC", () => {
    expect(migration).toContain("create or replace function public.get_current_staff_profile");
    expect(migration).toContain("current_user_id := (select auth.uid())");
    expect(migration).toContain("and auth_user_id = current_user_id");
    expect(migration).toContain("security definer");
  });

  it("distinguishes inactive and inaccessible staff profiles when claiming", () => {
    expect(migration).toContain("raise exception 'staff account is inactive'");
    expect(migration).toContain("raise exception 'staff profile not found'");
    expect(migration).toContain("raise exception 'staff profile is linked to another account'");
  });

  it("allows authenticated callers and revokes public or anonymous execution", () => {
    expect(migration).toContain("revoke all on function public.claim_staff_profile(text) from public, anon");
    expect(migration).toContain("revoke all on function public.get_current_staff_profile(text) from public, anon");
    expect(migration).toContain("grant execute on function public.claim_staff_profile(text) to authenticated");
    expect(migration).toContain("grant execute on function public.get_current_staff_profile(text) to authenticated");
  });
});
