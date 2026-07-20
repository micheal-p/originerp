#!/usr/bin/env bash
# Deploy collarone to the VPS. Ships code over rsync (the GitHub repo is
# private and keyed to developer machines, not the server) then rebuilds
# and restarts the service remotely.
#
# Requires SSH access to the server already set up (key-based auth
# recommended; the initial deploy used password auth via sshpass while
# a key was provisioned). The server-side /opt/collarone/app/.env is
# managed separately on the box and is never touched by this script.
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-72.61.156.142}"
REMOTE_USER="${REMOTE_USER:-root}"
APP_DIR="${APP_DIR:-/opt/collarone/app}"
SSH="ssh ${REMOTE_USER}@${REMOTE_HOST}"

echo "==> Syncing code to ${REMOTE_HOST}:${APP_DIR}"
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '**/.env' \
  client server package.json package-lock.json \
  "${REMOTE_USER}@${REMOTE_HOST}:${APP_DIR}/"

echo "==> Installing dependencies + building on the server"
$SSH bash -s <<EOF
set -euo pipefail
cd "${APP_DIR}"
npm ci --workspace client
npm ci --prefix server

# Bake VITE_* build-time vars from the server's .env into client/.env
grep '^VITE_' .env > client/.env

npm run build --workspace client

chown -R collarone:collarone "${APP_DIR}"
systemctl restart collarone-api
nginx -t && systemctl reload nginx

echo "Deployed \$(git -C "${APP_DIR}" rev-parse --short HEAD 2>/dev/null || echo 'n/a') at \$(date -u +%FT%TZ)"
EOF

echo "==> Done"
