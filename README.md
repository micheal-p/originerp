# Org-Ops Cloud ERP

Modular, multi-tenant ERP suite platform for **Origin Tech Group** — a Microsoft-365-style
app launcher where staff sign in and enter only the suites a System Admin has granted them.

> Per the PRD/FRD: React (Vite) front-end · Node/Express API · MongoDB (multi-tenant via
> `tenantId` discriminator) · JWT auth · granular RBAC · admin-provisioned accounts.

## Architecture

```
org-ops-erp/
├── server/        Node + Express + Mongoose API (auth, RBAC, tenant scoping, provisioning)
└── client/        React + Vite SPA (suite launcher, login, admin center, suite shells)
```

### Suites
**MVP core:** HR & Staff · Leave · Task & Report · Visitor Management
**Extended:** IT Assets · Procurement · Inventory · Finance · Projects · Documents

### Access model
- **No self-signup.** The System Admin creates every staff account.
- Each user gets a **system role** (`super_admin` / `manager` / `staff`) and a list of
  **granted suites**, each with a per-suite role (`manager` / `member`).
- A user can only open a suite they were granted. The launcher greys out the rest, and the
  API enforces it on every request (`requireSuite`).

## Local setup

```bash
# 1. Install deps (root installs both workspaces)
npm install

# 2. Start MongoDB locally
brew services start mongodb-community@8.0     # or: mongod --config /usr/local/etc/mongod.conf

# 3. Configure env
cp server/.env.example server/.env            # defaults work for local

# 4. Seed the tenant + System Admin account
npm run seed

# 5. Run API + web together
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:5173

### Default System Admin (from seed)
```
admin@origingroupng.com  /  ChangeMe!2026
```
Change this immediately after first login.

## Going to production (Mongo Atlas)
Set `MONGO_URI` in `server/.env` to your Atlas connection string and rotate `JWT_SECRET` /
`JWT_REFRESH_SECRET`. Nothing else changes — the data layer is environment-driven.
