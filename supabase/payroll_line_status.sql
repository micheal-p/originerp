-- Banking Wall #2: per-payment status on payroll lines, so failed transfers
-- (wrong account number, bank bounce) are tracked line by line. Idempotent.
alter table public.payroll_lines add column if not exists payment_status text not null default 'pending'
  check (payment_status in ('pending','paid','failed'));
alter table public.payroll_lines add column if not exists payment_note text not null default '';
