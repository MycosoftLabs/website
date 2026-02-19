#!/bin/bash
# MycoBrain service watchdog - restart if unhealthy (redundancy on top of systemd Restart=)
# Run from cron every 2 min; systemd handles most failures; this catches hung processes
# Feb 18, 2026
set -e
HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8003/health 2>/dev/null || echo "000")
if [ "$HTTP" != "200" ]; then
  echo "$(date -Iseconds) MycoBrain health $HTTP - restarting mycobrain-service"
  systemctl restart mycobrain-service 2>/dev/null || true
fi
