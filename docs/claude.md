# Session Log — Deployment Setup, Master Account, Activity Monitoring, UI Changes

This document summarizes the work done in one Claude Code session on this repo (app_school:
a school management app with an Express/better-sqlite3 `server` and a Vite/React `client`).

## 1. First push to GitHub

- Fixed a push failure caused by `gh`/git being authenticated as the wrong GitHub account
  (`hanancyberitex` instead of `hanan1312`) — resolved via `gh auth login` (device flow).
- Before the very first push, cleaned up the repo since nothing had been pushed yet:
  - Removed `server/node_modules` (1983 files, ~34MB of compiled binaries) and
    `server/school.db*` from tracking; added a root `.gitignore`.
  - Removed `client/.env` and `server/.env` from tracking — `server/.env` contained a real
    `JWT_SECRET` and `ADMIN_USERNAME`/`ADMIN_PASSWORD` (admin/admin123) that should never have
    been committed. Added `.env.example` files for both apps instead.
  - All of this was folded into the single pre-push commit via `git commit --amend` (safe
    since nothing had been pushed anywhere yet).

## 2. `install_systemd_service.sh`

Added a root-level install script (`sudo ./install_systemd_service.sh`) so the app can be
pulled onto a fresh server and run as two persistent systemd services:

- **`app_school_api`** — the Express server (`tsx watch src/index.ts`), default port 4000.
- **`app_school_client`** — the Vite dev server, default port 5173.

Design notes and fixes made while getting it working on a real server (an Oracle Cloud
Ampere/arm64 Ubuntu 20.04 VM):

- Resolves Node/npm via the target user's nvm install (not root's), since systemd units need
  absolute paths and don't source `.bashrc`.
- Invokes `tsx`/`vite` directly via `node <path-to-bin>` rather than through `npm run dev`,
  to sidestep their `#!/usr/bin/env node` shebang failing under systemd's bare default PATH.
- Always re-runs `npm install` for both apps on every re-run (not just when `node_modules` is
  missing), so a `git pull` that adds a new dependency doesn't get silently skipped.
- Fixed `npm install` failing under `sudo -u <user>` with `env: node: not found` — the target
  user's ambient PATH under plain `sudo -u` doesn't include their nvm directory the way the
  earlier login-shell detection did; now explicitly prepends it.
- Auto-detects whether the default `g++` can build `better-sqlite3` (needs C++20 support —
  some base images ship `g++-9`, which fails with `unrecognized command line option
  '-std=c++20'`) and installs a newer `g++` via `apt` if not, scoped to just that build.
- Surfaces real `apt-get` errors instead of failing silently under `set -e` (an earlier
  version used `apt-get update -qq`, which also swallows *error* output).
- Auto-creates `server/.env` from `.env.example` with a freshly generated `JWT_SECRET` on
  first run only (never overwrites an existing one, so re-running never rotates a live
  deployment's secret).
- Adds `client/vite.config.ts`'s `server: { host: true, allowedHosts: true }` and made
  `client/src/lib/api.ts`'s API URL derive from `window.location.hostname` (with an optional
  `VITE_API_URL`/`VITE_API_PORT` override) instead of a hardcoded `localhost:4000` — otherwise
  the app only worked when opened on the server itself, not from another machine.

## 3. Master account (JSON-defined superuser)

Replaced the old env-seeded default admin (`ADMIN_USERNAME`/`ADMIN_PASSWORD` in `.env`, which
was also the source of a "wrong password" bug) with a fixed **master account**:

- Defined in `server/master-account.json` (gitignored; `server/master-account.example.json`
  is the committed template). Auto-created on first server boot with a placeholder password
  if missing — never overwritten on subsequent boots.
- Checked before the database on login. Carries `role: "master"` in its own JWT and is not a
  row in the `users` table — it has `id: 0` and bypasses every module/admin permission check
  (`requireModule`, `requireAdmin`, and the Control/Users page's finer-grained "only an admin
  can..." checks) via that `role` flag rather than a DB lookup.
- The old `seedUsers()` auto-admin was removed entirely. Regular admins/staff are now only
  created through the app's own Users page (formerly "Control", see §5) — not seeded from
  config. A username matching the master account's is rejected when creating a new user.

## 4. Activity Monitor (presence + audit log)

Added an "Activity" tab (inside the Users page) visible to `admin`/`master`, showing:

- **Who's online** — username, role, status (online/idle/offline), login time, session
  duration, idle duration, and time of going offline. Refreshes every 15s.
- **Recent activity** — an audit log of every write action (create/update/delete) anyone
  takes across the app: who, which endpoint/module, and the result status code.

How it works:

- The client (`AuthContext.tsx`) tracks real activity (mouse/keyboard/scroll/click/touch) and
  sends a heartbeat every 20s to `/api/presence/heartbeat`, reporting `idle: true` after 3
  minutes of no interaction.
- The server (`presence.ts`) marks a session `offline` if heartbeats stop for ~80s (closed
  tab, lost connection) — computed lazily whenever the presence list is read, no cron job.
- **`offline` is a terminal state**: once marked offline (via explicit logout or the stale
  heartbeat timeout), a heartbeat arriving afterwards (a reconnecting tab, another tab left
  open elsewhere) does *not* flip it back to online/idle. Only an actual fresh login does.
- `POST /api/auth/logout` (new endpoint) finalizes idle time and marks the session offline
  immediately, rather than the client only clearing local storage.
- The audit log (`activityLog.ts`) is populated by one global Express middleware that logs
  every authenticated non-GET `/api/*` request, rather than hand-instrumenting each route.
  A real bug was caught and fixed here during testing: nested routers (e.g.
  `app.use("/api/users", usersRouter)`) temporarily strip the mount prefix from
  `req.path`/`req.url`, and a route handler that ends the response without calling `next()`
  (the normal case) never triggers Express's restore — so reading `req.path` *after* the
  response (inside a `res.on("finish", ...)` callback) saw `"/"` instead of `"/api/users"`.
  Fixed by capturing the path before calling `next()`.
- **The master account is excluded from the audit log entirely** (its logins, logouts, and
  actions, including failed login attempts against `master`) — it's an operator/setup
  identity, not a tracked staff account. A one-time cleanup on server startup also purges any
  master-related rows already written, so upgrading a running deployment clears old history.

## 5. Navigation: Control → Users, new empty Control tab

- The nav item that managed system users and access (was "Control", at `/control`) is now
  **"Users"** at `/users` — same page, same `control` permission, so no one's granted access
  changed.
- A new, currently **empty** "Control" tab takes over `/control`, gated by its own
  independent `controlPanel` permission (grantable separately from the Users page's access
  modal). Just a placeholder ("This section is coming soon") for now.

## 6. Students table: grouped by Division / Section

The Students table now groups rows into collapsible sub-tables by **Division / Section**
(the school's stage/level split) instead of one long flat list:

- Each group is a clickable, centered header row (e.g. "المرحلة الابتدائية / أولى ابتدائى
  (18)") that expands to show that section's roster on click.
- A lone group (e.g. the sidebar already has one class selected) stays expanded by default —
  collapsing the only group would just add a click for no benefit.
- Existing column filters, sorting, and bulk-select still operate across all groups.

## 7. Student ID card: QR code repositioned

Moved the QR code from stacked under the student's photo (top-right) to the **bottom-right
corner** of the card, next to the Name/Grade/Class/Id fields.

## Files touched (non-exhaustive, by area)

- **Deployment**: `install_systemd_service.sh`, `.gitignore`, `server/.env.example`,
  `client/.env.example`, `client/vite.config.ts`, `client/src/lib/api.ts`.
- **Master account**: `server/src/masterAccount.ts`, `server/master-account.example.json`,
  `server/src/routes/auth.ts`, `server/src/permissions.ts`, `server/src/routes/users.ts`,
  `server/src/db.ts`.
- **Activity monitoring**: `server/src/presence.ts`, `server/src/activityLog.ts`,
  `server/src/routes/presence.ts`, `server/src/routes/activity.ts`, `server/src/index.ts`,
  `client/src/components/ActivityMonitor.tsx`, `client/src/context/AuthContext.tsx`,
  `client/src/lib/api.ts`, `client/src/lib/types.ts`.
- **Navigation**: `client/src/lib/modules.ts`, `client/src/App.tsx`,
  `client/src/pages/UsersPage.tsx` (renamed from `ControlPage.tsx`),
  `client/src/pages/ControlPage.tsx` (new, empty), `client/src/components/DashboardLayout.tsx`.
- **Students table**: `client/src/components/StudentsTable.tsx`.
- **ID cards**: `client/src/components/StudentCardsModal.tsx`.
