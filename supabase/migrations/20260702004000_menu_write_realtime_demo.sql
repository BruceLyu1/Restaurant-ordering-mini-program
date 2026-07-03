-- Demo menu write path for the front-end-only pilot.
-- Replace these anon write grants and policies with Supabase Auth/RLS before a public rollout.

create or replace function public.save_demo_menu_items(
  target_restaurant_slug text,
  items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_restaurant_id bigint;
  item jsonb;
  item_index integer := 0;
  meal_period_values text[];
  price_cents_value integer;
begin
  if jsonb_typeof(items) <> 'array' then
    raise exception 'items must be an array';
  end if;

  select id into target_restaurant_id
  from public.restaurants
  where slug = target_restaurant_slug
    and active = true;

  if target_restaurant_id is null then
    raise exception 'restaurant not found';
  end if;

  for item in select value from jsonb_array_elements(items)
  loop
    item_index := item_index + 1;

    if nullif(trim(item->>'client_id'), '') is null then
      raise exception 'menu item client_id is required';
    end if;

    if nullif(trim(item->>'name'), '') is null then
      raise exception 'menu item name is required';
    end if;

    price_cents_value := coalesce((item->>'price_cents')::integer, 0);
    if price_cents_value < 0 then
      raise exception 'menu item price must be non-negative';
    end if;

    select coalesce(array_agg(value), '{}'::text[]) into meal_period_values
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(item->'meal_periods') = 'array' then item->'meal_periods'
        else '[]'::jsonb
      end
    ) as meal_period(value);

    insert into public.menu_items (
      restaurant_id,
      client_id,
      name,
      description,
      category,
      price_cents,
      image_url,
      meal_periods,
      sold_out,
      deleted,
      sort_order
    )
    values (
      target_restaurant_id,
      trim(item->>'client_id'),
      trim(item->>'name'),
      coalesce(item->>'description', ''),
      coalesce(nullif(trim(item->>'category'), ''), '未分類'),
      price_cents_value,
      nullif(item->>'image_url', ''),
      meal_period_values,
      coalesce((item->>'sold_out')::boolean, false),
      coalesce((item->>'deleted')::boolean, false),
      coalesce((item->>'sort_order')::integer, item_index)
    )
    on conflict (restaurant_id, client_id)
    do update set
      name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      price_cents = excluded.price_cents,
      image_url = excluded.image_url,
      meal_periods = excluded.meal_periods,
      sold_out = excluded.sold_out,
      deleted = excluded.deleted,
      sort_order = excluded.sort_order,
      updated_at = now();
  end loop;
end;
$$;

grant execute on function public.save_demo_menu_items(text, jsonb) to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'menu_items'
  ) then
    alter publication supabase_realtime add table public.menu_items;
  end if;
end $$;

drop policy if exists "demo can upload menu dish photos" on storage.objects;
drop policy if exists "demo can update menu dish photos" on storage.objects;

create policy "demo can upload menu dish photos"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'dish-photos'
    and name like 'menu/%'
  );

create policy "demo can update menu dish photos"
  on storage.objects
  for update
  to anon, authenticated
  using (
    bucket_id = 'dish-photos'
    and name like 'menu/%'
  )
  with check (
    bucket_id = 'dish-photos'
    and name like 'menu/%'
  );
