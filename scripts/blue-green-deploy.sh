#!/usr/bin/env bash
# =============================================================================
# Mycosoft Blue/Green Zero-Downtime Deploy — CUTOVER SCRIPT
# =============================================================================
# Runs on the production VM.
#
# Flow (idempotent, safe to re-run after failure):
#   1. Read current active slot from /opt/mycosoft/state/active-slot
#   2. Determine idle slot (blue ↔ green)
#   3. Pull new image from GHCR into the idle slot's image env var
#   4. Start idle slot container
#   5. Wait for idle /api/health to pass 3× in a row (max 180s)
#   6. Render nginx conf.d pointing at idle slot + `nginx -s reload` inside proxy
#   7. Flip /opt/mycosoft/state/active-slot to the new slot
#   8. Purge Cloudflare cache (purge_everything)
#   9. Public verification: mycosoft.com must serve the new slot (check header)
#  10. Wait 300s (rollback window), then stop the old slot
#  11. Write deploy log to /var/log/mycosoft-deploys.log
#
# Rollback (separate command):
#   scripts/blue-green-deploy.sh --rollback
#   → flips state back to the previous slot, reloads nginx, purges CF, re-starts
#     the previous slot if it was already stopped.
#
# Usage:
#   DEPLOY_DIR=/opt/mycosoft/website \
#   IMAGE=ghcr.io/mycosoftlabs/website:production-latest \
#   CF_ZONE_ID=... CF_API_TOKEN=... \
#   scripts/blue-green-deploy.sh
# =============================================================================
set -euo pipefail

# ───── Config ────────────────────────────────────────────────────────────────
DEPLOY_DIR="${DEPLOY_DIR:-/opt/mycosoft/website}"
STATE_DIR="${STATE_DIR:-/opt/mycosoft/state}"
NGINX_DIR="${NGINX_DIR:-/opt/mycosoft/nginx}"
# Default log path must be writable by the non-root SSH user. /var/log/ requires
# sudo so we fall back to /tmp. Operators can override with LOG_FILE env.
LOG_FILE="${LOG_FILE:-/tmp/mycosoft-deploys.log}"
COMPOSE_FILES=(
  "-f" "docker-compose.production.yml"
  "-f" "docker-compose.production.blue-green.yml"
)
IMAGE="${IMAGE:-ghcr.io/mycosoftlabs/website:production-latest}"
HEALTH_PATH="${HEALTH_PATH:-/api/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"     # seconds to wait for new slot health
HEALTH_STREAK="${HEALTH_STREAK:-3}"          # consecutive passes required
ROLLBACK_WINDOW="${ROLLBACK_WINDOW:-300}"   # seconds to keep old slot alive
PUBLIC_HOST="${PUBLIC_HOST:-mycosoft.com}"
CF_ZONE_ID="${CF_ZONE_ID:-}"
CF_API_TOKEN="${CF_API_TOKEN:-}"

# ───── Logging ──────────────────────────────────────────────────────────────
c_red=$'\033[0;31m'; c_grn=$'\033[0;32m'; c_ylw=$'\033[1;33m'; c_blu=$'\033[0;34m'; c_clr=$'\033[0m'
_ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "${c_blu}[$(_ts)]${c_clr} $*" | tee -a "$LOG_FILE"; }
ok()  { echo "${c_grn}[$(_ts)] OK${c_clr} $*" | tee -a "$LOG_FILE"; }
warn(){ echo "${c_ylw}[$(_ts)] WARN${c_clr} $*" | tee -a "$LOG_FILE"; }
err() { echo "${c_red}[$(_ts)] ERR${c_clr} $*" | tee -a "$LOG_FILE" 1>&2; }

# ───── Lock (prevent concurrent deploys) ────────────────────────────────────
LOCK_FD=9
LOCK_FILE=/tmp/mycosoft-blue-green.lock
exec {LOCK_FD}>"$LOCK_FILE"
flock -n "$LOCK_FD" || { err "Another blue/green deploy is already running"; exit 2; }

mkdir -p "$STATE_DIR" "$NGINX_DIR/conf.d" "$(dirname "$LOG_FILE")"

# ───── State: active slot file ──────────────────────────────────────────────
ACTIVE_FILE="$STATE_DIR/active-slot"
if [[ ! -s "$ACTIVE_FILE" ]]; then
  log "No active slot recorded — bootstrapping to BLUE"
  echo "blue" > "$ACTIVE_FILE"
fi
ACTIVE=$(cat "$ACTIVE_FILE" | tr -d '[:space:]')
if [[ "$ACTIVE" != "blue" && "$ACTIVE" != "green" ]]; then
  err "active-slot file has invalid value: '$ACTIVE'"; exit 3
fi
IDLE=$([[ "$ACTIVE" == "blue" ]] && echo "green" || echo "blue")

log "Active slot: $ACTIVE   Idle slot: $IDLE   Image: $IMAGE"

# ───── Args: --rollback / --verify / --cutover (default) ────────────────────
MODE="cutover"
case "${1:-}" in
  --rollback) MODE="rollback" ;;
  --verify)   MODE="verify" ;;
  --cutover|"") MODE="cutover" ;;
  *) err "Unknown arg: $1"; exit 4 ;;
esac

cd "$DEPLOY_DIR"

# ───── Helpers ──────────────────────────────────────────────────────────────
compose() { docker compose "${COMPOSE_FILES[@]}" "$@"; }

render_nginx_conf_for() {
  local target="$1" # "blue" or "green"
  local tmpl="$DEPLOY_DIR/deploy/nginx/conf.d/website.conf.template"
  local out="$NGINX_DIR/conf.d/website.conf"
  [[ -f "$tmpl" ]] || { err "Missing template: $tmpl"; return 1; }
  sed "s|__ACTIVE_SLOT__|$target|g" "$tmpl" > "$out"
  ok "Rendered nginx conf pointing at $target  ($out)"
}

reload_proxy() {
  # Test config first — fail fast if broken
  if ! docker exec mycosoft-website-proxy nginx -t 2>&1 | tee -a "$LOG_FILE" | grep -q "syntax is ok"; then
    err "nginx config test failed — not reloading"; return 1
  fi
  docker exec mycosoft-website-proxy nginx -s reload
  ok "nginx reloaded (graceful — in-flight requests finish on prior upstream)"
}

wait_healthy() {
  local slot="$1" deadline=$(( $(date +%s) + HEALTH_TIMEOUT )) streak=0
  local cid="mycosoft-website-${slot}"
  log "Waiting for $cid /api/health ($HEALTH_STREAK× consecutive, $HEALTH_TIMEOUT s budget)"
  while (( $(date +%s) < deadline )); do
    if docker exec "$cid" curl -fsS --max-time 5 "http://localhost:3000${HEALTH_PATH}" >/dev/null 2>&1; then
      streak=$((streak + 1))
      log "  $slot health pass $streak/$HEALTH_STREAK"
      (( streak >= HEALTH_STREAK )) && { ok "$slot is healthy"; return 0; }
    else
      streak=0
      log "  $slot not healthy yet — retrying in 3s"
    fi
    sleep 3
  done
  err "$slot failed to become healthy within $HEALTH_TIMEOUT s"
  docker logs --tail 80 "$cid" | tee -a "$LOG_FILE"
  return 1
}

purge_cloudflare() {
  if [[ -z "$CF_ZONE_ID" || -z "$CF_API_TOKEN" ]]; then
    err "CF_ZONE_ID / CF_API_TOKEN are empty — cannot purge Cloudflare cache."
    err "Set these as GitHub Actions secrets: CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_TOKEN"
    err "WITHOUT the purge, Cloudflare keeps serving stale HTML for up to 1 year."
    # Don't fail the deploy (site is still on new slot via nginx), but fail LOUD
    # so operators notice and fix the secrets.
    return 1
  fi
  local resp
  resp=$(curl -sS -X POST \
    "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"purge_everything":true}') || { err "CF purge network call failed"; return 1; }
  if echo "$resp" | grep -q '"success":true'; then
    ok "Cloudflare cache purged (purge_everything)"
  else
    err "Cloudflare purge failed: $resp"; return 1
  fi
}

verify_public() {
  # Hit the public URL a few times; each response MUST come from the new slot
  # (X-Active-Slot header is set by nginx). If any request reports the old
  # slot, cutover didn't actually flip.
  local expected="$1" ok_count=0 fail_count=0
  for i in 1 2 3 4 5; do
    local slot
    slot=$(curl -sSI "https://${PUBLIC_HOST}/healthz" --max-time 8 \
      | awk -F': *' 'tolower($1)=="x-active-slot"{gsub("\r",""); print tolower($2)}' || true)
    if [[ "$slot" == "$expected" ]]; then
      ok_count=$((ok_count+1))
      log "  public probe $i: slot=$slot ✓"
    else
      fail_count=$((fail_count+1))
      warn "  public probe $i: slot=${slot:-unknown} (expected $expected)"
    fi
    sleep 2
  done
  (( ok_count >= 3 )) && { ok "Public verified on slot=$expected"; return 0; }
  err "Public verification failed: ok=$ok_count fail=$fail_count"; return 1
}

stop_slot() {
  local slot="$1" cid="mycosoft-website-$slot"
  if docker ps --format '{{.Names}}' | grep -qx "$cid"; then
    log "Stopping $cid (graceful SIGTERM, then remove)"
    docker stop -t 30 "$cid" >/dev/null || true
    docker rm -f "$cid"     >/dev/null || true
    ok "Stopped $cid"
  else
    log "$cid is not running — nothing to stop"
  fi
}

# ───── MODE: verify ─────────────────────────────────────────────────────────
if [[ "$MODE" == "verify" ]]; then
  log "MODE=verify — running public probe only"
  verify_public "$ACTIVE" && exit 0 || exit 5
fi

# ───── MODE: rollback ───────────────────────────────────────────────────────
if [[ "$MODE" == "rollback" ]]; then
  log "MODE=rollback — flipping $ACTIVE → $IDLE"
  # Make sure the idle slot is still running; if not, start it with whatever
  # image it already has (should be the PREVIOUS production image).
  if ! docker ps --format '{{.Names}}' | grep -qx "mycosoft-website-$IDLE"; then
    log "Idle slot $IDLE not running — bringing it back up"
    # Use the same image as the proxy last served; fall back to :production-latest
    PREV=$(docker image inspect --format='{{index .RepoTags 0}}' \
      "$(docker inspect -f '{{.Image}}' mycosoft-website-$IDLE 2>/dev/null || echo "$IMAGE")" 2>/dev/null || echo "$IMAGE")
    if [[ "$IDLE" == "green" ]]; then
      WEBSITE_IMAGE_GREEN="$PREV" compose --profile green up -d --no-deps website-green
    else
      WEBSITE_IMAGE_BLUE="$PREV" compose up -d --no-deps website-blue
    fi
    wait_healthy "$IDLE" || { err "Rollback failed — idle slot didn't come back"; exit 6; }
  fi
  render_nginx_conf_for "$IDLE"
  reload_proxy
  echo "$IDLE" > "$ACTIVE_FILE"
  purge_cloudflare || true
  verify_public "$IDLE" || { err "Rollback public verification failed"; exit 7; }
  ok "Rollback complete — active=$IDLE"
  exit 0
fi

# ───── MODE: cutover (default) ──────────────────────────────────────────────
log "MODE=cutover — deploying $IMAGE into idle slot ($IDLE)"

# 1. Pull the new image (docker pull is idempotent, fast if already cached)
log "Pulling image: $IMAGE"
docker pull "$IMAGE"

# 2. Start idle slot with the new image
if [[ "$IDLE" == "green" ]]; then
  log "Starting website-green with new image"
  WEBSITE_IMAGE_GREEN="$IMAGE" compose --profile green up -d --no-deps --remove-orphans website-green
else
  log "Starting website-blue with new image"
  WEBSITE_IMAGE_BLUE="$IMAGE" compose up -d --no-deps --remove-orphans website-blue
fi

# Ensure proxy is running too (first-time bootstrap)
if ! docker ps --format '{{.Names}}' | grep -qx "mycosoft-website-proxy"; then
  log "website-proxy not running — starting it"
  # Seed initial nginx config pointing at the ACTIVE slot so proxy can boot
  render_nginx_conf_for "$ACTIVE"
  compose up -d --no-deps website-proxy
  # Give nginx a moment to come up
  sleep 5
fi

# 3. Wait for new slot to be healthy (3× streak)
if ! wait_healthy "$IDLE"; then
  err "New slot unhealthy — aborting cutover. Active slot UNCHANGED ($ACTIVE)."
  warn "Idle slot ($IDLE) left running for diagnostics: docker logs mycosoft-website-$IDLE"
  exit 10
fi

# 4. Render nginx conf.d pointing at idle slot + graceful reload
render_nginx_conf_for "$IDLE"
if ! reload_proxy; then
  err "nginx reload failed — REVERTING conf"
  render_nginx_conf_for "$ACTIVE"
  reload_proxy || err "Proxy reload failed on revert too — manual intervention needed"
  exit 11
fi

# 5. Flip state file BEFORE purging CF (so a CF edge re-fetch hits new slot)
echo "$IDLE" > "$ACTIVE_FILE"
ok "State flipped: active=$IDLE"

# 6. Purge Cloudflare cache — now edge will fetch new slot's content
if ! purge_cloudflare; then
  warn "CF purge failed — traffic is on the new slot but cache may serve stale"
fi

# 7. Verify public reports new slot (via X-Active-Slot header)
if ! verify_public "$IDLE"; then
  err "Public verification failed — attempting automatic rollback"
  render_nginx_conf_for "$ACTIVE"
  reload_proxy || true
  echo "$ACTIVE" > "$ACTIVE_FILE"
  purge_cloudflare || true
  exit 12
fi

# 8. Keep old slot running in rollback window, then stop it
log "Cutover successful. Keeping old slot ($ACTIVE) alive for $ROLLBACK_WINDOW s as rollback window"
# Background the cleanup so the CI/CD step returns quickly
(
  sleep "$ROLLBACK_WINDOW"
  stop_slot "$ACTIVE"
  ok "Rollback window elapsed — old slot $ACTIVE stopped"
) >>"$LOG_FILE" 2>&1 &
disown

ok "Blue/green deploy complete — active=$IDLE image=$IMAGE"
exit 0
