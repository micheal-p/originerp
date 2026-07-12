-- ============================================================================
-- Collarone — track which country each org registered from
-- Nigeria-first, but the long-term goal is global (per the pivot plan) —
-- this is the first real data point toward that, captured at signup.
-- ============================================================================

alter table public.organizations add column if not exists country text not null default 'NG';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  prov         text := coalesce(new.raw_app_meta_data->>'provider', 'email');
  signup_type  text := new.raw_user_meta_data->>'signup_type';
  org_name     text := new.raw_user_meta_data->>'org_name';
  org_slug     text := new.raw_user_meta_data->>'org_slug';
  org_plan     text := coalesce(new.raw_user_meta_data->>'plan_tier', 'startup');
  org_theme    text := coalesce(new.raw_user_meta_data->>'theme_color', '#FF5B1F');
  org_logo     text := coalesce(new.raw_user_meta_data->>'logo_url', '');
  org_website  text := coalesce(new.raw_user_meta_data->>'website_type', 'none');
  org_country  text := coalesce(new.raw_user_meta_data->>'country', 'NG');
  new_org_id   uuid;
begin
  if signup_type = 'org_owner' and org_name is not null and org_slug is not null then
    insert into public.organizations (name, slug, plan_tier, status, theme_color, logo_url, website_type, country, created_by)
    values (org_name, org_slug, org_plan, 'pending_payment', org_theme, org_logo, org_website, org_country, new.id)
    returning id into new_org_id;

    insert into public.profiles (id, email, name, role, org_id, suites, status, must_change_password)
    values (
      new.id, new.email,
      coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      'super_admin', new_org_id, '[]'::jsonb, 'active', false
    )
    on conflict (id) do nothing;
  else
    insert into public.profiles (id, email, name, role, org_id, suites, status, must_change_password)
    values (
      new.id, new.email,
      coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      'staff', '00000000-0000-0000-0000-000000000001', '[]'::jsonb,
      case when prov = 'email' then 'disabled' else 'active' end,
      false
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
