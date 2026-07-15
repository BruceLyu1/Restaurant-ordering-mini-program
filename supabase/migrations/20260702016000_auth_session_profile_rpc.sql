-- Allow every authenticated staff member to restore only their own profile.
-- The dashboard's staff list remains manager-only through its existing RLS policy.

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

  select * into matched_staff
  from public.staff_members
  where restaurant_id = target_restaurant_id
    and lower(email) = current_email;

  if matched_staff.id is null then
    raise exception 'staff profile not found';
  end if;

  if not matched_staff.active then
    raise exception 'staff account is inactive';
  end if;

  if matched_staff.auth_user_id is not null
    and matched_staff.auth_user_id <> current_user_id then
    raise exception 'staff profile is linked to another account';
  end if;

  update public.staff_members
  set
    auth_user_id = current_user_id,
    updated_at = now()
  where id = matched_staff.id;

  return jsonb_build_object(
    'id', matched_staff.id,
    'client_id', matched_staff.client_id,
    'auth_user_id', current_user_id,
    'email', matched_staff.email,
    'name', matched_staff.name,
    'role', matched_staff.role,
    'active', matched_staff.active
  );
end;
$$;

create or replace function public.get_current_staff_profile(
  target_restaurant_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  matched_staff record;
  target_restaurant_id bigint;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'authenticated user is required';
  end if;

  select id into target_restaurant_id
  from public.restaurants
  where slug = target_restaurant_slug
    and active = true;

  if target_restaurant_id is null then
    raise exception 'restaurant not found';
  end if;

  select * into matched_staff
  from public.staff_members
  where restaurant_id = target_restaurant_id
    and auth_user_id = current_user_id;

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

revoke all on function public.claim_staff_profile(text) from public, anon;
revoke all on function public.get_current_staff_profile(text) from public, anon;
grant execute on function public.claim_staff_profile(text) to authenticated;
grant execute on function public.get_current_staff_profile(text) to authenticated;
