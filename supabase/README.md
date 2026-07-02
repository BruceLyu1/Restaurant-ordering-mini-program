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
2. Seed one restaurant, tables, menu items, and settings from the existing demo data.
3. Migrate read-only services first: restaurant settings, printer settings, tables, and menu.
4. Migrate order creation and status updates after read paths are stable.
5. Add Realtime subscriptions for orders first, then menu/table/settings changes.
6. Add Supabase Auth and tighten RLS before a public multi-restaurant pilot.

## Rollback

Set `VITE_DATA_SOURCE=local` and rebuild to return the app to the current localStorage behavior while keeping Supabase code in place.

## Security Notes

- Every business table includes `restaurant_id`.
- RLS is enabled in the initial migration.
- Authenticated staff policies use `public.is_active_staff(...)` to avoid recursive staff RLS checks.
- Guest order policies are intentionally minimal for the pilot. Before public production use, prefer table-scoped tokens or RPC functions for order creation and table order lookup.
