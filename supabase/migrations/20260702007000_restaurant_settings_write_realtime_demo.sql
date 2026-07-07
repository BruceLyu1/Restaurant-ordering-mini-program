-- Demo restaurant settings write path for the front-end-only pilot.
-- PIN/admin credential changes are intentionally left for the Supabase Auth/RLS phase.
-- Replace this anon RPC grant with Supabase Auth/RLS before a public rollout.

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

grant execute on function public.save_demo_restaurant_settings(text, jsonb) to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'restaurants'
  ) then
    alter publication supabase_realtime add table public.restaurants;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'restaurant_settings'
  ) then
    alter publication supabase_realtime add table public.restaurant_settings;
  end if;
end $$;
