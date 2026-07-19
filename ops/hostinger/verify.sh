#!/usr/bin/env bash
# Row-count sanity check between source (Supabase cloud) and target (VPS).
# Not a byte-for-byte diff — catches the common failure mode (a table that
# silently didn't copy) before you flip DNS/env vars.
#
# Requires: SOURCE_DB_URL, TARGET_DB_URL
set -euo pipefail

: "${SOURCE_DB_URL:?set SOURCE_DB_URL}"
: "${TARGET_DB_URL:?set TARGET_DB_URL}"

TABLES=(
  public.organizations
  public.profiles
  public.crm_contacts
  public.crm_companies
  public.crm_activities
  public.org_sites
  public.site_pages
  public.site_blocks
  public.site_products
  public.site_orders
  public.site_visits
  auth.users
  storage.objects
)

printf "%-30s %12s %12s\n" "table" "source" "target"
fail=0
for t in "${TABLES[@]}"; do
  src=$(psql "$SOURCE_DB_URL" -tAc "select count(*) from $t" 2>/dev/null || echo "ERR")
  tgt=$(psql "$TARGET_DB_URL" -tAc "select count(*) from $t" 2>/dev/null || echo "ERR")
  mark=""
  if [[ "$src" != "$tgt" ]]; then mark="  <-- MISMATCH"; fail=1; fi
  printf "%-30s %12s %12s%s\n" "$t" "$src" "$tgt" "$mark"
done

if [[ "$fail" -eq 1 ]]; then
  echo
  echo "Mismatches found — re-run migrate-db.sh / storage-migrate.mjs before cutting over."
  exit 1
fi
echo
echo "All row counts match."
