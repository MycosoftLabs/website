#!/usr/bin/env bash
# =============================================================================
# Mycosoft Watchdog — Auto-recovery for production services
# =============================================================================
# Checks critical containers and restarts them if unhealthy/stopped.
# Run via cron every 2 minutes:
#   */2 * * * * /opt/mycosoft/scripts/watchdog.sh >> /var/log/mycosoft-watchdog.log 2>&1
#
# This prevents:
#   - Cloudflare tunnel dying and site going offline for hours
#   - Website container crashing without recovery
#   - Services not starting after VM reboot
# =============================================================================

set -uo pipefail

COMPOSE_FILE="/opt/mycosoft/docker-compose.production.yml"
PROJECT_DIR="/opt/mycosoft"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

# Only run if the compose file exists (i.e., this is a production VM)
if [ ! -f "$COMPOSE_FILE" ]; then
  exit 0
fi

cd "$PROJECT_DIR"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
  echo "$LOG_PREFIX Docker not running — skipping watchdog"
  exit 0
fi

RECOVERY_NEEDED=false

# --- Check website container ---
WEBSITE_STATE=$(docker inspect mycosoft-website --format='{{.State.Status}}' 2>/dev/null || echo "missing")
WEBSITE_HEALTH=$(docker inspect mycosoft-website --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")

if [ "$WEBSITE_STATE" != "running" ]; then
  echo "$LOG_PREFIX ALERT: Website container not running (state: $WEBSITE_STATE) — recovering"
  RECOVERY_NEEDED=true
elif [ "$WEBSITE_HEALTH" = "unhealthy" ]; then
  echo "$LOG_PREFIX ALERT: Website container unhealthy — restarting"
  docker compose -f "$COMPOSE_FILE" restart website
fi

# --- Check tunnel container ---
TUNNEL_STATE=$(docker inspect mycosoft-tunnel --format='{{.State.Status}}' 2>/dev/null || echo "missing")
TUNNEL_HEALTH=$(docker inspect mycosoft-tunnel --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")

if [ "$TUNNEL_STATE" != "running" ]; then
  echo "$LOG_PREFIX ALERT: Tunnel container not running (state: $TUNNEL_STATE) — recovering"
  RECOVERY_NEEDED=true
elif [ "$TUNNEL_HEALTH" = "unhealthy" ]; then
  echo "$LOG_PREFIX ALERT: Tunnel container unhealthy — restarting"
  docker compose -f "$COMPOSE_FILE" restart cloudflared
fi

# --- Check postgres ---
PG_STATE=$(docker inspect mycosoft-postgres --format='{{.State.Status}}' 2>/dev/null || echo "missing")
if [ "$PG_STATE" != "running" ]; then
  echo "$LOG_PREFIX ALERT: PostgreSQL not running — recovering"
  RECOVERY_NEEDED=true
fi

# --- Check redis ---
REDIS_STATE=$(docker inspect mycosoft-redis --format='{{.State.Status}}' 2>/dev/null || echo "missing")
if [ "$REDIS_STATE" != "running" ]; then
  echo "$LOG_PREFIX ALERT: Redis not running — recovering"
  RECOVERY_NEEDED=true
fi

# --- Full stack recovery if any critical container is missing ---
if [ "$RECOVERY_NEEDED" = true ]; then
  echo "$LOG_PREFIX Performing full stack recovery..."
  docker compose -f "$COMPOSE_FILE" up -d --remove-orphans 2>&1
  echo "$LOG_PREFIX Recovery complete"
fi
