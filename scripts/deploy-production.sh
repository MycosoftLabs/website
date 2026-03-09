#!/usr/bin/env bash
# =============================================================================
# Mycosoft Production Deployment Script
# =============================================================================
# Deploys the latest code to the production VM and verifies everything works.
#
# Usage:
#   ./scripts/deploy-production.sh              # Full deploy
#   ./scripts/deploy-production.sh --quick      # Skip rebuild, just restart
#   ./scripts/deploy-production.sh --verify     # Only run health checks
#
# This script:
#   1. Backs up the database
#   2. Pulls latest code from main
#   3. Rebuilds and restarts containers
#   4. Pulls Ollama model if missing
#   5. Waits for health checks to pass
#   6. Verifies LLM providers are responding
#   7. Purges Cloudflare cache
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DEPLOY_DIR="${DEPLOY_DIR:-/opt/mycosoft}"
COMPOSE_FILE="docker-compose.production.yml"
BACKUP_DIR="${BACKUP_DIR:-/opt/mycosoft/backups}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.3}"
MAX_HEALTH_WAIT=120  # seconds

log() { echo -e "${BLUE}[DEPLOY]${NC} $1"; }
ok()  { echo -e "${GREEN}[  OK  ]${NC} $1"; }
warn(){ echo -e "${YELLOW}[ WARN ]${NC} $1"; }
err() { echo -e "${RED}[ERROR ]${NC} $1"; }

# Parse args
MODE="full"
if [[ "${1:-}" == "--quick" ]]; then MODE="quick"; fi
if [[ "${1:-}" == "--verify" ]]; then MODE="verify"; fi

cd "$DEPLOY_DIR"

# ============================================================
# VERIFY PREREQUISITES
# ============================================================

log "Verifying prerequisites..."

if [ ! -f ".env" ]; then
  err ".env file missing. Copy env.production.example to .env and fill in secrets."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  err "Docker Compose not found. Install Docker Engine with Compose plugin."
  exit 1
fi

# Check critical env vars
source .env 2>/dev/null || true
if [ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
  warn "CLOUDFLARE_TUNNEL_TOKEN not set — tunnel will not start"
fi

CONFIGURED_KEYS=0
for key in GROQ_API_KEY ANTHROPIC_API_KEY OPENAI_API_KEY GOOGLE_AI_API_KEY XAI_API_KEY; do
  val="${!key:-}"
  if [ -n "$val" ] && [ "$val" != "your_" ] && [ ${#val} -gt 10 ]; then
    CONFIGURED_KEYS=$((CONFIGURED_KEYS + 1))
  fi
done

if [ "$CONFIGURED_KEYS" -eq 0 ]; then
  err "NO LLM API keys configured in .env! MYCA will only work via Ollama (slow)."
  err "Set at least GROQ_API_KEY for fast responses."
fi

ok "Prerequisites verified ($CONFIGURED_KEYS LLM keys configured)"

# ============================================================
# SKIP TO VERIFY IF REQUESTED
# ============================================================

if [ "$MODE" = "verify" ]; then
  log "Verify-only mode — skipping deploy steps"
else

  # ============================================================
  # BACKUP DATABASE
  # ============================================================

  log "Backing up database..."
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).sql"
  if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "${POSTGRES_USER:-mycosoft}" "${POSTGRES_DB:-mycosoft}" > "$BACKUP_FILE" 2>/dev/null; then
    BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
    ok "Database backed up: $BACKUP_FILE ($BACKUP_SIZE)"
  else
    warn "Database backup skipped (postgres not running or first deploy)"
  fi

  # Clean old backups (keep last 10)
  ls -t "$BACKUP_DIR"/db-*.sql 2>/dev/null | tail -n +11 | xargs -r rm -f

  # ============================================================
  # PULL LATEST CODE
  # ============================================================

  log "Pulling latest code from main..."
  git fetch origin main
  git reset --hard origin/main
  ok "Code updated to $(git rev-parse --short HEAD)"

  # ============================================================
  # BUILD AND DEPLOY
  # ============================================================

  if [ "$MODE" = "quick" ]; then
    log "Quick mode — restarting containers without rebuild..."
    docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
  else
    log "Building images..."
    docker compose -f "$COMPOSE_FILE" build --pull website
    log "Starting containers..."
    docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
  fi

  ok "Containers started"

  # ============================================================
  # PULL OLLAMA MODEL
  # ============================================================

  log "Checking Ollama model..."
  sleep 5  # Wait for Ollama container to start

  if docker exec mycosoft-ollama ollama list 2>/dev/null | grep -q "$OLLAMA_MODEL"; then
    ok "Ollama model '$OLLAMA_MODEL' already available"
  else
    log "Pulling Ollama model '$OLLAMA_MODEL' (this may take a few minutes on first run)..."
    docker exec mycosoft-ollama ollama pull "$OLLAMA_MODEL" && \
      ok "Ollama model '$OLLAMA_MODEL' pulled successfully" || \
      warn "Ollama model pull failed — will retry on next deploy"
  fi

fi

# ============================================================
# HEALTH CHECKS
# ============================================================

log "Waiting for services to be healthy..."
ELAPSED=0
HEALTHY=false

while [ $ELAPSED -lt $MAX_HEALTH_WAIT ]; do
  RESPONSE=$(curl -sf http://localhost:3000/api/health 2>/dev/null || echo '{"status":"starting"}')
  STATUS=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "starting")

  if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "degraded" ]; then
    HEALTHY=true
    break
  fi

  echo -n "."
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done
echo ""

if [ "$HEALTHY" = true ]; then
  ok "Website healthy (status: $STATUS, ${ELAPSED}s)"
else
  err "Website did not become healthy within ${MAX_HEALTH_WAIT}s"
  docker compose -f "$COMPOSE_FILE" logs --tail=50 website
  exit 1
fi

# ============================================================
# VERIFY LLM PROVIDERS
# ============================================================

log "Checking LLM providers..."
PROVIDER_RESPONSE=$(curl -sf http://localhost:3000/api/health/providers 2>/dev/null || echo '{}')
WORKING=$(echo "$PROVIDER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('summary',{}).get('working',0))" 2>/dev/null || echo "?")
PROVIDER_STATUS=$(echo "$PROVIDER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('summary',{}).get('status','unknown'))" 2>/dev/null || echo "unknown")

if [ "$WORKING" != "?" ] && [ "$WORKING" -ge 1 ] 2>/dev/null; then
  ok "LLM providers: $PROVIDER_STATUS ($WORKING working)"
else
  warn "LLM providers: $PROVIDER_STATUS ($WORKING working) — MYCA may use fallback responses"
fi

# ============================================================
# VERIFY MYCA CHAT
# ============================================================

log "Smoke-testing MYCA..."
MYCA_RESPONSE=$(curl -sf -X POST http://localhost:3000/api/mas/voice/orchestrator \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","want_audio":false,"source":"api"}' 2>/dev/null || echo '{}')
MYCA_PROVIDER=$(echo "$MYCA_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('routed_to','none'))" 2>/dev/null || echo "none")
MYCA_TEXT=$(echo "$MYCA_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('response_text','')[:100])" 2>/dev/null || echo "")

if [ "$MYCA_PROVIDER" != "none" ] && [ "$MYCA_PROVIDER" != "local-fallback" ]; then
  ok "MYCA responding via $MYCA_PROVIDER: \"${MYCA_TEXT}...\""
elif [ "$MYCA_PROVIDER" = "local-fallback" ]; then
  warn "MYCA is in local fallback — check API keys in .env"
else
  warn "MYCA smoke test did not get a response"
fi

# ============================================================
# VERIFY TUNNEL
# ============================================================

log "Checking Cloudflare tunnel..."
if docker ps --format '{{.Names}}' | grep -q mycosoft-tunnel; then
  TUNNEL_STATUS=$(docker inspect mycosoft-tunnel --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
  # Also check the tunnel ready endpoint directly
  TUNNEL_READY=$(curl -sf http://localhost:2000/ready 2>/dev/null && echo "ready" || echo "not ready")
  if [ "$TUNNEL_STATUS" = "healthy" ] || [ "$TUNNEL_READY" = "ready" ]; then
    ok "Cloudflare tunnel: healthy (${TUNNEL_READY})"
  else
    warn "Cloudflare tunnel status: $TUNNEL_STATUS ($TUNNEL_READY)"
    log "Attempting tunnel restart..."
    docker compose -f "$COMPOSE_FILE" restart cloudflared
    sleep 10
    TUNNEL_READY=$(curl -sf http://localhost:2000/ready 2>/dev/null && echo "ready" || echo "not ready")
    if [ "$TUNNEL_READY" = "ready" ]; then
      ok "Cloudflare tunnel recovered after restart"
    else
      warn "Cloudflare tunnel still not ready after restart"
    fi
  fi
else
  warn "Cloudflare tunnel container not running — starting it..."
  docker compose -f "$COMPOSE_FILE" up -d cloudflared
  sleep 15
  if docker ps --format '{{.Names}}' | grep -q mycosoft-tunnel; then
    ok "Cloudflare tunnel container started"
  else
    err "Failed to start Cloudflare tunnel container"
  fi
fi

# ============================================================
# PURGE CLOUDFLARE CACHE (if configured)
# ============================================================

if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ZONE_ID:-}" ]; then
  log "Purging Cloudflare cache..."
  PURGE_RESULT=$(curl -sf -X POST \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"purge_everything":true}' 2>/dev/null || echo '{}')
  if echo "$PURGE_RESULT" | grep -q '"success":true'; then
    ok "Cloudflare cache purged"
  else
    warn "Cloudflare cache purge failed (non-critical)"
  fi
fi

# ============================================================
# LOG DEPLOYMENT
# ============================================================

DEPLOY_LOG="/var/log/mycosoft-deployments.log"
echo "$(git rev-parse --short HEAD) deployed at $(date) — health:$STATUS providers:$WORKING myca:$MYCA_PROVIDER" >> "$DEPLOY_LOG" 2>/dev/null || true

echo ""
echo "============================================"
echo -e "${GREEN}  DEPLOYMENT COMPLETE${NC}"
echo "============================================"
echo "  Commit:    $(git rev-parse --short HEAD)"
echo "  Health:    $STATUS"
echo "  Providers: $WORKING working"
echo "  MYCA:      $MYCA_PROVIDER"
echo "  Tunnel:    ${TUNNEL_STATUS:-not checked}"
echo "============================================"
