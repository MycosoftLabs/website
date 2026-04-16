#!/usr/bin/env bash
# =============================================================================
# Blue/Green One-Time VM Bootstrap
# =============================================================================
# Runs ONCE on the production VM to:
#   1. Create /opt/mycosoft/state/ and /opt/mycosoft/nginx/conf.d/
#   2. Copy nginx.conf + render initial website.conf pointing at BLUE
#   3. Create the `active-slot` file = "blue"
#   4. Start proxy + blue container (green stays off)
#   5. Update cloudflared: still points at origin :3000, now nginx lives there
#   6. Stop the OLD single `website` container (port 3000 gets handed to proxy)
#
# Idempotent — safe to re-run. Does NOT wipe state if it already exists.
# =============================================================================
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/mycosoft/website}"
STATE_DIR="${STATE_DIR:-/opt/mycosoft/state}"
NGINX_DIR="${NGINX_DIR:-/opt/mycosoft/nginx}"
COMPOSE_FILES=(
  "-f" "docker-compose.production.yml"
  "-f" "docker-compose.production.blue-green.yml"
)

log() { echo "[bootstrap] $*"; }
cd "$DEPLOY_DIR"

# 0. Validate merged compose project BEFORE we touch anything.
# This catches config errors (missing dependencies, invalid profiles, etc.)
# before we stop the legacy container, preventing downtime from a broken compose.
log "Validating compose project"
if ! docker compose "${COMPOSE_FILES[@]}" config --quiet 2>&1 | tee /tmp/compose-config.log; then
  echo "[bootstrap] FATAL: compose project is invalid. See /tmp/compose-config.log"
  cat /tmp/compose-config.log
  exit 10
fi
log "Compose project is valid"

# 1. Directories
mkdir -p "$STATE_DIR" "$NGINX_DIR/conf.d"
chmod 755 "$STATE_DIR" "$NGINX_DIR" "$NGINX_DIR/conf.d"

# 2. Seed state file
if [[ ! -s "$STATE_DIR/active-slot" ]]; then
  echo "blue" > "$STATE_DIR/active-slot"
  log "Seeded active-slot = blue"
else
  log "active-slot already present: $(cat "$STATE_DIR/active-slot")"
fi

# 3. Install nginx.conf (OVERWRITE every run — this is how config fixes land)
cp "$DEPLOY_DIR/deploy/nginx/nginx.conf" "$NGINX_DIR/nginx.conf"
log "Installed $NGINX_DIR/nginx.conf"

# 4. Render website.conf for whatever slot is currently active (OVERWRITE)
ACTIVE=$(cat "$STATE_DIR/active-slot")
sed "s|__ACTIVE_SLOT__|$ACTIVE|g" \
  "$DEPLOY_DIR/deploy/nginx/conf.d/website.conf.template" \
  > "$NGINX_DIR/conf.d/website.conf"
log "Rendered $NGINX_DIR/conf.d/website.conf pointing at $ACTIVE"

# 4a. If proxy is already running, reload it so updated configs take effect.
# This handles the case where a previous deploy created the proxy container
# with broken nginx config — next deploy fixes the config file but the
# running nginx process is still running the old broken config.
if docker ps --format '{{.Names}}' | grep -qx 'mycosoft-website-proxy'; then
  log "website-proxy is running — testing + reloading new config"
  if docker exec mycosoft-website-proxy nginx -t 2>&1 | tee /tmp/nginx-test.log | grep -q "syntax is ok"; then
    docker exec mycosoft-website-proxy nginx -s reload && log "nginx reloaded OK"
  else
    log "nginx -t failed — dumping output then recreating container"
    cat /tmp/nginx-test.log
    # Stop + remove the old proxy FIRST so port 3000 is free for the new one.
    # Without this, `compose up --force-recreate` hit "port 3000 already
    # allocated" and the whole deploy aborted without replacing website-blue.
    log "Stopping current proxy to free port 3000"
    docker stop -t 10 mycosoft-website-proxy 2>/dev/null || true
    docker rm -f mycosoft-website-proxy 2>/dev/null || true
    log "Recreating proxy with new config"
    docker compose "${COMPOSE_FILES[@]}" up -d --no-deps website-proxy
  fi
fi

# 5. Free port 3000 from the OLD single-container deploy (if present)
#    Important: we do this BEFORE starting proxy so port bind succeeds.
for name in mycosoft-website website-website-1 website-live; do
  if docker ps --format '{{.Names}}' | grep -qx "$name"; then
    log "Removing legacy container: $name"
    docker stop -t 30 "$name" || true
    docker rm -f "$name" || true
  fi
done

# 6. Start blue + proxy via compose (green stays off via profile)
log "Starting website-blue + website-proxy"
docker compose "${COMPOSE_FILES[@]}" up -d --no-deps website-blue website-proxy

# 7. Wait for proxy to answer /healthz
log "Waiting for website-proxy /healthz"
for i in {1..30}; do
  if curl -fsS -o /dev/null http://localhost:3000/healthz; then
    log "Proxy is up (took ${i}×2s)"
    break
  fi
  sleep 2
done

# 8. Print status
docker compose "${COMPOSE_FILES[@]}" ps
log "Bootstrap complete. Active slot: $(cat "$STATE_DIR/active-slot")"
log "Next deploy: ./scripts/blue-green-deploy.sh"
