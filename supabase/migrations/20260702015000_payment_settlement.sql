-- Payment audit fields and an atomic settlement RPC.

alter table public.orders
  add column if not exists payment_method text,
  add column if not exists settlement_note text;

alter table public.orders
  add constraint orders_payment_method_check check (
    payment_method is null or payment_method in (
      'cash', 'octopus', 'credit_card', 'wechat_pay', 'alipay_hk', 'fps', 'other'
    )
  ),
  add constraint orders_settlement_note_length_check check (
    settlement_note is null or char_length(settlement_note) <= 500
  );

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
  current_staff_id bigint;
  target_order_number integer;
  target_restaurant_id bigint;
  updated_order record;
begin
  if next_status <> 'printed' then
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

  select id into current_staff_id
  from public.staff_members
  where restaurant_id = target_restaurant_id
    and auth_user_id = (select auth.uid())
    and active = true;

  if current_staff_id is null then
    raise exception 'staff permission denied';
  end if;

  update public.orders
  set
    status = 'printed',
    printed_at = coalesce(printed_at, now()),
    updated_at = now()
  where restaurant_id = target_restaurant_id
    and order_number = target_order_number
    and status <> 'settled'
  returning * into updated_order;

  if updated_order.id is null then
    raise exception 'order not found or already settled';
  end if;

  return jsonb_build_object(
    'id', 'HO-' || updated_order.order_number,
    'sequence', updated_order.order_number,
    'status', updated_order.status
  );
end;
$$;

create or replace function public.settle_order(
  target_restaurant_slug text,
  target_order_id text,
  target_payment_method text,
  target_settlement_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_staff_id bigint;
  current_staff_name text;
  target_order_number integer;
  target_restaurant_id bigint;
  updated_order record;
begin
  if target_payment_method not in ('cash', 'octopus', 'credit_card', 'wechat_pay', 'alipay_hk', 'fps', 'other') then
    raise exception 'invalid payment method';
  end if;

  if char_length(coalesce(target_settlement_note, '')) > 500 then
    raise exception 'settlement note is too long';
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

  select id, name into current_staff_id, current_staff_name
  from public.staff_members
  where restaurant_id = target_restaurant_id
    and auth_user_id = (select auth.uid())
    and active = true
    and role in ('manager', 'cashier');

  if current_staff_id is null then
    raise exception 'staff permission denied';
  end if;

  update public.orders
  set
    status = 'settled',
    settled_at = now(),
    settled_by_staff_member_id = current_staff_id,
    settled_by_name = current_staff_name,
    payment_method = target_payment_method,
    settlement_note = nullif(btrim(target_settlement_note), ''),
    updated_at = now()
  where restaurant_id = target_restaurant_id
    and order_number = target_order_number
    and status <> 'settled'
  returning * into updated_order;

  if updated_order.id is null then
    raise exception 'order not found or already settled';
  end if;

  return jsonb_build_object(
    'id', 'HO-' || updated_order.order_number,
    'sequence', updated_order.order_number,
    'payment_method', updated_order.payment_method,
    'settled_at', updated_order.settled_at,
    'settled_by_name', updated_order.settled_by_name,
    'settlement_note', updated_order.settlement_note,
    'status', updated_order.status
  );
end;
$$;

revoke execute on function public.settle_order(text, text, text, text) from anon;
grant execute on function public.settle_order(text, text, text, text) to authenticated;

create or replace function public.get_revenue_report(
  target_restaurant_slug text,
  range_start timestamptz,
  range_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  target_restaurant_id bigint;
begin
  if range_start is null or range_end is null or range_end <= range_start then
    raise exception 'invalid report range';
  end if;

  select id into target_restaurant_id
  from public.restaurants
  where slug = target_restaurant_slug
    and active = true;

  if target_restaurant_id is null then
    raise exception 'restaurant not found';
  end if;

  if not private.is_active_staff(target_restaurant_id, array['manager']) then
    raise exception 'staff permission denied';
  end if;

  return (
    with settled_orders as (
      select *
      from public.orders
      where restaurant_id = target_restaurant_id
        and status = 'settled'
        and settled_at >= range_start
        and settled_at < range_end
    ),
    summary as (
      select
        coalesce(sum(total_cents), 0) as revenue_cents,
        count(*)::integer as order_count,
        coalesce(sum((
          select sum(order_line.quantity)
          from public.order_lines order_line
          where order_line.order_id = settled_orders.id
        )), 0)::integer as item_count
      from settled_orders
    ),
    dish_sales as (
      select
        order_line.menu_item_client_id as id,
        order_line.name,
        sum(order_line.quantity)::integer as quantity,
        sum(order_line.quantity * order_line.unit_price_cents)::integer as revenue_cents
      from public.order_lines order_line
      join settled_orders on settled_orders.id = order_line.order_id
      group by order_line.menu_item_client_id, order_line.name
      order by quantity desc, revenue_cents desc, order_line.name asc
    ),
    payment_sales as (
      select
        coalesce(settled_orders.payment_method, 'unrecorded') as method,
        count(*)::integer as order_count,
        sum(settled_orders.total_cents)::integer as revenue_cents
      from settled_orders
      group by coalesce(settled_orders.payment_method, 'unrecorded')
      order by revenue_cents desc, order_count desc, method asc
    ),
    staff_sales as (
      select
        settled_orders.settled_by_staff_member_id as staff_id,
        coalesce(settled_orders.settled_by_name, 'Unknown') as name,
        count(*)::integer as order_count,
        sum(settled_orders.total_cents)::integer as revenue_cents
      from settled_orders
      group by settled_orders.settled_by_staff_member_id, coalesce(settled_orders.settled_by_name, 'Unknown')
      order by revenue_cents desc, order_count desc, name asc
    )
    select jsonb_build_object(
      'summary', jsonb_build_object(
        'revenue', summary.revenue_cents / 100.0,
        'orderCount', summary.order_count,
        'itemCount', summary.item_count,
        'averageOrderValue', case
          when summary.order_count = 0 then 0
          else (summary.revenue_cents / 100.0) / summary.order_count
        end
      ),
      'dishSales', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', dish_sales.id,
          'name', dish_sales.name,
          'quantity', dish_sales.quantity,
          'revenue', dish_sales.revenue_cents / 100.0
        ))
        from dish_sales
      ), '[]'::jsonb),
      'paymentSales', coalesce((
        select jsonb_agg(jsonb_build_object(
          'method', payment_sales.method,
          'orderCount', payment_sales.order_count,
          'revenue', payment_sales.revenue_cents / 100.0
        ))
        from payment_sales
      ), '[]'::jsonb),
      'staffSales', coalesce((
        select jsonb_agg(jsonb_build_object(
          'staffId', staff_sales.staff_id,
          'name', staff_sales.name,
          'orderCount', staff_sales.order_count,
          'revenue', staff_sales.revenue_cents / 100.0
        ))
        from staff_sales
      ), '[]'::jsonb)
    )
    from summary
  );
end;
$$;
