-- Demo staff management write access for the harbour ordering pilot.
-- Keep this open demo RPC temporary; replace it with Auth/RLS-scoped staff
-- management before a real production rollout.

alter table public.staff_members
  add column if not exists client_id text;

update public.staff_members
set client_id = id::text
where client_id is null;

alter table public.staff_members
  alter column client_id set not null;

create unique index if not exists staff_members_restaurant_client_id_key
  on public.staff_members (restaurant_id, client_id);

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

    role_value := coalesce(nullif(trim(member->>'role'), ''), 'floor');
    if role_value not in ('manager', 'cashier', 'floor') then
      raise exception 'staff role must be manager, cashier, or floor';
    end if;

    insert into public.staff_members (
      restaurant_id,
      client_id,
      name,
      role,
      active
    )
    values (
      target_restaurant_id,
      client_id_value,
      name_value,
      role_value,
      coalesce((member->>'active')::boolean, true)
    )
    on conflict (restaurant_id, client_id)
    do update set
      name = excluded.name,
      role = excluded.role,
      active = excluded.active,
      updated_at = now();
  end loop;
end;
$$;

grant execute on function public.save_demo_staff_members(text, jsonb) to anon, authenticated;
grant select on table public.staff_members to anon, authenticated;

drop policy if exists "demo can read staff members" on public.staff_members;

create policy "demo can read staff members"
  on public.staff_members
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.restaurants restaurant
      where restaurant.id = staff_members.restaurant_id
        and restaurant.slug = 'harbour-demo'
        and restaurant.active = true
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'staff_members'
  ) then
    alter publication supabase_realtime add table public.staff_members;
  end if;
end $$;
