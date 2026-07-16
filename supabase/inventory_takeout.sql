-- ============================================================================
-- Collarone — Inventory: sale vs. staff-use items + Takeout/Return workflow.
-- Run after inventory_booking.sql. Idempotent. Native multi-tenant.
--
-- Not every inventory item is for sale — some exist for staff to check out
-- (tools, uniforms, samples, loaner equipment). A senior worker tags an item
-- to a staff member (a "Takeout"), stock physically moves out at that point;
-- when the staff member is done, a "Return" moves it back in. Both steps
-- generate a real, downloadable, Documents-filed record (see the client side
-- for the actual document generation — this file is schema + bookkeeping
-- only). Notification for v0 is in-app (a Task assigned to the staff member)
-- — real email/WhatsApp sending isn't wired up anywhere in this codebase yet
-- (CRM email replies are still "coming soon" pending a mailbox; WhatsApp is
-- manual wa.me links only), so it isn't faked here either.
-- ============================================================================

alter table public.stock_items add column if not exists for_sale boolean not null default true;
alter table public.stock_items add column if not exists for_staff_use boolean not null default false;

create table if not exists public.stock_takeouts (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id),
  item_id      uuid not null references public.stock_items(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id),
  quantity     numeric not null check (quantity > 0),
  staff_id     uuid not null references public.profiles(id),
  approved_by  uuid not null references public.profiles(id),
  status       text not null default 'approved' check (status in ('approved','returned','cancelled')),
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  returned_at  timestamptz
);

create index if not exists stock_takeouts_org_idx on public.stock_takeouts (org_id, status, created_at desc);

alter table public.stock_takeouts enable row level security;
drop policy if exists "stock_takeouts_select" on public.stock_takeouts;
create policy "stock_takeouts_select" on public.stock_takeouts for select using (
  public.same_org(org_id) and (public.has_inventory_suite() or staff_id = auth.uid())
);
-- writes only through the RPCs below (they also touch stock bookkeeping)

-- A senior worker (inventory manager) tags a staff member to take an item
-- out. Real stock leaves the shelf immediately — reuses the same atomic
-- bookkeeping every other stock-out goes through.
create or replace function public.create_takeout(
  p_item_id uuid, p_warehouse_id uuid, p_quantity numeric, p_staff_id uuid, p_notes text default ''
) returns public.stock_takeouts language plpgsql security definer set search_path = public as $$
declare
  caller_org uuid;
  row public.stock_takeouts;
begin
  if not public.is_inventory_manager() then raise exception 'Not authorised to assign a takeout'; end if;
  if p_quantity <= 0 then raise exception 'Quantity must be positive'; end if;
  caller_org := public.my_org_id();

  if not exists (select 1 from public.stock_items where id = p_item_id and org_id = caller_org and for_staff_use = true) then
    raise exception 'This item is not marked for staff use';
  end if;
  if not exists (select 1 from public.profiles where id = p_staff_id and org_id = caller_org) then
    raise exception 'Unknown staff member';
  end if;

  perform public.record_stock_movement(p_item_id, p_warehouse_id, 'out', p_quantity, null, 'Staff takeout', coalesce(trim(p_notes), ''));

  insert into public.stock_takeouts (org_id, item_id, warehouse_id, quantity, staff_id, approved_by, notes)
  values (caller_org, p_item_id, p_warehouse_id, p_quantity, p_staff_id, auth.uid(), coalesce(trim(p_notes), ''))
  returning * into row;

  -- The in-app notification: a real Task assigned to the staff member, done
  -- here (not client-side) so it's guaranteed to happen with the takeout,
  -- not a best-effort follow-up call that could silently fail.
  insert into public.tasks (title, description, assigned_to, created_by, priority, status, org_id, due_date)
  select 'Pick up: ' || si.name || ' x' || p_quantity, coalesce(trim(p_notes), 'Tagged by a senior worker — collect from ' || w.name || '.'),
         p_staff_id, auth.uid(), 'medium', 'todo', caller_org, current_date
  from public.stock_items si, public.warehouses w
  where si.id = p_item_id and w.id = p_warehouse_id;

  return row;
end;
$$;
grant execute on function public.create_takeout(uuid, uuid, numeric, uuid, text) to authenticated;

-- Staff member (or a manager on their behalf) returns what was taken out —
-- moves the stock back in and closes the takeout.
create or replace function public.return_takeout(p_id uuid, p_notes text default '')
returns public.stock_takeouts language plpgsql security definer set search_path = public as $$
declare
  caller_org uuid;
  row public.stock_takeouts;
begin
  caller_org := public.my_org_id();
  select * into row from public.stock_takeouts where id = p_id and org_id = caller_org for update;
  if row.id is null then raise exception 'Takeout not found'; end if;
  if row.status <> 'approved' then raise exception 'This takeout has already been closed'; end if;
  if not (public.is_inventory_manager() or row.staff_id = auth.uid()) then
    raise exception 'Not authorised to return this item';
  end if;

  perform public.record_stock_movement(row.item_id, row.warehouse_id, 'in', row.quantity, null, 'Staff return',
    case when coalesce(trim(p_notes), '') <> '' then trim(p_notes) else 'Returned takeout' end);

  update public.stock_takeouts set status = 'returned', returned_at = now(),
    notes = case when coalesce(trim(p_notes), '') <> '' then row.notes || ' — ' || trim(p_notes) else row.notes end
  where id = p_id
  returning * into row;

  return row;
end;
$$;
grant execute on function public.return_takeout(uuid, text) to authenticated;

create or replace function public.cancel_takeout(p_id uuid)
returns public.stock_takeouts language plpgsql security definer set search_path = public as $$
declare
  caller_org uuid;
  row public.stock_takeouts;
begin
  if not public.is_inventory_manager() then raise exception 'Not authorised to cancel a takeout'; end if;
  caller_org := public.my_org_id();
  select * into row from public.stock_takeouts where id = p_id and org_id = caller_org for update;
  if row.id is null then raise exception 'Takeout not found'; end if;
  if row.status <> 'approved' then raise exception 'This takeout has already been closed'; end if;

  perform public.record_stock_movement(row.item_id, row.warehouse_id, 'in', row.quantity, null, 'Takeout cancelled', 'Reversed — cancelled by manager');

  update public.stock_takeouts set status = 'cancelled', returned_at = now() where id = p_id returning * into row;
  return row;
end;
$$;
grant execute on function public.cancel_takeout(uuid) to authenticated;

-- ---- profiles_select: fourth replace of this policy — the staff picker for
-- "who is this being tagged to" needs inventory managers (without HR/Payroll)
-- to actually see other profiles' names, same broadening pattern already
-- done three times before (hr_multitenancy.sql, leave_multitenancy.sql,
-- payroll_multitenancy.sql). Without this, /staff silently returns only the
-- caller's own row for anyone who isn't also HR/Payroll — a pre-existing gap
-- for the Tasks assignee picker too, surfaced here because this feature
-- needs it to actually work out of the box.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (
    id = auth.uid()
    or (public.is_super_admin() and public.same_org(org_id))
    or (public.has_hr_suite() and public.same_org(org_id))
    or (public.has_payroll_suite() and public.same_org(org_id))
    or (public.has_inventory_suite() and public.same_org(org_id))
    or public.is_platform_admin()
  );
