-- Allow legacy staff profiles without email to remain editable.
-- Staff account creation still requires an email in the dashboard; this only prevents
-- older no-email rows from blocking whole-list staff saves.

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

grant execute on function public.save_demo_staff_members(text, jsonb) to authenticated;
revoke execute on function public.save_demo_staff_members(text, jsonb) from anon;
