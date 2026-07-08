-- Auth/RLS hardening for the staff dashboard.
-- Guests remain anonymous for menu browsing and order creation.
-- Back-office writes require a signed-in active staff member.

create schema if not exists private;
revoke all on schema private from anon, authenticated;

alter table public.staff_members
  add column if not exists email text;

create unique index if not exists staff_members_restaurant_email_key
  on public.staff_members (restaurant_id, lower(email))
  where email is not null;

create or replace function private.is_active_staff(
  target_restaurant_id bigint,
  allowed_roles text[] default null
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.staff_members staff
    where staff.restaurant_id = target_restaurant_id
      and staff.auth_user_id = (select auth.uid())
      and staff.active = true
      and (allowed_roles is null or staff.role = any(allowed_roles))
  );
$$;

create or replace function private.require_active_staff(
  target_restaurant_id bigint,
  allowed_roles text[] default null
)
returns void
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not private.is_active_staff(target_restaurant_id, allowed_roles) then
    raise exception 'staff permission denied';
  end if;
end;
$$;

grant execute on function private.is_active_staff(bigint, text[]) to authenticated;
grant execute on function private.require_active_staff(bigint, text[]) to authenticated;

create or replace function public.claim_staff_profile(
  target_restaurant_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  current_user_id uuid;
  matched_staff record;
  target_restaurant_id bigint;
begin
  current_user_id := (select auth.uid());
  current_email := nullif(lower(auth.jwt() ->> 'email'), '');

  if current_user_id is null or current_email is null then
    raise exception 'authenticated email is required';
  end if;

  select id into target_restaurant_id
  from public.restaurants
  where slug = target_restaurant_slug
    and active = true;

  if target_restaurant_id is null then
    raise exception 'restaurant not found';
  end if;

  update public.staff_members
  set
    auth_user_id = current_user_id,
    updated_at = now()
  where restaurant_id = target_restaurant_id
    and lower(email) = current_email
    and active = true
    and (auth_user_id is null or auth_user_id = current_user_id)
  returning * into matched_staff;

  if matched_staff.id is null then
    raise exception 'staff profile not found';
  end if;

  return jsonb_build_object(
    'id', matched_staff.id,
    'client_id', matched_staff.client_id,
    'auth_user_id', matched_staff.auth_user_id,
    'email', matched_staff.email,
    'name', matched_staff.name,
    'role', matched_staff.role,
    'active', matched_staff.active
  );
end;
$$;

grant execute on function public.claim_staff_profile(text) to authenticated;
revoke execute on function public.claim_staff_profile(text) from anon;

revoke execute on function public.save_demo_menu_items(text, jsonb) from anon;
revoke execute on function public.save_demo_tables(text, jsonb) from anon;
revoke execute on function public.save_demo_printer_settings(text, jsonb) from anon;
revoke execute on function public.save_demo_restaurant_settings(text, jsonb) from anon;
revoke execute on function public.save_demo_staff_members(text, jsonb) from anon;
revoke execute on function public.update_order_status(text, text, text) from anon;

grant execute on function public.save_demo_menu_items(text, jsonb) to authenticated;
grant execute on function public.save_demo_tables(text, jsonb) to authenticated;
grant execute on function public.save_demo_printer_settings(text, jsonb) to authenticated;
grant execute on function public.save_demo_restaurant_settings(text, jsonb) to authenticated;
grant execute on function public.save_demo_staff_members(text, jsonb) to authenticated;
grant execute on function public.update_order_status(text, text, text) to authenticated;
grant execute on function public.create_pending_order(text, text, text, jsonb) to anon, authenticated;

revoke select on table public.staff_members from anon;
revoke select on table public.printer_settings from anon;
revoke insert, select on table public.orders, public.order_lines from anon;
revoke insert, update, delete on table
  public.restaurants,
  public.restaurant_settings,
  public.printer_settings,
  public.staff_members,
  public.tables,
  public.menu_items,
  public.orders,
  public.order_lines
from authenticated;

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

  perform private.require_active_staff(target_restaurant_id, array['manager', 'cashier', 'floor']);

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

create or replace function public.save_demo_staff_members(
  target_restaurant_slug text,
  members jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_restaurant_id bigint;
  member jsonb;
  client_id_value text;
  email_value text;
  name_value text;
  role_value text;
begin
  if jsonb_typeof(members) <> 'array' then
    raise exception 'members must be an array';
  end if;

  select id into target_restaurant_id
  from public.restaurants
  where slug = target_restaurant_slug
    and active = true;

  if target_restaurant_id is null then
    raise exception 'restaurant not found';
  end if;

  perform private.require_active_staff(target_restaurant_id, array['manager']);

  for member in select value from jsonb_array_elements(members)
  loop
    client_id_value := nullif(trim(member->>'client_id'), '');
    if client_id_value is null then
      raise exception 'staff client_id is required';
    end if;

    name_value := nullif(trim(member->>'name'), '');
    if name_value is null then
      raise exception 'staff name is required';
    end if;

    email_value := nullif(lower(trim(member->>'email')), '');
    if email_value is null then
      raise exception 'staff email is required';
    end if;

    role_value := coalesce(nullif(trim(member->>'role'), ''), 'floor');
    if role_value not in ('manager', 'cashier', 'floor') then
      raise exception 'staff role must be manager, cashier, or floor';
    end if;

    insert into public.staff_members (
      restaurant_id,
      client_id,
      email,
      name,
      role,
      active
    )
    values (
      target_restaurant_id,
      client_id_value,
      email_value,
      name_value,
      role_value,
      coalesce((member->>'active')::boolean, true)
    )
    on conflict (restaurant_id, client_id)
    do update set
      email = excluded.email,
      name = excluded.name,
      role = excluded.role,
      active = excluded.active,
      updated_at = now();
  end loop;
end;
$$;

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

  perform private.require_active_staff(target_restaurant_id, array['manager']);

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

  perform private.require_active_staff(target_restaurant_id, array['manager']);

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
      coalesce(nullif(trim(item->>'category'), ''), 'Uncategorized'),
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

  perform private.require_active_staff(target_restaurant_id, array['manager']);

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

create or replace function public.save_demo_restaurant_settings(
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
  language_value text;
  meal_period_values jsonb;
  name_value text;
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

  perform private.require_active_staff(target_restaurant_id, array['manager']);

  name_value := nullif(trim(settings->>'name'), '');
  if name_value is null then
    raise exception 'restaurant name is required';
  end if;

  language_value := coalesce(nullif(settings->>'default_language', ''), 'zh-Hant');
  if language_value not in ('zh-Hant', 'en') then
    raise exception 'default_language must be zh-Hant or en';
  end if;

  meal_period_values := case
    when jsonb_typeof(settings->'meal_periods') = 'array' then settings->'meal_periods'
    else '[]'::jsonb
  end;

  update public.restaurants
  set
    name = name_value,
    phone = coalesce(settings->>'phone', ''),
    address = coalesce(settings->>'address', ''),
    default_language = language_value,
    updated_at = now()
  where id = target_restaurant_id;

  insert into public.restaurant_settings (
    restaurant_id,
    meal_periods
  )
  values (
    target_restaurant_id,
    meal_period_values
  )
  on conflict (restaurant_id)
  do update set
    meal_periods = excluded.meal_periods,
    updated_at = now();
end;
$$;

drop policy if exists "active staff can manage their restaurants" on public.restaurants;

drop policy if exists "demo can read staff members" on public.staff_members;
drop policy if exists "managers can manage staff" on public.staff_members;

drop policy if exists "staff can manage restaurant settings" on public.restaurant_settings;
drop policy if exists "public can read printer settings" on public.printer_settings;
drop policy if exists "staff can manage printer settings" on public.printer_settings;

drop policy if exists "staff can manage tables" on public.tables;
drop policy if exists "staff can manage menu items" on public.menu_items;

drop policy if exists "staff can manage orders" on public.orders;
drop policy if exists "staff can manage order lines" on public.order_lines;

drop policy if exists "staff can upload dish photos" on storage.objects;
drop policy if exists "staff can update dish photos" on storage.objects;
drop policy if exists "staff can delete dish photos" on storage.objects;

create policy "active staff can read restaurant staff"
  on public.staff_members
  for select
  to authenticated
  using (private.is_active_staff(staff_members.restaurant_id, array['manager']));

create policy "active managers can read printer settings"
  on public.printer_settings
  for select
  to authenticated
  using (private.is_active_staff(printer_settings.restaurant_id, array['manager']));

drop policy if exists "demo public can read orders" on public.orders;
drop policy if exists "public can read unsettled orders" on public.orders;

create policy "active staff can read restaurant orders"
  on public.orders
  for select
  to authenticated
  using (private.is_active_staff(orders.restaurant_id));

drop policy if exists "demo public can read order lines" on public.order_lines;
drop policy if exists "public can read lines for unsettled orders" on public.order_lines;

create policy "active staff can read restaurant order lines"
  on public.order_lines
  for select
  to authenticated
  using (private.is_active_staff(order_lines.restaurant_id));

drop policy if exists "demo can upload menu dish photos" on storage.objects;
drop policy if exists "demo can update menu dish photos" on storage.objects;

create policy "managers can upload menu dish photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'dish-photos'
    and name like 'menu/%'
    and exists (
      select 1
      from public.staff_members staff
      where staff.auth_user_id = (select auth.uid())
        and staff.active = true
        and staff.role = 'manager'
    )
  );

create policy "managers can update menu dish photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'dish-photos'
    and name like 'menu/%'
    and exists (
      select 1
      from public.staff_members staff
      where staff.auth_user_id = (select auth.uid())
        and staff.active = true
        and staff.role = 'manager'
    )
  )
  with check (
    bucket_id = 'dish-photos'
    and name like 'menu/%'
    and exists (
      select 1
      from public.staff_members staff
      where staff.auth_user_id = (select auth.uid())
        and staff.active = true
        and staff.role = 'manager'
    )
  );

create policy "managers can delete menu dish photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'dish-photos'
    and name like 'menu/%'
    and exists (
      select 1
      from public.staff_members staff
      where staff.auth_user_id = (select auth.uid())
        and staff.active = true
        and staff.role = 'manager'
    )
  );
