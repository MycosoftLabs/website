#!/usr/bin/env bash
# VM production cleanup — disk + memory relief before blue/green deploy.
# Safe: keeps mycosoft-website-proxy + active app slot running.
set -uo pipefail

dk() { timeout 15 docker "$@" 2>/dev/null || true; }

log() { echo "[vm-cleanup] $*"; }

echo "=== Memory BEFORE ==="
free -h
echo "=== Disk BEFORE ==="
df -h / /var/lib/docker 2>/dev/null || df -h /

ACTIVE_SLOT=""
if [[ -f /opt/mycosoft/state/active-slot ]]; then
  ACTIVE_SLOT="$(tr -d '[:space:]' < /opt/mycosoft/state/active-slot)"
  log "Active slot: ${ACTIVE_SLOT:-unknown}"
fi

# Wedged Docker recovery
if ! timeout 10 docker version >/dev/null 2>&1; then
  log "Docker not responding — restarting docker.service"
  sudo systemctl restart docker 2>/dev/null || true
  for _ in $(seq 1 12); do
    timeout 5 docker version >/dev/null 2>&1 && break
    sleep 5
  done
fi

# Stale deploy locks
rm -f /tmp/mycosoft-prod-deploy.lock 2>/dev/null || true
rm -f "$HOME/.cache/mycosoft-deploy/blue-green.lock" 2>/dev/null || true

# Stop non-active website slots (frees RAM; blue/green starts a fresh idle slot on cutover)
for slot in blue green; do
  cid="mycosoft-website-${slot}"
  if [[ -n "$ACTIVE_SLOT" && "$slot" == "$ACTIVE_SLOT" ]]; then
    continue
  fi
  if dk ps -a --format '{{.Names}}' | grep -qx "$cid"; then
    log "Stopping inactive slot container $cid"
    dk stop -t 15 "$cid" || true
    dk rm -f "$cid" || true
  fi
done

# Remove restart-loop / exited containers (not proxy, not active slot)
while read -r name status; do
  [[ -z "$name" ]] && continue
  if [[ "$name" == "mycosoft-website-proxy" ]]; then
    continue
  fi
  if [[ "$name" == "mycosoft-website-blue" && "$ACTIVE_SLOT" == "blue" ]]; then
    continue
  fi
  if [[ "$name" == "mycosoft-website-green" && "$ACTIVE_SLOT" == "green" ]]; then
    continue
  fi
  if [[ "$status" == *Restarting* || "$status" == *Exited* ]]; then
    log "Removing unhealthy container $name ($status)"
    dk rm -f "$name" || true
  fi
done < <(dk ps -a --format '{{.Names}} {{.Status}}' 2>/dev/null || true)

dk container prune -f --filter "until=15m" || true

# Trim old website images (keep production-latest + 3 newest manual/fast tags)
KEEP_TAGS="production-latest previous"
mapfile -t ALL_TAGS < <(dk images \
  --filter "reference=ghcr.io/mycosoftlabs/website:*" \
  --format '{{.Repository}}:{{.Tag}}\t{{.CreatedAt}}' \
  2>/dev/null | sort -k2 -r | awk '{print $1}' || true)
KEEP_COUNT=0
for tag in "${ALL_TAGS[@]}"; do
  base="${tag##*:}"
  if echo "$KEEP_TAGS" | grep -qw "$base" || [[ "$KEEP_COUNT" -lt 3 ]]; then
    KEEP_COUNT=$((KEEP_COUNT + 1))
    continue
  fi
  log "Removing old image $tag"
  dk image rm "$tag" || true
done

dk image prune -af --filter "until=24h" || true
dk volume prune -f || true
dk network prune -f --filter "until=1h" || true
dk buildx prune -af --filter "until=24h" || true

sudo apt-get clean 2>/dev/null || true
sudo journalctl --vacuum-time=7d 2>/dev/null || true

# Drop page cache if memory is tight (keeps active containers; needs sudo)
avail_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
if [[ "${avail_kb:-0}" -lt 800000 ]]; then
  log "Low MemAvailable (${avail_kb}kB) — dropping caches"
  sync
  sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches' 2>/dev/null || true
fi

echo "=== Docker stats ==="
dk stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}' 2>/dev/null | head -20 || true

echo "=== Memory AFTER ==="
free -h
echo "=== Disk AFTER ==="
df -h / /var/lib/docker 2>/dev/null || df -h /
log "Cleanup complete"
