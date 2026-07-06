-- Demo table write path for the front-end-only pilot.
-- Replace this anon RPC grant with Supabase Auth/RLS before a public rollout.

create or replace function public.save_demo_tables(
  target_restaurant_slug text,
  tables jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_restaurant_id bigint;
  table_item jsonb;
  table_number text;
  seats_value integer;
  active_numbers text[] := '{}'::text[];
begin
  if jsonb_typeof(tables) <> 'array' then
    raise exception 'tables must be an array';
  end if;

  select id into target_restaurant_id
  from public.restaurants
  where slug = target_restaurant_slug
    and active = true;

  if target_restaurant_id is null then
    raise exception 'restaurant not found';
  end if;

  for table_item in select value from jsonb_array_elements(tables)
  loop
    table_number := nullif(trim(table_item->>'number'), '');
    if table_number is null then
      raise exception 'table number is required';
    end if;

    if table_number = any(active_numbers) then
      raise exception 'table number must be unique';
    end if;

    seats_value := coalesce((table_item->>'seats')::integer, 0);
    if seats_value <= 0 then
      raise exception 'table seats must be positive';
    end if;

    active_numbers := array_append(active_numbers, table_number);

    insert into public.tables (
      restaurant_id,
      number,
      seats,
      active
    )
    values (
      target_restaurant_id,
      table_number,
      seats_value,
      true
    )
    on conflict (restaurant_id, number)
    do update set
      seats = excluded.seats,
      active = true,
      updated_at = now();
  end loop;

  update public.tables
  set
    active = false,
    updated_at = now()
  where restaurant_id = target_restaurant_id
    and number <> all(active_numbers);
end;
$$;

grant execute on function public.save_demo_tables(text, jsonb) to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tables'
  ) then
    alter publication supabase_realtime add table public.tables;
  end if;
end $$;
