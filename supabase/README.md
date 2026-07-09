# Supabase Preparation

This folder contains the first database preparation work for the restaurant ordering pilot. It does not switch the app away from the current localStorage demo mode.

## v1 Scope

- Move menu items, tables, restaurant settings, printer settings, orders, order lines, staff records, and dish photos to Supabase.
- Use Supabase Auth and RLS for the back-office in Supabase mode.
- Keep the existing admin PIN only for local demo mode.
- Keep `localStorage` as the fallback data source when `VITE_DATA_SOURCE=local`.

## Environment

Copy `.env.example` to `.env.local` and fill only public front-end values:

```text
VITE_DATA_SOURCE=local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Never put a service role key in Vite environment variables.

## Migration Order

1. Apply `migrations/20260702000000_initial_restaurant_schema.sql` to a Supabase project.
2. Apply `migrations/20260702001000_grant_client_api_privileges.sql` to allow the Data API roles through to the RLS policies.
3. Apply `migrations/20260702002000_order_rpc_demo_access.sql` to enable demo order creation, order reading, and status updates.
4. Apply `migrations/20260702003000_enable_order_realtime.sql` to publish `orders` and `order_lines` changes to Supabase Realtime.
5. Apply `migrations/20260702004000_menu_write_realtime_demo.sql` to enable demo menu writes, menu Realtime, and menu photo uploads.
6. Apply `migrations/20260702005000_table_write_realtime_demo.sql` to enable demo table writes and table Realtime.
7. Apply `seed.sql` once to create the demo restaurant, tables, staff, menu items, and settings.
8. Apply `migrations/20260702006000_printer_settings_write_realtime_demo.sql` to enable printer settings writes and Realtime.
9. Apply `migrations/20260702007000_restaurant_settings_write_realtime_demo.sql` to enable restaurant settings writes and Realtime.
10. Apply `migrations/20260702008000_staff_write_realtime_demo.sql` to enable staff profile writes and Realtime.
11. Apply `migrations/20260702009000_auth_rls_staff_security.sql` to require Supabase Auth for back-office writes.
12. Apply `migrations/20260702010000_guest_table_open_orders_rpc.sql` to allow guests to read only their table's open orders.
13. Apply `migrations/20260702012000_staff_account_service_role_grants.sql` so the staff account Edge Function can read the restaurant and staff rows it validates.
14. Deploy `functions/staff-account` if managers should create staff login accounts from the dashboard.

## Staff Account Function

The dashboard can create staff Auth users through the `staff-account` Edge
Function. This function is required because Auth admin actions need a service
role secret, and that secret must never be exposed to the Vite front end.

Deploy it after the Auth/RLS migrations and `20260702012000_staff_account_service_role_grants.sql` are applied:

```powershell
supabase functions deploy staff-account
```

Set the server-side service role secret in Supabase before testing:

```powershell
supabase secrets set HARBOUR_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Use the service role key only as an Edge Function secret. Do not put it in
`.env.local`, GitHub Pages config, or any `VITE_` environment variable.
If the dashboard shows `permission denied for table restaurants`, confirm the
service role secret is set and the `20260702012000_staff_account_service_role_grants.sql`
migration has been applied to the Supabase project.

Staff account flow:

1. A manager signs in to the admin dashboard.
2. The manager enters staff name, email, role, and an initial password.
3. The Edge Function creates the Supabase Auth user and binds
   `staff_members.auth_user_id`.
4. The manager gives the email and password to the employee outside the system.
5. Disabling a staff member keeps the profile for history but prevents dashboard access.

## Rollback

Set `VITE_DATA_SOURCE=local` and rebuild to return the app to the current localStorage behavior while keeping Supabase code in place.

## Security Notes

- Every business table includes `restaurant_id`.
- RLS is enabled in the initial migration.
- Authenticated staff policies use `public.is_active_staff(...)` to avoid recursive staff RLS checks.
- Guest order policies are intentionally minimal for the pilot. Before public production use, prefer table-scoped tokens or RPC functions for order creation and table order lookup.
- `20260702002000_order_rpc_demo_access.sql` intentionally opens demo order reads and status updates for the current front-end-only PIN flow. Replace this with Supabase Auth staff policies before a real public rollout.
- `20260702003000_enable_order_realtime.sql` only publishes order table changes. The app still reloads complete orders after each event so order headers and lines stay consistent.
- `20260702004000_menu_write_realtime_demo.sql` intentionally allows demo menu writes and uploads under `dish-photos/menu/` for the current front-end-only PIN flow. Replace this with authenticated staff policies before a real public rollout.
- `20260702005000_table_write_realtime_demo.sql` intentionally allows demo table writes for the current front-end-only PIN flow. Replace this with authenticated staff policies before a real public rollout.
- `supabase/functions/staff-account` is the only place that should use the service role key for staff Auth account creation.
