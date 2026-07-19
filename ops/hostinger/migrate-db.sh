#!/usr/bin/env bash
# Copies data from the live Supabase cloud project into the new VPS Postgres.
# Safe to re-run — used both for the dry run and the final cutover sync.
#
# Requires: SOURCE_DB_URL, TARGET_DB_URL (both full postgresql:// connection strings)
set -euo pipefail

: "${SOURCE_DB_URL:?set SOURCE_DB_URL (Supabase pooler connection string)}"
: "${TARGET_DB_URL:?set TARGET_DB_URL (VPS postgres connection string)}"

OUT=$(mktemp -d)
trap 'rm -rf "$OUT"' EXIT

echo "==> Dumping public schema (app tables, functions, RLS policies) — schema + data"
pg_dump "$SOURCE_DB_URL" \
  --schema=public \
  --no-owner --no-privileges --no-acl \
  --file="$OUT/public.sql"

echo "==> Dumping auth.users + auth.identities — data only"
echo "    (auth schema itself is created by the gotrue container on first boot,"
echo "    so we only copy rows, never the schema/roles)"
pg_dump "$SOURCE_DB_URL" \
  --data-only \
  --table=auth.users --table=auth.identities \
  --no-owner --no-privileges --no-acl \
  --file="$OUT/auth-data.sql"

echo "==> Dumping storage.buckets + storage.objects metadata — data only"
echo "    (actual file bytes are copied separately by storage-migrate.mjs)"
pg_dump "$SOURCE_DB_URL" \
  --data-only \
  --table=storage.buckets --table=storage.objects \
  --no-owner --no-privileges --no-acl \
  --file="$OUT/storage-data.sql"

echo "==> Restoring into target"
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$OUT/public.sql"
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$OUT/auth-data.sql"
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$OUT/storage-data.sql"

echo "==> Done. Run ./verify.sh to compare row counts."
