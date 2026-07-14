-- Settlement audit data and role-specific order actions.
-- Guests continue to see only unsettled orders through list_table_open_orders.

alter table public.orders
  add column if not exists settled_by_staff_member_id bigint references public.staff_members(id) on delete restrict,
  add column if not exists settled_by_name text;

create index if not exists orders_settled_by_staff_member_id_idx
  on public.orders (settled_by_staff_member_id)
  where settled_by_staff_member_id is not null;

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
  current_staff_name text;
  current_staff_role text;
  target_order_number integer;
  target_restaurant_id bigint;
  updated_order record;
begin
  if next_status not in ('printed', 'settled') then
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

  select id, name, role
  into current_staff_id, current_staff_name, current_staff_role
  from public.staff_members
  where restaurant_id = target_restaurant_id
    and auth_user_id = (select auth.uid())
    and active = true;

  if current_staff_id is null then
    raise exception 'staff permission denied';
  end if;

  if next_status = 'settled' and current_staff_role not in ('manager', 'cashier') then
    raise exception 'staff permission denied';
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
    settled_by_staff_member_id = case
      when next_status = 'settled' then coalesce(settled_by_staff_member_id, current_staff_id)
      else settled_by_staff_member_id
    end,
    settled_by_name = case
      when next_status = 'settled' then coalesce(settled_by_name, current_staff_name)
      else settled_by_name
    end,
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
    'settledAt', updated_order.settled_at,
    'settledByName', updated_order.settled_by_name,
    'status', updated_order.status
  );
end;
$$;

revoke execute on function public.update_order_status(text, text, text) from anon;
grant execute on function public.update_order_status(text, text, text) to authenticated;
