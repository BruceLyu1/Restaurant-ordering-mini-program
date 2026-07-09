-- Edge Function staff-account uses the service_role key to validate manager
-- permissions and create staff Auth account bindings.
-- service_role bypasses RLS, but still needs table privileges when grants were
-- narrowed to anon/authenticated in earlier hardening migrations.

grant usage on schema public to service_role;

grant select on table public.restaurants to service_role;
grant select, insert, update on table public.staff_members to service_role;
grant usage, select on all sequences in schema public to service_role;
