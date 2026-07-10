-- ============================================================================
-- Collarone — real status monitoring
-- Run anytime (no dependency on other Stage-2 files). Idempotent.
--
-- Records genuine health-check pings (client/api/health.js, triggered by a
-- Vercel Cron job) rather than a hardcoded "all systems operational". Public
-- read access is intentional — this is what a status page is for.
-- ============================================================================

create table if not exists public.status_checks (
  id           uuid primary key default gen_random_uuid(),
  checked_at   timestamptz not null default now(),
  api_ok       boolean not null,
  db_ok        boolean not null,
  response_ms  int not null
);

alter table public.status_checks enable row level security;

drop policy if exists "status_checks_select" on public.status_checks;
create policy "status_checks_select" on public.status_checks for select
  using ( true );
-- No insert/update/delete policy for `authenticated` or `anon` — written only
-- by the service role from the cron-triggered health check.

create index if not exists status_checks_checked_at_idx on public.status_checks (checked_at desc);
