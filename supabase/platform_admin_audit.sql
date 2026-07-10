-- ============================================================================
-- Collarone — platform-admin audit log
-- Run after organizations.sql. Idempotent.
-- Records every sensitive cross-org action (payment confirmation, org
-- deletion, impersonation) taken from the Platform Admin panel — who did it,
-- to which org, when. Written only by the service role (client/api/admin.js);
-- readable only by platform admins.
-- ============================================================================

create table if not exists public.platform_admin_audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references auth.users(id),
  action        text not null check (action in ('confirm_payment','delete_org','impersonate')),
  target_org_id uuid references public.organizations(id) on delete set null,
  details       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

alter table public.platform_admin_audit_log enable row level security;

drop policy if exists "platform_audit_select" on public.platform_admin_audit_log;
create policy "platform_audit_select" on public.platform_admin_audit_log for select
  using ( public.is_platform_admin() );
-- No insert/update/delete policy for `authenticated` — service role only.
