#!/bin/bash
#
# Installs this app as two systemd services (API + client), the way it's run on a
# persistent server instead of manually running each side in its own terminal — systemd's
# Restart=always brings a crashed process back on its own, and both units are enabled to
# start on boot, so the app survives both a crash and a reboot with no manual step
# afterward.
#
# This is two independent Node processes, not one:
#   - server: Express API (tsx watch src/index.ts), port $API_PORT, own sqlite db file
#   - client: Vite dev server, port $CLIENT_PORT
# (Pairs with client/vite.config.ts's `server: { host: true, allowedHosts: true }` — that
# makes the dev server reachable from outside localhost at all — and with
# client/src/lib/api.ts deriving the API URL from the page's own hostname instead of a
# hardcoded "localhost", so it works from any machine that can reach this server, not just
# from a browser running on the server itself.)
#
# Like the reference this was adapted from, the user/path/node interpreter below are all
# detected from the environment this script actually runs in, not hardcoded — so copying
# this repo to a new path or a new machine doesn't leave stale paths behind. Runs the same
# dev servers as `npm run dev` in each of client/ and server/ (invoking tsx/vite directly
# rather than through npm — see the ExecStart comment below for why), not a production
# build.
#
# Usage:
#   sudo ./install_systemd_service.sh
#
# Must be run with sudo (writes to /etc/systemd/system and /var/log). Safe to re-run any
# time the repo path or Node version changes — it won't overwrite an existing server/.env,
# so re-running never resets your admin password or JWT secret.

set -eo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: run this with sudo (it writes to /etc/systemd/system and /var/log)." >&2
    echo "  sudo $0" >&2
    exit 1
fi

# The real (non-root) user and repo path, even under sudo — SUDO_USER/pwd, not root's.
APP_USER="${SUDO_USER:-$(logname 2>/dev/null || whoami)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_PORT=4000
CLIENT_PORT=5173
LOG_DIR="/var/log/app_school"

# Resolve node/npm as the target user would see them (nvm installs are per-user and not on
# root's PATH), so the unit files get absolute paths systemd can actually exec — systemd
# services don't source .bashrc/.profile, so relying on PATH at runtime wouldn't work even
# if this script's own PATH happens to resolve it.
#
# Source nvm.sh directly rather than going through a login shell (bash -lc): nvm's installer
# appends its init lines to ~/.bashrc, which only runs for *interactive* shells — a
# non-interactive login shell skips them.
NODE_BIN="$(sudo -u "$APP_USER" bash -c '
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    command -v node
' 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
    echo "ERROR: couldn't resolve 'node' for user $APP_USER (checked via their login shell, e.g. nvm)." >&2
    echo "Make sure Node is installed for that user, then re-run." >&2
    exit 1
fi
# npm ships next to node in the same bin directory for every install method this project
# supports (nvm, system package, nodesource) — cheaper and just as reliable as a second
# nvm-sourcing subshell to look it up separately.
NODE_DIR="$(dirname "$NODE_BIN")"
NPM_BIN="$NODE_DIR/npm"
if [ ! -x "$NPM_BIN" ]; then
    echo "ERROR: found node at $NODE_BIN but no npm alongside it at $NPM_BIN." >&2
    exit 1
fi

# Same auto-install idiom as a plain `npm install`, for each app — so this script is
# self-contained on a fresh clone, no separate "run this other step first" to remember.
# Note: server/'s better-sqlite3 is a native addon; if no prebuilt binary matches this
# machine's platform, npm install compiles it from source, which needs a C++ toolchain and
# python3 (e.g. `apt install build-essential python3`) — install those first if this fails.
for APP_DIR in "$SCRIPT_DIR/server" "$SCRIPT_DIR/client"; do
    if [ ! -d "$APP_DIR/node_modules" ]; then
        echo "--> node_modules missing in $APP_DIR, installing dependencies (as $APP_USER)..."
        sudo -u "$APP_USER" "$NPM_BIN" install --prefix "$APP_DIR"
    fi
done

# server/.env is gitignored (it holds JWT_SECRET and the admin login), so a fresh clone
# never has one. Create it from the checked-in template with a freshly generated secret —
# but only if it's missing, so re-running this script never rotates an existing deployment's
# secret out from under already-issued logins.
if [ ! -f "$SCRIPT_DIR/server/.env" ]; then
    echo "--> server/.env missing, creating one from .env.example with a random JWT secret..."
    JWT_SECRET="$(openssl rand -hex 32)"
    sed "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" "$SCRIPT_DIR/server/.env.example" > "$SCRIPT_DIR/server/.env"
    chown "$APP_USER":"$APP_USER" "$SCRIPT_DIR/server/.env"
    echo "    Admin login will be ADMIN_USERNAME=admin / ADMIN_PASSWORD=change-me (from .env.example)."
    echo "    Edit $SCRIPT_DIR/server/.env to set a real password, then: sudo systemctl restart app_school_api"
fi

echo "========================================"
echo " Installing systemd services"
echo "========================================"
echo "  App directory: $SCRIPT_DIR"
echo "  Running as:    $APP_USER"
echo "  Node:          $NODE_BIN"
echo "  Logs:          $LOG_DIR"
echo "  API port:      $API_PORT"
echo "  Client port:   $CLIENT_PORT"
echo "========================================"

mkdir -p "$LOG_DIR"
chown "$APP_USER":"$APP_USER" "$LOG_DIR"

# If a manually-run `npm run dev` (or an earlier ad-hoc process) is still holding one of
# these ports, starting the systemd unit would just crash-loop against "port already in
# use" instead of taking over — same class of problem as two process managers fighting over
# one port. Stop the systemd units first (if this is a re-run), then clear anything else
# still bound to each port, so systemd ends up the sole owner.
for ENTRY in "app_school_api:$API_PORT" "app_school_client:$CLIENT_PORT"; do
    SVC="${ENTRY%%:*}"
    PORT="${ENTRY##*:}"
    systemctl stop "$SVC.service" 2>/dev/null || true
    STRAY_PID="$(lsof -ti:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
    if [ -n "$STRAY_PID" ]; then
        echo "--> Killing process already listening on port $PORT (PID $STRAY_PID) so systemd can take it over"
        kill $STRAY_PID 2>/dev/null || true
        sleep 1
    fi
done

cat > /etc/systemd/system/app_school_api.service <<EOF
[Unit]
Description=App School - API Server
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$SCRIPT_DIR/server
# Invoke node directly on tsx's own entry file rather than going through \`npm run dev\`:
# npm's executable is itself a shebang script ("#!/usr/bin/env node"), and systemd's bare
# default PATH doesn't include node's directory — so \`env node\` fails with "not found" and
# the unit crash-loops silently (RestartSec=5, forever) without ever binding the port.
# Calling node directly on tsx's CLI file sidesteps shebang resolution entirely.
Environment=PATH=$NODE_DIR:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=$NODE_BIN $SCRIPT_DIR/server/node_modules/.bin/tsx watch src/index.ts
Restart=always
RestartSec=5

StandardOutput=append:$LOG_DIR/api_out.log
StandardError=append:$LOG_DIR/api_err.log

[Install]
WantedBy=multi-user.target
EOF
echo "--> Wrote /etc/systemd/system/app_school_api.service"

cat > /etc/systemd/system/app_school_client.service <<EOF
[Unit]
Description=App School - Client (Vite Dev Server)
After=network.target app_school_api.service
Wants=app_school_api.service

[Service]
User=$APP_USER
WorkingDirectory=$SCRIPT_DIR/client
# Same direct-node invocation as the API unit, and for the same reason — sidesteps vite's
# own shebang so it doesn't depend on node being on systemd's default PATH.
Environment=PATH=$NODE_DIR:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=$NODE_BIN $SCRIPT_DIR/client/node_modules/.bin/vite --port $CLIENT_PORT
Restart=always
RestartSec=5

StandardOutput=append:$LOG_DIR/client_out.log
StandardError=append:$LOG_DIR/client_err.log

[Install]
WantedBy=multi-user.target
EOF
echo "--> Wrote /etc/systemd/system/app_school_client.service"

# Without this, the *_out.log/*_err.log files grow forever — StandardOutput=append: has no
# built-in size cap (unlike journald), and Vite's own request/HMR logging is enough to fill
# a disk over weeks/months.
#
# copytruncate (not the default create/rename strategy) is required here specifically
# because each service holds its log file open for its entire lifetime (StandardOutput=append:,
# not journald) — a rename-based rotation would leave it writing forever into the old,
# now-unlisted file while logrotate's newly-created file stays empty. copytruncate copies the
# current content out, then truncates the original in place, so the already-open file
# descriptor keeps writing to the same inode.
cat > /etc/logrotate.d/app_school <<EOF
$LOG_DIR/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
echo "--> Wrote /etc/logrotate.d/app_school (daily rotation, 14 days retained, compressed)"

systemctl daemon-reload
systemctl enable app_school_api.service app_school_client.service
systemctl restart app_school_api.service app_school_client.service

# Confirm each server is actually answering, not just that `systemctl restart` returned — a
# crash-looping unit still makes `restart` exit 0 immediately, so this is the only real
# proof it worked. First compile/boot can take a few seconds, so poll instead of a single
# check.
check_up() {
    local url="$1"
    for _ in $(seq 1 15); do
        if curl -sf "$url" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done
    return 1
}

echo "--> Waiting for the API to answer on port $API_PORT..."
API_UP=0
check_up "http://localhost:$API_PORT/api/health" && API_UP=1

echo "--> Waiting for the client to answer on port $CLIENT_PORT..."
CLIENT_UP=0
check_up "http://localhost:$CLIENT_PORT" && CLIENT_UP=1

if [ "$API_UP" -ne 1 ] || [ "$CLIENT_UP" -ne 1 ]; then
    echo "========================================" >&2
    echo " ERROR: services installed, but something isn't answering:" >&2
    [ "$API_UP" -ne 1 ] && echo "   - API (port $API_PORT) is not responding" >&2
    [ "$CLIENT_UP" -ne 1 ] && echo "   - Client (port $CLIENT_PORT) is not responding" >&2
    echo " It's likely crash-looping — recent log output:" >&2
    echo "========================================" >&2
    [ "$API_UP" -ne 1 ] && { journalctl -u app_school_api.service --no-pager -n 30 >&2; tail -n 30 "$LOG_DIR/api_err.log" 2>/dev/null >&2; }
    [ "$CLIENT_UP" -ne 1 ] && { journalctl -u app_school_client.service --no-pager -n 30 >&2; tail -n 30 "$LOG_DIR/client_err.log" 2>/dev/null >&2; }
    echo "========================================" >&2
    echo " Full status: systemctl status app_school_api.service app_school_client.service" >&2
    exit 1
fi

echo "========================================"
echo " Done. Open the app at: http://$(hostname -I | awk '{print $1}'):$CLIENT_PORT"
echo " Both services will:"
echo "   - restart automatically if they crash (Restart=always)"
echo "   - start automatically on boot (systemctl enable)"
echo "   - have their logs rotated daily, 14 days kept (see /etc/logrotate.d/app_school)"
echo "========================================"
echo "Check status:  systemctl status app_school_api.service app_school_client.service"
echo "Watch logs:    tail -f $LOG_DIR/api_out.log $LOG_DIR/client_out.log"
echo "Restart:       sudo systemctl restart app_school_api.service app_school_client.service"
echo "Test log rotation config: sudo logrotate -d /etc/logrotate.d/app_school"
