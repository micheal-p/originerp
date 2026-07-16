-- ============================================================================
-- Collarone — Trade Documents letterhead: company branding, signature, and a
-- choice of 6 print templates. Run after trade_documents.sql. Idempotent.
--
-- One settings row per org — logo/address/tagline/signature shown on every
-- invoice/receipt/GRN/SRP that org generates, in whichever of the 6
-- templates they pick. Logo + signature images reuse the existing public
-- 'site-assets' storage bucket (website_builder.sql) rather than standing up
-- a second bucket+policy pair for the same job.
-- ============================================================================

create table if not exists public.trade_doc_settings (
  org_id          uuid primary key references public.organizations(id),
  company_name    text not null default '',
  address         text not null default '',
  tagline         text not null default '',
  phone           text not null default '',
  email           text not null default '',
  logo_url        text not null default '',
  accent_color    text not null default '#0A0E1A',
  signature_name  text not null default '',
  signature_title text not null default '',
  signature_url   text not null default '',
  template_key    text not null default 'classic' check (template_key in ('classic','modern','bold','minimal','corporate','elegant')),
  updated_at      timestamptz not null default now()
);

alter table public.trade_doc_settings enable row level security;
drop policy if exists "trade_doc_settings_select" on public.trade_doc_settings;
create policy "trade_doc_settings_select" on public.trade_doc_settings for select using (
  public.same_org(org_id) and public.has_trade_docs_suite()
);
-- writes only through upsert_trade_doc_settings() below

create or replace function public.upsert_trade_doc_settings(
  p_company_name text default '', p_address text default '', p_tagline text default '',
  p_phone text default '', p_email text default '', p_logo_url text default '', p_accent_color text default '#0A0E1A',
  p_signature_name text default '', p_signature_title text default '', p_signature_url text default '',
  p_template_key text default 'classic'
) returns public.trade_doc_settings language plpgsql security definer set search_path = public as $$
declare
  caller_org uuid;
  row public.trade_doc_settings;
begin
  if not public.is_trade_docs_manager() then raise exception 'Not authorised to change document settings'; end if;
  if p_template_key not in ('classic','modern','bold','minimal','corporate','elegant') then raise exception 'Invalid template'; end if;
  caller_org := public.my_org_id();

  insert into public.trade_doc_settings (
    org_id, company_name, address, tagline, phone, email, logo_url, accent_color,
    signature_name, signature_title, signature_url, template_key, updated_at
  ) values (
    caller_org, trim(coalesce(p_company_name,'')), trim(coalesce(p_address,'')), trim(coalesce(p_tagline,'')),
    trim(coalesce(p_phone,'')), trim(coalesce(p_email,'')), coalesce(p_logo_url,''), coalesce(nullif(trim(p_accent_color),''), '#0A0E1A'),
    trim(coalesce(p_signature_name,'')), trim(coalesce(p_signature_title,'')), coalesce(p_signature_url,''), p_template_key, now()
  )
  on conflict (org_id) do update set
    company_name = excluded.company_name, address = excluded.address, tagline = excluded.tagline,
    phone = excluded.phone, email = excluded.email, logo_url = excluded.logo_url, accent_color = excluded.accent_color,
    signature_name = excluded.signature_name, signature_title = excluded.signature_title, signature_url = excluded.signature_url,
    template_key = excluded.template_key, updated_at = now()
  returning * into row;

  return row;
end;
$$;
grant execute on function public.upsert_trade_doc_settings(text,text,text,text,text,text,text,text,text,text,text) to authenticated;
