-- Grants required for Supabase Data API access.
-- RLS policies still decide which rows each role can read or write.

grant usage on schema public to anon, authenticated;

grant select on table
  public.restaurants,
  public.restaurant_settings,
  public.printer_settings,
  public.tables,
  public.menu_items
to anon, authenticated;

grant insert, select on table
  public.orders,
  public.order_lines
to anon;

grant select, insert, update, delete on table
  public.restaurants,
  public.restaurant_settings,
  public.printer_settings,
  public.staff_members,
  public.tables,
  public.menu_items,
  public.orders,
  public.order_lines
to authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

drop policy if exists "public can read printer settings" on public.printer_settings;

create policy "public can read printer settings"
  on public.printer_settings
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.restaurants restaurant
      where restaurant.id = printer_settings.restaurant_id
        and restaurant.active = true
    )
  );
