-- Guest-facing order status RPC.
-- Anonymous customers may read only open orders for the restaurant/table they are viewing.
-- Back-office all-order reads remain restricted to authenticated active staff by RLS.

create or replace function public.list_table_open_orders(
  target_restaurant_slug text,
  target_table_number text
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with target_restaurant as (
    select id
    from public.restaurants
    where slug = target_restaurant_slug
      and active = true
    limit 1
  ),
  target_table as (
    select dining_table.id, dining_table.number, dining_table.restaurant_id
    from public.tables dining_table
    join target_restaurant restaurant on restaurant.id = dining_table.restaurant_id
    where dining_table.number = target_table_number
      and dining_table.active = true
    limit 1
  ),
  open_orders as (
    select customer_order.*, dining_table.number as table_number
    from public.orders customer_order
    join target_table dining_table on dining_table.id = customer_order.table_id
    where customer_order.restaurant_id = dining_table.restaurant_id
      and customer_order.status <> 'settled'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', 'HO-' || open_order.order_number,
    'sequence', open_order.order_number,
    'table', open_order.table_number,
    'createdAt', open_order.created_at,
    'status', open_order.status,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', order_line.menu_item_client_id,
        'name', order_line.name,
        'notes', order_line.notes,
        'quantity', order_line.quantity,
        'unitPrice', order_line.unit_price_cents / 100.0
      ) order by order_line.id)
      from public.order_lines order_line
      where order_line.order_id = open_order.id
    ), '[]'::jsonb)
  ) order by open_order.created_at desc), '[]'::jsonb)
  from open_orders open_order;
$$;

grant execute on function public.list_table_open_orders(text, text) to anon, authenticated;
