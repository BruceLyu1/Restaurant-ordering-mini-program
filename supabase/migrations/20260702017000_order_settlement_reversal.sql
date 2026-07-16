-- Manager-only settlement reversal with immutable audit history.

alter table public.orders
  add column if not exists status_before_settlement text;

alter table public.orders
  add constraint orders_status_before_settlement_check check (
    status_before_settlement is null or status_before_settlement in ('pending', 'printed')
  );

create table if not exists public.order_settlement_reversals (
  id bigint generated always as identity primary key,
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  order_id bigint not null references public.orders(id) on delete cascade,
  restored_status text not null check (restored_status in ('pending', 'printed')),
  original_settled_at timestamptz,
  original_settled_by_staff_member_id bigint references public.staff_members(id) on delete restrict,
  original_settled_by_name text,
  original_payment_method text,
  original_settlement_note text,
  reversed_at timestamptz not null default now(),
  reversed_by_staff_member_id bigint not null references public.staff_members(id) on delete restrict,
  reversed_by_name text not null,
  reason text not null check (char_length(btrim(reason)) between 1 and 500)
);

create index if not exists order_settlement_reversals_order_reversed_at_idx
  on public.order_settlement_reversals (order_id, reversed_at);

alter table public.order_settlement_reversals enable row level security;

grant select on table public.order_settlement_reversals to authenticated;

create policy "managers can read settlement reversals"
  on public.order_settlement_reversals
  for select
  to authenticated
  using (private.is_active_staff(restaurant_id, array['manager']));

create or replace function public.settle_order(
  target_restaurant_slug text,
  target_order_id text,
  target_payment_method text,
  target_settlement_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
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
    status_before_settlement = status,
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
    'status_before_settlement', updated_order.status_before_settlement,
    'status', updated_order.status
  );
end;
$$;

create or replace function public.reverse_order_settlement(
  target_restaurant_slug text,
  target_order_id text,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  current_staff_id bigint;
  current_staff_name text;
  target_order_number integer;
  target_restaurant_id bigint;
  locked_order record;
  reversal_record record;
  restored_order record;
  target_restored_status text;
begin
  if char_length(btrim(coalesce(target_reason, ''))) not between 1 and 500 then
    raise exception 'settlement reversal reason is required';
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

  if not private.is_active_staff(target_restaurant_id, array['manager']) then
    raise exception 'staff permission denied';
  end if;

  select id, name into current_staff_id, current_staff_name
  from public.staff_members
  where restaurant_id = target_restaurant_id
    and auth_user_id = (select auth.uid())
    and active = true
    and role = 'manager';

  select * into locked_order
  from public.orders
  where restaurant_id = target_restaurant_id
    and order_number = target_order_number
    and status = 'settled'
  for update;

  if locked_order.id is null then
    raise exception 'order not found or not settled';
  end if;

  target_restored_status := coalesce(
    locked_order.status_before_settlement,
    case when locked_order.printed_at is null then 'pending' else 'printed' end
  );

  insert into public.order_settlement_reversals (
    restaurant_id,
    order_id,
    restored_status,
    original_settled_at,
    original_settled_by_staff_member_id,
    original_settled_by_name,
    original_payment_method,
    original_settlement_note,
    reversed_by_staff_member_id,
    reversed_by_name,
    reason
  ) values (
    target_restaurant_id,
    locked_order.id,
    target_restored_status,
    locked_order.settled_at,
    locked_order.settled_by_staff_member_id,
    locked_order.settled_by_name,
    locked_order.payment_method,
    locked_order.settlement_note,
    current_staff_id,
    current_staff_name,
    btrim(target_reason)
  ) returning * into reversal_record;

  update public.orders
  set
    status = target_restored_status,
    status_before_settlement = null,
    settled_at = null,
    settled_by_staff_member_id = null,
    settled_by_name = null,
    payment_method = null,
    settlement_note = null,
    updated_at = now()
  where id = locked_order.id
  returning * into restored_order;

  return jsonb_build_object(
    'id', 'HO-' || restored_order.order_number,
    'sequence', restored_order.order_number,
    'status', restored_order.status,
    'settlement_reversal', jsonb_build_object(
      'original_payment_method', reversal_record.original_payment_method,
      'original_settled_at', reversal_record.original_settled_at,
      'original_settled_by_name', reversal_record.original_settled_by_name,
      'original_settlement_note', reversal_record.original_settlement_note,
      'reason', reversal_record.reason,
      'restored_status', reversal_record.restored_status,
      'reversed_at', reversal_record.reversed_at,
      'reversed_by_name', reversal_record.reversed_by_name
    )
  );
end;
$$;

revoke all on function public.reverse_order_settlement(text, text, text) from public, anon;
grant execute on function public.reverse_order_settlement(text, text, text) to authenticated;

notify pgrst, 'reload schema';