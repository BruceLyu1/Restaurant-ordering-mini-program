-- Demo order RPCs for the front-end-only pilot.
-- This keeps guest order creation atomic and lets the current PIN-guarded
-- admin UI update order status before Supabase Auth is introduced.

create or replace function public.create_pending_order(
  target_restaurant_slug text,
  target_table_number text,
  target_meal_period_id text,
  line_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  created_order record;
  line_item jsonb;
  line_quantity integer;
  menu_item record;
  target_restaurant_id bigint;
  target_table_id bigint;
  next_order_number integer;
  order_total_cents integer := 0;
begin
  if jsonb_typeof(line_items) <> 'array' or jsonb_array_length(line_items) = 0 then
    raise exception 'line_items must be a non-empty array';
  end if;

  select id into target_restaurant_id
  from public.restaurants
  where slug = target_restaurant_slug
    and active = true;

  if target_restaurant_id is null then
    raise exception 'restaurant not found';
  end if;

  select id into target_table_id
  from public.tables
  where restaurant_id = target_restaurant_id
    and number = target_table_number
    and active = true;

  if target_table_id is null then
    raise exception 'table not found';
  end if;

  for line_item in select * from jsonb_array_elements(line_items)
  loop
    if (line_item->>'quantity') !~ '^[0-9]+$' then
      raise exception 'invalid quantity';
    end if;

    line_quantity := (line_item->>'quantity')::integer;
    if line_quantity <= 0 then
      raise exception 'invalid quantity';
    end if;

    select id, client_id, name, price_cents into menu_item
    from public.menu_items
    where restaurant_id = target_restaurant_id
      and client_id = line_item->>'client_id'
      and deleted = false
      and sold_out = false
      and (
        target_meal_period_id is null
        or cardinality(meal_periods) = 0
        or target_meal_period_id = any(meal_periods)
      );

    if menu_item.id is null then
      raise exception 'menu item not available';
    end if;

    order_total_cents := order_total_cents + menu_item.price_cents * line_quantity;
  end loop;

  perform pg_advisory_xact_lock(target_restaurant_id);

  select greatest(coalesce(max(order_number), 1000), 1000) + 1 into next_order_number
  from public.orders
  where restaurant_id = target_restaurant_id;

  insert into public.orders (
    restaurant_id,
    table_id,
    order_number,
    status,
    meal_period_id,
    total_cents
  )
  values (
    target_restaurant_id,
    target_table_id,
    next_order_number,
    'pending',
    target_meal_period_id,
    order_total_cents
  )
  returning * into created_order;

  for line_item in select * from jsonb_array_elements(line_items)
  loop
    line_quantity := (line_item->>'quantity')::integer;

    select id, client_id, name, price_cents into menu_item
    from public.menu_items
    where restaurant_id = target_restaurant_id
      and client_id = line_item->>'client_id'
      and deleted = false
      and sold_out = false
      and (
        target_meal_period_id is null
        or cardinality(meal_periods) = 0
        or target_meal_period_id = any(meal_periods)
      );

    insert into public.order_lines (
      order_id,
      restaurant_id,
      menu_item_id,
      menu_item_client_id,
      name,
      notes,
      quantity,
      unit_price_cents
    )
    values (
      created_order.id,
      target_restaurant_id,
      menu_item.id,
      menu_item.client_id,
      menu_item.name,
      nullif(line_item->>'notes', ''),
      line_quantity,
      menu_item.price_cents
    );
  end loop;

  return (
    select jsonb_build_object(
      'id', 'HO-' || created_order.order_number,
      'sequence', created_order.order_number,
      'table', target_table_number,
      'createdAt', created_order.created_at,
      'status', created_order.status,
      'items', coalesce(jsonb_agg(jsonb_build_object(
        'id', order_line.menu_item_client_id,
        'name', order_line.name,
        'notes', order_line.notes,
        'quantity', order_line.quantity,
        'unitPrice', order_line.unit_price_cents / 100.0
      ) order by order_line.id), '[]'::jsonb)
    )
    from public.order_lines order_line
    where order_line.order_id = created_order.id
  );
end;
$$;

create or replace function public.update_order_status(
  target_restaurant_slug text,
  target_order_id text,
  next_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_restaurant_id bigint;
  target_order_number integer;
  updated_order record;
begin
  if next_status not in ('pending', 'printed', 'settled') then
    raise exception 'invalid order status';
  end if;

  if regexp_replace(target_order_id, '^HO-', '') !~ '^[0-9]+$' then
    raise exception 'invalid order id';
  end if;

  target_order_number := regexp_replace(target_order_id, '^HO-', '')::integer;

  select id into target_restaurant_id
  from public.restaurants
  where slug = target_restaurant_slug
    and active = true;

  if target_restaurant_id is null then
    raise exception 'restaurant not found';
  end if;

  update public.orders
  set
    status = next_status,
    printed_at = case
      when next_status = 'printed' then coalesce(printed_at, now())
      else printed_at
    end,
    settled_at = case
      when next_status = 'settled' then coalesce(settled_at, now())
      else settled_at
    end,
    updated_at = now()
  where restaurant_id = target_restaurant_id
    and order_number = target_order_number
  returning * into updated_order;

  if updated_order.id is null then
    raise exception 'order not found';
  end if;

  return jsonb_build_object(
    'id', 'HO-' || updated_order.order_number,
    'sequence', updated_order.order_number,
    'status', updated_order.status
  );
end;
$$;

grant execute on function public.create_pending_order(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.update_order_status(text, text, text) to anon, authenticated;

drop policy if exists "public can read unsettled orders" on public.orders;
drop policy if exists "demo public can read orders" on public.orders;

create policy "demo public can read orders"
  on public.orders
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.restaurants restaurant
      where restaurant.id = orders.restaurant_id
        and restaurant.active = true
    )
  );

drop policy if exists "public can read lines for unsettled orders" on public.order_lines;
drop policy if exists "demo public can read order lines" on public.order_lines;

create policy "demo public can read order lines"
  on public.order_lines
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.orders customer_order
      join public.restaurants restaurant on restaurant.id = customer_order.restaurant_id
      where customer_order.id = order_lines.order_id
        and restaurant.active = true
    )
  );
