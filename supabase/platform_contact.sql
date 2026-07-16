-- ============================================================================
-- Collarone — platform-level contact inbox. Run after organizations.sql
-- (needs is_platform_admin()). Idempotent.
--
-- Distinct from the per-tenant CRM "Messages" tab (crm_activities /
-- website contact forms, which belong to one org) — this is messages sent
-- to Collarone itself via the public /contact page. Same reply pattern as
-- the tenant inbox: WhatsApp/email/call quick-actions, mark-as-replied —
-- no automated sending exists anywhere in this codebase, so this doesn't
-- fake it either.
-- ============================================================================

create table if not exists public.platform_contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null default '',
  phone      text not null default '',
  company    text not null default '',
  message    text not null,
  status     text not null default 'new' check (status in ('new','replied')),
  created_at timestamptz not null default now(),
  replied_at timestamptz
);

create index if not exists platform_contact_messages_status_idx on public.platform_contact_messages (status, created_at desc);

alter table public.platform_contact_messages enable row level security;

drop policy if exists "platform_contact_messages_admin" on public.platform_contact_messages;
create policy "platform_contact_messages_admin" on public.platform_contact_messages for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());
-- inserts come only from public_submit_contact_message() below (anon, no direct table access)

create or replace function public.public_submit_contact_message(
  p_name text, p_email text, p_phone text default '', p_company text default '', p_message text default ''
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'Your name is required'; end if;
  if coalesce(trim(p_email), '') = '' and coalesce(trim(p_phone), '') = '' then
    raise exception 'An email or phone number is required so we can reply';
  end if;
  if coalesce(trim(p_message), '') = '' then raise exception 'Message cannot be empty'; end if;
  if length(p_message) > 4000 then raise exception 'Message is too long'; end if;

  insert into public.platform_contact_messages (name, email, phone, company, message)
  values (trim(p_name), coalesce(trim(p_email), ''), coalesce(trim(p_phone), ''), coalesce(trim(p_company), ''), trim(p_message));

  return true;
end;
$$;
grant execute on function public.public_submit_contact_message(text, text, text, text, text) to anon, authenticated;
