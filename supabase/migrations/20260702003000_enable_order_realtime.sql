-- Enable Supabase Realtime notifications for the order flow.
-- The app treats these events as reload signals instead of merging payloads.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'order_lines'
  ) then
    alter publication supabase_realtime add table public.order_lines;
  end if;
end $$;
