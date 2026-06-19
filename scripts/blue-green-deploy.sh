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
#   6. Sync nginx.conf, render conf.d pointing at idle slot + `nginx -s reload` inside proxy
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

# VM-local secrets for manual / SSH deploys (CI passes CF_* via workflow env).
# File is NOT in git — install with scripts/install-vm-deploy-env.sh on the VM.
load_deploy_env() {
  local f="${DEPLOY_ENV_FILE:-/opt/mycosoft/deploy.env}"
  if [[ -f "$f" ]]; then
    set -a
    # Robust source — see load_production_env: ignore malformed (non-KEY=VALUE) lines.
    # shellcheck disable=SC1090
    source <(grep -E '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=' "$f")
    set +a
  fi
  CF_ZONE_ID="${CF_ZONE_ID:-${CLOUDFLARE_ZONE_ID_PRODUCTION:-${CLOUDFLARE_ZONE_ID:-}}}"
  CF_API_TOKEN="${CF_API_TOKEN:-${CLOUDFLARE_API_TOKEN:-${CLOUDFLARE_API_TOKEN_MYCODAO:-}}}"
}

# Production website secrets live in DEPLOY_DIR/.env — MUST be sourced before
# `docker compose up` or auth vars can be blanked (config_missing on protected pages).
load_production_env() {
  local env_file="${DEPLOY_DIR:-/opt/mycosoft/website}/.env"
  [[ -f "$env_file" ]] || { err "Missing production env: $env_file"; exit 8; }
  # In-place sanitize: join KEY= + bare value line (Jun 19 2026 prod regression).
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$env_file" <<'PY' || true
import sys
from pathlib import Path
p = Path(sys.argv[1])
lines = p.read_text().splitlines()
out, i, changed = [], 0, False
while i < len(lines):
    ln, s = lines[i], lines[i].strip()
    if s and not s.startswith("#") and "=" not in s:
        if out and out[-1].rstrip().endswith("="):
            out[-1] = out[-1].rstrip() + s
        else:
            out.append("MINDEX_INTERNAL_TOKEN=" + s)
        changed = True
        i += 1
        continue
    if ln.rstrip().endswith("=") and i + 1 < len(lines):
        nxt = lines[i + 1].strip()
        if nxt and "=" not in nxt and not nxt.startswith("#"):
            out.append(ln.rstrip() + nxt)
            changed = True
            i += 2
            continue
    out.append(ln)
    i += 1
if changed:
    orig = p.read_text()
    p.write_text("\n".join(out) + ("\n" if orig.endswith("\n") else ""))
PY
  fi
  set -a
  # Robust source: only well-formed KEY=VALUE assignment lines. A malformed line — e.g. a
  # stray secret wrapped onto its own line without a KEY= prefix — would otherwise be run as
  # a command under `source` and abort the whole deploy (exit 127) BEFORE any health/auth
  # safety check, blocking every cutover. Filtering keeps all real vars, drops junk lines.
  # (Jun 19 2026 — prod .env line-167 bare-token regression that blocked a deploy.)
  # shellcheck disable=SC1090
  source <(grep -E '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=' "$env_file")
  set +a
  # Never allow dev PC values on production VM
  if [[ "${NEXT_PUBLIC_BASE_URL:-}" == *localhost* ]]; then
    err "NEXT_PUBLIC_BASE_URL must not be localhost on production (got $NEXT_PUBLIC_BASE_URL)"
    exit 8
  fi
  local k v
  for k in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY NEXTAUTH_SECRET; do
    v="${!k:-}"
    if [[ -z "$v" ]]; then
      err "Production .env missing or empty: $k (protected pages will redirect to login?error=config_missing)"
      exit 8
    fi
  done
  ok "Production auth env loaded from $env_file"

  local earth_required=(AIRNOW_API_KEY MAS_API_URL MINDEX_API_URL MINDEX_API_KEY)
  for k in "${earth_required[@]}"; do
    v="${!k:-}"
    if [[ -z "$v" ]]; then
      err "Production .env missing or empty Earth Simulator runtime key: $k"
      err "Set $k in GitHub production secrets and $env_file before blue/green cutover."
      exit 8
    fi
  done
  ok "Production Earth Simulator runtime env loaded from $env_file"

  local earth_optional=(OPENAI_API_KEY TRANSIT_511_API_KEY GLOBAL_FISHING_WATCH_TOKEN YOUTUBE_API_KEY SF_511_API_KEY NEXT_PUBLIC_GOOGLE_MAP_TILES_API_KEY NEXT_PUBLIC_MAS_API_URL NEXT_PUBLIC_MINDEX_API_URL)
  for k in "${earth_optional[@]}"; do
    v="${!k:-}"
    if [[ -z "$v" ]]; then
      warn "Production optional live-data env missing: $k (related layer may be reduced or fallback-only)"
    fi
  done
}
load_deploy_env

# ───── Logging ──────────────────────────────────────────────────────────────
c_red=$'\033[0;31m'; c_grn=$'\033[0;32m'; c_ylw=$'\033[1;33m'; c_blu=$'\033[0;34m'; c_clr=$'\033[0m'
_ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "${c_blu}[$(_ts)]${c_clr} $*" | tee -a "$LOG_FILE"; }
ok()  { echo "${c_grn}[$(_ts)] OK${c_clr} $*" | tee -a "$LOG_FILE"; }
warn(){ echo "${c_ylw}[$(_ts)] WARN${c_clr} $*" | tee -a "$LOG_FILE"; }
err() { echo "${c_red}[$(_ts)] ERR${c_clr} $*" | tee -a "$LOG_FILE" 1>&2; }

# ───── Lock (prevent concurrent deploys) ────────────────────────────────────
LOCK_FD=9
LOCK_DIR="${LOCK_DIR:-${HOME:-/tmp}/.cache/mycosoft-deploy}"
mkdir -p "$LOCK_DIR"
LOCK_FILE="${LOCK_FILE:-${LOCK_DIR}/blue-green.lock}"
LOCK_PARENT="$(dirname "$LOCK_FILE")"
if ! mkdir -p "$LOCK_PARENT" 2>/dev/null || ! : > "$LOCK_FILE" 2>/dev/null; then
  warn "Ignoring unwritable LOCK_FILE=$LOCK_FILE; using $LOCK_DIR/blue-green.lock"
  LOCK_FILE="${LOCK_DIR}/blue-green.lock"
  mkdir -p "$LOCK_DIR"
  : > "$LOCK_FILE"
fi
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
load_production_env

# ───── Helpers ──────────────────────────────────────────────────────────────
compose() { docker compose "${COMPOSE_FILES[@]}" "$@"; }

install_nginx_base_conf() {
  local src="$DEPLOY_DIR/deploy/nginx/nginx.conf"
  local dst="$NGINX_DIR/nginx.conf"
  [[ -f "$src" ]] || { err "Missing nginx base config: $src"; return 1; }
  if [[ ! -f "$dst" ]] || ! cmp -s "$src" "$dst"; then
    cp "$src" "$dst"
    ok "Installed nginx base config ($dst)"
  else
    log "nginx base config already current"
  fi
}

render_nginx_conf_for() {
  local target="$1" # "blue" or "green"
  local tmpl="$DEPLOY_DIR/deploy/nginx/conf.d/website.conf.template"
  local out="$NGINX_DIR/conf.d/website.conf"
  [[ -f "$tmpl" ]] || { err "Missing template: $tmpl"; return 1; }
  sed "s|__ACTIVE_SLOT__|$target|g" "$tmpl" > "$out"
  ok "Rendered nginx conf pointing at $target  ($out)"
}

reload_proxy() {
  # Test config first — fail fast if broken. Do not use `| grep -q` after `tee` under
  # set -o pipefail: pipeline exit can be wrong, causing false "test failed" on success
  # (see manual cutover Apr 22 2026).
  local out rc
  out=$(docker exec mycosoft-website-proxy sh -c 'nginx -t' 2>&1) && rc=0 || rc=$?
  echo "$out" | tee -a "$LOG_FILE" >/dev/null
  if (( rc != 0 )); then
    err "nginx config test failed — not reloading: $out"
    return 1
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

verify_slot_auth_gate() {
  local slot="$1"
  local cid="mycosoft-website-${slot}"
  local loc
  loc=$(docker exec "$cid" curl -sSI "http://localhost:3000/natureos/mycobrain" --max-time 10 \
    | tr -d '\r' | awk 'tolower($1)=="location:"{print $2}' | head -1)
  if [[ "$loc" == *"error=config_missing"* ]]; then
    err "$cid auth gate broken: $loc"
    err "Image missing build-time NEXT_PUBLIC_SUPABASE_* — rebuild with Dockerfile.production build-args"
    return 1
  fi
  ok "$cid auth gate OK: ${loc:-no redirect}"
}

verify_auth_gate() {
  # Middleware inlines NEXT_PUBLIC_SUPABASE_* at build time. Runtime env alone is not enough.
  # After cutover, protected routes must redirect to /login?redirectTo=... NOT config_missing.
  local loc
  loc=$(curl -sSI "https://${PUBLIC_HOST}/natureos/mycobrain" --max-time 12 \
    | tr -d '\r' | awk 'tolower($1)=="location:"{print $2}' | head -1)
  if [[ "$loc" == *"error=config_missing"* ]]; then
    err "Auth gate broken: $loc"
    err "Rebuild image with --build-arg NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    return 1
  fi
  ok "Auth gate OK (no config_missing): ${loc:-no redirect}"
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
  install_nginx_base_conf
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

# 1. Pull the image IF it's a registry reference.
# Locally-built images (no registry prefix, e.g. `mycosoft-website:local`) or
# images that already exist in the daemon are used as-is. Without this guard,
# instant-deploy's locally-built image made `docker pull` fail with
# "pull access denied" and the cutover bailed out immediately.
IS_REGISTRY_IMAGE=false
case "$IMAGE" in
  *.*/*|*:*/*) IS_REGISTRY_IMAGE=true ;;            # contains a domain/port before /
  ghcr.io/*|docker.io/*|gcr.io/*|*.azurecr.io/*|*.dkr.ecr.*/*) IS_REGISTRY_IMAGE=true ;;
esac
if $IS_REGISTRY_IMAGE; then
  log "Pulling registry image: $IMAGE"
  docker pull "$IMAGE" || { err "docker pull failed for $IMAGE"; exit 20; }
elif docker image inspect "$IMAGE" >/dev/null 2>&1; then
  log "Using local image (already present): $IMAGE"
else
  err "Local image not found in daemon: $IMAGE"
  err "If this should be pulled from a registry, use a fully-qualified tag (e.g. ghcr.io/org/repo:tag)"
  exit 21
fi

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

if ! verify_slot_auth_gate "$IDLE"; then
  err "Aborting cutover — auth would break protected pages (config_missing)."
  exit 12
fi

# 4. Render nginx conf.d pointing at idle slot + graceful reload
install_nginx_base_conf
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
