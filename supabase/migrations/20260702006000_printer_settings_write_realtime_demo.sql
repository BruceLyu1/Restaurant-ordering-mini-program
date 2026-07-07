-- Demo printer settings write path for the front-end-only pilot.
-- Replace this anon RPC grant with Supabase Auth/RLS before a public rollout.

create or replace function public.save_demo_printer_settings(
  target_restaurant_slug text,
  settings jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_restaurant_id bigint;
  copies_value integer;
begin
  if jsonb_typeof(settings) <> 'object' then
    raise exception 'settings must be an object';
  end if;

  select id into target_restaurant_id
  from public.restaurants
  where slug = target_restaurant_slug
    and active = true;

  if target_restaurant_id is null then
    raise exception 'restaurant not found';
  end if;

  copies_value := coalesce((settings->>'copies')::integer, 1);
  if copies_value < 1 or copies_value > 9 then
    raise exception 'printer copies must be between 1 and 9';
  end if;

  insert into public.printer_settings (
    restaurant_id,
    auto_print,
    sound,
    printer,
    copies
  )
  values (
    target_restaurant_id,
    coalesce((settings->>'auto_print')::boolean, true),
    coalesce((settings->>'sound')::boolean, true),
    coalesce(nullif(trim(settings->>'printer'), ''), ''),
    copies_value
  )
  on conflict (restaurant_id)
  do update set
    auto_print = excluded.auto_print,
    sound = excluded.sound,
    printer = excluded.printer,
    copies = excluded.copies,
    updated_at = now();
end;
$$;

grant execute on function public.save_demo_printer_settings(text, jsonb) to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'printer_settings'
  ) then
    alter publication supabase_realtime add table public.printer_settings;
  end if;
end $$;
