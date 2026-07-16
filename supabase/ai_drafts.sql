-- ============================================================================
-- Collarone — AI-drafted automation messages via the OpenAI Batch API.
-- Run after automation.sql. Idempotent.
--
-- Batch API is specifically for async, non-real-time, cost-optimised bulk
-- jobs — which is exactly what a once-daily automation sweep is. Flow
-- (all in client/api/automations-run.js, this file is schema only):
--   1. Each daily run first checks any 'batched' row whose OpenAI batch has
--      completed, and appends the drafted text onto the org_notice/task it
--      belongs to.
--   2. Then evaluates the usual checks; any org that opted an automation
--      into "useAI" gets a 'pending' row per subject instead of a
--      fixed-template message.
--   3. Finally, any 'pending' rows across all orgs are bundled into ONE
--      OpenAI batch job (cheaper than one request per org) and marked
--      'batched'. Results land on tomorrow's run (batch jobs are async,
--      up to 24h) — that's a deliberate, honest trade-off, not a bug.
-- No automated sending exists yet (see automation.sql's own note) — a
-- drafted message is attached to the existing in-app notice/task for a
-- human to copy and actually send.
-- ============================================================================

create table if not exists public.ai_draft_requests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id),
  kind         text not null check (kind in ('invoice_reminder','lead_followup')),
  subject_id   uuid not null,          -- trade_documents.id or crm_contacts.id
  subject_label text not null default '',
  context      jsonb not null default '{}'::jsonb,
  status       text not null default 'pending' check (status in ('pending','batched','done','failed')),
  draft_text   text not null default '',
  batch_id     text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists ai_draft_requests_status_idx on public.ai_draft_requests (status, batch_id);
create index if not exists ai_draft_requests_org_idx on public.ai_draft_requests (org_id, kind, subject_id);

alter table public.ai_draft_requests enable row level security;
drop policy if exists "ai_draft_requests_select" on public.ai_draft_requests;
create policy "ai_draft_requests_select" on public.ai_draft_requests for select using (
  public.same_org(org_id) and public.has_automation_suite()
);
-- written only by the service-role cron function, never by regular users.
