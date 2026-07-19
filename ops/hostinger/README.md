# Collarone — Supabase Cloud → Hostinger KVM 2 migration runbook

Goal: self-host the Supabase stack (Postgres + Auth + REST + Storage) on a
Hostinger KVM 2 VPS behind `api.<domain>`, keep the frontend + serverless
functions on Vercel, and cut over with a rollback path.

## 0. Purchases (owner)
- KVM 2 (France or UK DC, Ubuntu 24.04 LTS)
- Domain (collarone.com / .app / .ng) in the same account
- Email hosting for the domain (unlocks hello@ + SMTP)

## 1. DNS (Hostinger DNS panel)
| Record | Host | Value |
|---|---|---|
| A     | api   | <VPS IP> |
| CNAME | @     | cname.vercel-dns.com (add domain in Vercel first) |
| CNAME | www   | cname.vercel-dns.com |
| CNAME | *     | cname.vercel-dns.com (wildcard for tenant subdomains) |
| MX/TXT| —     | as given by Hostinger email setup |

## 2. Provision the VPS (run as root)
```bash
apt update && apt upgrade -y
apt install -y docker.io docker-compose-v2 ufw
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
mkdir -p /opt/collarone && cd /opt/collarone
# copy this folder's docker-compose.yml, Caddyfile, .env (from .env.example)
docker compose up -d
```
Secrets in `.env`: generate JWT_SECRET (openssl rand -hex 32), then derive
ANON_KEY / SERVICE_ROLE_KEY as JWTs signed with it (roles `anon` /
`service_role`) — `node make-keys.mjs` in this folder does it.

## 3. Dry-run data copy (Supabase stays live)
```bash
SOURCE_DB_URL=postgresql://postgres.<ref>:<password>@aws-1-eu-north-1.pooler.supabase.com:5432/postgres \
TARGET_DB_URL=postgresql://postgres:<vps-pg-password>@127.0.0.1:5432/postgres \
./migrate-db.sh
node storage-migrate.mjs   # needs SOURCE_URL/SOURCE_SERVICE_KEY + TARGET_URL/TARGET_SERVICE_KEY
./verify.sh                # row-count comparison, both databases
```

## 4. Point a STAGING check at the new backend
Set VITE_SUPABASE_URL=https://api.<domain> + new anon key in a local `npm run
dev`, log in, run: login, guest mode, store page, checkout, CRM inbox.

## 5. Cutover (quiet window, ~30 min)
1. Announce/observe low traffic; pause signups if paranoid.
2. Re-run migrate-db.sh + storage-migrate.mjs (final sync).
3. Vercel env: SUPABASE_URL, SUPABASE_SERVICE_KEY, VITE_SUPABASE_URL,
   VITE_SUPABASE_ANON_KEY → new values. `vercel --prod`.
4. Full E2E on production. Watch /status.
5. Keep Supabase project untouched 7 days as rollback (flip envs back = instant revert).

## 6. Day-2 (before calling it done)
- Nightly backups: cron `pg_dump | age -e | rclone to offsite` (template in crontab.txt)
- Uptime: point the existing /api/health monitoring at the new stack
- Postgres + container updates: monthly window

## Rollback
Flip the four Vercel env vars back to the Supabase cloud values and redeploy.
Data written after cutover would need reverse-syncing — hence the quiet window.
