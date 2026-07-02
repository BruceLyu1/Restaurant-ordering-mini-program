-- Supabase preparation schema for harbour-ordering-h5.
-- This migration prepares the remote data model without changing the current
-- localStorage demo flow.

create table if not exists public.restaurants (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  phone text not null default '',
  address text not null default '',
  default_language text not null default 'zh-Hant',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_default_language_check check (default_language in ('zh-Hant', 'en'))
);

create table if not exists public.restaurant_settings (
  restaurant_id bigint primary key references public.restaurants(id) on delete cascade,
  meal_periods jsonb not null default '[]'::jsonb,
  admin_pin_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.printer_settings (
  restaurant_id bigint primary key references public.restaurants(id) on delete cascade,
  auto_print boolean not null default true,
  sound boolean not null default true,
  printer text not null default '',
  copies integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint printer_settings_copies_check check (copies between 1 and 9)
);

create table if not exists public.staff_members (
  id bigint generated always as identity primary key,
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  role text not null default 'floor',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_members_role_check check (role in ('manager', 'cashier', 'floor'))
);

create table if not exists public.tables (
  id bigint generated always as identity primary key,
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  number text not null,
  seats integer not null default 4,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tables_seats_check check (seats > 0),
  constraint tables_restaurant_number_unique unique (restaurant_id, number)
);

create table if not exists public.menu_items (
  id bigint generated always as identity primary key,
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  client_id text not null,
  name text not null,
  description text not null default '',
  category text not null default '未分類',
  price_cents integer not null,
  image_path text,
  image_url text,
  meal_periods text[] not null default '{}',
  sold_out boolean not null default false,
  deleted boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_items_price_cents_check check (price_cents >= 0),
  constraint menu_items_restaurant_client_id_unique unique (restaurant_id, client_id)
);

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  table_id bigint not null references public.tables(id) on delete restrict,
  order_number integer not null,
  status text not null default 'pending',
  meal_period_id text,
  total_cents integer not null default 0,
  created_at timestamptz not null default now(),
  printed_at timestamptz,
  settled_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint orders_status_check check (status in ('pending', 'printed', 'settled')),
  constraint orders_total_cents_check check (total_cents >= 0),
  constraint orders_restaurant_order_number_unique unique (restaurant_id, order_number)
);

create table if not exists public.order_lines (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  menu_item_id bigint references public.menu_items(id) on delete set null,
  menu_item_client_id text not null,
  name text not null,
  notes text,
  quantity integer not null,
  unit_price_cents integer not null,
  created_at timestamptz not null default now(),
  constraint order_lines_quantity_check check (quantity > 0),
  constraint order_lines_unit_price_cents_check check (unit_price_cents >= 0)
);

create index if not exists restaurant_settings_restaurant_id_idx on public.restaurant_settings (restaurant_id);
create index if not exists printer_settings_restaurant_id_idx on public.printer_settings (restaurant_id);
create index if not exists staff_members_restaurant_id_idx on public.staff_members (restaurant_id);
create index if not exists staff_members_auth_user_id_idx on public.staff_members (auth_user_id) where auth_user_id is not null;
create index if not exists tables_restaurant_id_idx on public.tables (restaurant_id);
create index if not exists menu_items_restaurant_id_idx on public.menu_items (restaurant_id);
create index if not exists menu_items_active_idx on public.menu_items (restaurant_id, category, sort_order) where deleted = false;
create index if not exists orders_restaurant_status_created_at_idx on public.orders (restaurant_id, status, created_at desc);
create index if not exists orders_table_status_idx on public.orders (table_id, status, created_at desc);
create index if not exists order_lines_order_id_idx on public.order_lines (order_id);
create index if not exists order_lines_restaurant_id_idx on public.order_lines (restaurant_id);
create index if not exists order_lines_menu_item_id_idx on public.order_lines (menu_item_id) where menu_item_id is not null;

alter table public.restaurants enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.printer_settings enable row level security;
alter table public.staff_members enable row level security;
alter table public.tables enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;

create or replace function public.is_active_staff(
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
      and staff.auth_user_id = auth.uid()
      and staff.active = true
      and (allowed_roles is null or staff.role = any(allowed_roles))
  );
$$;

grant execute on function public.is_active_staff(bigint, text[]) to authenticated;

create policy "public can read active restaurants"
  on public.restaurants
  for select
  to anon, authenticated
  using (active = true);

create policy "active staff can manage their restaurants"
  on public.restaurants
  for all
  to authenticated
  using (public.is_active_staff(restaurants.id))
  with check (public.is_active_staff(restaurants.id));

create policy "staff can read own staff profile"
  on public.staff_members
  for select
  to authenticated
  using (auth_user_id = auth.uid());

create policy "managers can manage staff"
  on public.staff_members
  for all
  to authenticated
  using (public.is_active_staff(staff_members.restaurant_id, array['manager']))
  with check (public.is_active_staff(staff_members.restaurant_id, array['manager']));

create policy "public can read restaurant settings"
  on public.restaurant_settings
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.restaurants restaurant
      where restaurant.id = restaurant_settings.restaurant_id
        and restaurant.active = true
    )
  );

create policy "staff can manage restaurant settings"
  on public.restaurant_settings
  for all
  to authenticated
  using (public.is_active_staff(restaurant_settings.restaurant_id))
  with check (public.is_active_staff(restaurant_settings.restaurant_id));

create policy "staff can manage printer settings"
  on public.printer_settings
  for all
  to authenticated
  using (public.is_active_staff(printer_settings.restaurant_id))
  with check (public.is_active_staff(printer_settings.restaurant_id));

create policy "public can read active tables"
  on public.tables
  for select
  to anon, authenticated
  using (active = true);

create policy "staff can manage tables"
  on public.tables
  for all
  to authenticated
  using (public.is_active_staff(tables.restaurant_id))
  with check (public.is_active_staff(tables.restaurant_id));

create policy "public can read available menu items"
  on public.menu_items
  for select
  to anon, authenticated
  using (
    deleted = false
    and exists (
      select 1 from public.restaurants restaurant
      where restaurant.id = menu_items.restaurant_id
        and restaurant.active = true
    )
  );

create policy "staff can manage menu items"
  on public.menu_items
  for all
  to authenticated
  using (public.is_active_staff(menu_items.restaurant_id))
  with check (public.is_active_staff(menu_items.restaurant_id));

create policy "public can create pending orders"
  on public.orders
  for insert
  to anon
  with check (
    status = 'pending'
    and exists (
      select 1 from public.tables dining_table
      where dining_table.id = orders.table_id
        and dining_table.restaurant_id = orders.restaurant_id
        and dining_table.active = true
    )
  );

create policy "public can read unsettled orders"
  on public.orders
  for select
  to anon
  using (status <> 'settled');

create policy "staff can manage orders"
  on public.orders
  for all
  to authenticated
  using (public.is_active_staff(orders.restaurant_id))
  with check (public.is_active_staff(orders.restaurant_id));

create policy "public can create order lines for pending orders"
  on public.order_lines
  for insert
  to anon
  with check (
    exists (
      select 1 from public.orders customer_order
      where customer_order.id = order_lines.order_id
        and customer_order.restaurant_id = order_lines.restaurant_id
        and customer_order.status = 'pending'
    )
  );

create policy "public can read lines for unsettled orders"
  on public.order_lines
  for select
  to anon
  using (
    exists (
      select 1 from public.orders customer_order
      where customer_order.id = order_lines.order_id
        and customer_order.status <> 'settled'
    )
  );

create policy "staff can manage order lines"
  on public.order_lines
  for all
  to authenticated
  using (public.is_active_staff(order_lines.restaurant_id))
  with check (public.is_active_staff(order_lines.restaurant_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dish-photos', 'dish-photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "public can read dish photos"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'dish-photos');

create policy "staff can upload dish photos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'dish-photos');

create policy "staff can update dish photos"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'dish-photos')
  with check (bucket_id = 'dish-photos');

create policy "staff can delete dish photos"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'dish-photos');
