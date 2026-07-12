-- ============================================================================
-- Collarone — Projects suite (Stage 6 catalog item, built early)
-- Run after finance.sql. Idempotent. Native multi-tenant from day one.
-- ============================================================================

create or replace function public.has_projects_suite()
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and suites @> '[{"key":"projects"}]'::jsonb);
$$;
grant execute on function public.has_projects_suite() to authenticated;

create or replace function public.is_projects_manager()
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and suites @> '[{"key":"projects","role":"manager"}]'::jsonb);
$$;
grant execute on function public.is_projects_manager() to authenticated;

-- ---- tables first, RLS + helpers after (project_members must exist before
-- is_project_member() is defined against it) --------------------------------

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id),
  name        text not null,
  description text not null default '',
  status      text not null default 'active' check (status in ('active','on_hold','completed','cancelled')),
  owner_id    uuid not null references public.profiles(id),
  start_date  date,
  target_date date,
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now()
);

create table if not exists public.project_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('lead','member')),
  added_at   timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists public.milestones (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id),
  project_id uuid not null references public.projects(id) on delete cascade,
  title      text not null,
  due_date   date,
  status     text not null default 'pending' check (status in ('pending','in_progress','done')),
  sort_order int not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id),
  project_id   uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  title        text not null,
  description  text not null default '',
  assigned_to  uuid references public.profiles(id) on delete set null,
  status       text not null default 'todo' check (status in ('todo','in_progress','in_review','done')),
  priority     text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  due_date     date,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now()
);

-- Helper so the project_members RLS check doesn't recurse (same reason
-- has_hr_suite() exists instead of an inline profiles subquery).
create or replace function public.is_project_member(p_project_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.project_members where project_id = p_project_id and user_id = auth.uid());
$$;
grant execute on function public.is_project_member(uuid) to authenticated;

-- ---- RLS ------------------------------------------------------------------

alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.milestones      enable row level security;
alter table public.project_tasks   enable row level security;

drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects for select using (
  public.same_org(org_id) and (
    public.is_projects_manager() or owner_id = auth.uid() or public.is_project_member(id)
  )
);
drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert" on public.projects for insert with check (
  public.same_org(org_id) and public.has_projects_suite() and owner_id = auth.uid()
);
drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects for update using (
  public.same_org(org_id) and (public.is_projects_manager() or owner_id = auth.uid())
);
drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects for delete using (
  public.same_org(org_id) and (public.is_projects_manager() or owner_id = auth.uid())
);

drop policy if exists "project_members_select" on public.project_members;
create policy "project_members_select" on public.project_members for select using (
  public.same_org(org_id) and (
    public.is_projects_manager() or user_id = auth.uid()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
);
drop policy if exists "project_members_write" on public.project_members;
create policy "project_members_write" on public.project_members for all using (
  public.same_org(org_id) and (
    public.is_projects_manager()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
) with check (
  public.same_org(org_id) and (
    public.is_projects_manager()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
);

drop policy if exists "milestones_select" on public.milestones;
create policy "milestones_select" on public.milestones for select using (
  public.same_org(org_id) and (
    public.is_projects_manager() or public.is_project_member(project_id)
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
);
drop policy if exists "milestones_write" on public.milestones;
create policy "milestones_write" on public.milestones for all using (
  public.same_org(org_id) and (
    public.is_projects_manager()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
) with check (
  public.same_org(org_id) and (
    public.is_projects_manager()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
);

drop policy if exists "project_tasks_select" on public.project_tasks;
create policy "project_tasks_select" on public.project_tasks for select using (
  public.same_org(org_id) and (
    public.is_projects_manager() or public.is_project_member(project_id) or assigned_to = auth.uid()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
);
drop policy if exists "project_tasks_insert" on public.project_tasks;
create policy "project_tasks_insert" on public.project_tasks for insert with check (
  public.same_org(org_id) and (
    public.is_projects_manager() or public.is_project_member(project_id)
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
);
drop policy if exists "project_tasks_update" on public.project_tasks;
create policy "project_tasks_update" on public.project_tasks for update using (
  public.same_org(org_id) and (
    public.is_projects_manager() or assigned_to = auth.uid() or public.is_project_member(project_id)
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
);
drop policy if exists "project_tasks_delete" on public.project_tasks;
create policy "project_tasks_delete" on public.project_tasks for delete using (
  public.same_org(org_id) and (
    public.is_projects_manager()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
);

-- ---- Phase 2 whitelist --------------------------------------------------------
create or replace function public.enforce_phase1_suite_scope() returns trigger
language plpgsql as $$
declare
  safe_suites text[] := array['hr', 'leave', 'tasks', 'visitors', 'payroll', 'crm', 'attendance', 'benefits', 'it-assets', 'procurement', 'inventory', 'finance', 'projects'];
begin
  if new.org_id <> '00000000-0000-0000-0000-000000000001' then
    select coalesce(jsonb_agg(g), '[]'::jsonb) into new.suites
    from jsonb_array_elements(new.suites) g
    where g->>'key' = any(safe_suites);
  end if;
  return new;
end;
$$;
