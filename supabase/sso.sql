-- ============================================================================
-- Microsoft (Azure Entra ID) SSO support — auto-create a profile on first login.
-- Run this in Supabase → SQL Editor (after schema.sql). Idempotent.
-- ============================================================================
-- Behaviour:
--   • Azure (Microsoft) sign-in  -> profile created ACTIVE, role 'staff', NO suites
--     (they can sign in but see nothing until a System Admin grants suites).
--   • Plain email self-signup     -> profile created DISABLED (blocked at login).
--   • Admin-created (via /api/admin) -> trigger inserts disabled, then the function
--     upserts it to active with the chosen role + suites.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  prov text := coalesce(new.raw_app_meta_data->>'provider', 'email');
begin
  insert into public.profiles (id, email, name, role, suites, status, must_change_password)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'staff',
    '[]'::jsonb,
    case when prov = 'email' then 'disabled' else 'active' end,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
