-- Manager-only revenue report for settled orders.

create index if not exists orders_revenue_report_idx
  on public.orders (restaurant_id, settled_at)
  where status = 'settled' and settled_at is not null;

create index if not exists order_lines_order_id_idx
  on public.order_lines (order_id);

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

revoke execute on function public.get_revenue_report(text, timestamptz, timestamptz) from anon;
grant execute on function public.get_revenue_report(text, timestamptz, timestamptz) to authenticated;
