# Supabase Preparation

This folder contains the first database preparation work for the restaurant ordering pilot. It does not switch the app away from the current localStorage demo mode.

## v1 Scope

- Move menu items, tables, restaurant settings, printer settings, orders, order lines, staff records, and dish photos to Supabase.
- Keep the existing admin PIN as a temporary front-end guard until Supabase Auth and staff roles are wired in.
- Keep `localStorage` as the default data source until each service has been migrated and verified.

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
6. Apply `seed.sql` once to create the demo restaurant, tables, staff, menu items, and settings.
7. Migrate read-only services first: restaurant settings, printer settings, tables, and menu.
8. Migrate order creation and status updates after read paths are stable.
9. Add app Realtime subscriptions for orders first, then menu/table/settings changes.
10. Add Supabase Auth and tighten RLS before a public multi-restaurant pilot.

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
