#!/bin/bash
# Install and enable MycoBrain as a systemd service + watchdog on sandbox
# Run on sandbox VM (e.g. via SSH from deploy script)
# Feb 18, 2026
set -e
SVC_NAME=mycobrain-service
UNIT_FILE=/etc/systemd/system/${SVC_NAME}.service
MAS_ROOT=${MAS_ROOT:-/opt/mycosoft/mas/mycosoft-mas}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Require MAS repo to exist
if [ ! -f "$MAS_ROOT/services/mycobrain/mycobrain_service_standalone.py" ]; then
  echo "ERROR: MAS repo not found at $MAS_ROOT (set MAS_ROOT if elsewhere)"
  exit 1
fi

# If unit file is next to this script, install it (with path substitution)
if [ -f "$SCRIPT_DIR/mycobrain-service.service" ]; then
  sed "s|/opt/mycosoft/mas/mycosoft-mas|$MAS_ROOT|g" "$SCRIPT_DIR/mycobrain-service.service" | sudo tee "$UNIT_FILE" > /dev/null
else
  # Inline fallback: write unit that uses MAS_ROOT
  sudo tee "$UNIT_FILE" > /dev/null << EOF
[Unit]
Description=MycoBrain serial gateway and ingestion service (port 8003)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mycosoft
Group=mycosoft
WorkingDirectory=$MAS_ROOT
ExecStart=/usr/bin/python3 $MAS_ROOT/services/mycobrain/mycobrain_service_standalone.py
Restart=always
RestartSec=5
TimeoutStartSec=30
Environment=MYCOBRAIN_SERVICE_PORT=8003
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mycobrain-service

[Install]
WantedBy=multi-user.target
EOF
fi

sudo systemctl daemon-reload
sudo systemctl enable "$SVC_NAME"
sudo systemctl start "$SVC_NAME"
echo "MycoBrain service installed and started. Status: $(systemctl is-active $SVC_NAME)"

# Install watchdog cron (every 2 min)
WATCHDOG_SCRIPT=/opt/mycosoft/scripts/mycobrain-watchdog.sh
sudo mkdir -p /opt/mycosoft/scripts
if [ -f "$SCRIPT_DIR/mycobrain-watchdog.sh" ]; then
  sudo cp "$SCRIPT_DIR/mycobrain-watchdog.sh" "$WATCHDOG_SCRIPT"
else
  sudo tee "$WATCHDOG_SCRIPT" > /dev/null << 'WDEOF'
#!/bin/bash
HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8003/health 2>/dev/null || echo "000")
[ "$HTTP" != "200" ] && systemctl restart mycobrain-service 2>/dev/null || true
WDEOF
fi
sudo chmod +x "$WATCHDOG_SCRIPT"
# Install cron for root so watchdog can systemctl restart
(sudo crontab -l 2>/dev/null | grep -v mycobrain-watchdog; echo "*/2 * * * * $WATCHDOG_SCRIPT") | sudo crontab - 2>/dev/null || true
echo "Watchdog cron installed (every 2 min, root)."
