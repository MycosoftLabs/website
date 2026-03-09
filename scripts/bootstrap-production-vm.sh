#!/usr/bin/env bash
# =============================================================================
# Mycosoft Production VM Bootstrap
# =============================================================================
# Sets up a fresh Ubuntu VM as a production-ready Mycosoft server.
# Run this ONCE on a new VM, then use deploy-production.sh for updates.
#
# Tested on: Ubuntu 22.04 LTS / 24.04 LTS (Proxmox VM or bare metal)
#
# What this script does:
#   1. Installs Docker Engine + Compose plugin
#   2. Installs Cloudflare tunnel (cloudflared)
#   3. Clones the Mycosoft repo
#   4. Creates directory structure
#   5. Pulls Ollama model for local LLM
#   6. Sets up automatic Docker cleanup cron
#   7. Configures unattended security updates
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/MycosoftLabs/website/main/scripts/bootstrap-production-vm.sh | sudo bash
#   # OR
#   sudo bash scripts/bootstrap-production-vm.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[SETUP]${NC} $1"; }
ok()  { echo -e "${GREEN}[  OK ]${NC} $1"; }
warn(){ echo -e "${YELLOW}[WARN ]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

if [ "$(id -u)" -ne 0 ]; then
  err "This script must be run as root (sudo)"
  exit 1
fi

INSTALL_DIR="/opt/mycosoft"
DEPLOY_USER="${DEPLOY_USER:-mycosoft}"

echo ""
echo "============================================"
echo "  Mycosoft Production VM Bootstrap"
echo "============================================"
echo ""

# ============================================================
# 1. SYSTEM UPDATES
# ============================================================

log "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git jq python3 python3-pip \
  ca-certificates gnupg lsb-release \
  unattended-upgrades apt-listchanges \
  htop iotop net-tools
ok "System packages installed"

# ============================================================
# 2. INSTALL DOCKER ENGINE
# ============================================================

if command -v docker &>/dev/null; then
  ok "Docker already installed: $(docker --version)"
else
  log "Installing Docker Engine..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  ok "Docker installed: $(docker --version)"
fi

# ============================================================
# 3. CREATE DEPLOY USER
# ============================================================

if id "$DEPLOY_USER" &>/dev/null; then
  ok "User '$DEPLOY_USER' already exists"
else
  log "Creating deploy user '$DEPLOY_USER'..."
  useradd -m -s /bin/bash "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"
  ok "User '$DEPLOY_USER' created and added to docker group"
fi

# ============================================================
# 4. CLONE REPOSITORY
# ============================================================

if [ -d "$INSTALL_DIR/.git" ]; then
  ok "Repository already cloned at $INSTALL_DIR"
else
  log "Cloning Mycosoft repository..."
  mkdir -p "$INSTALL_DIR"
  git clone https://github.com/MycosoftLabs/website.git "$INSTALL_DIR"
  ok "Repository cloned to $INSTALL_DIR"
fi

chown -R "$DEPLOY_USER:$DEPLOY_USER" "$INSTALL_DIR"

# ============================================================
# 5. CREATE DIRECTORY STRUCTURE
# ============================================================

log "Creating directory structure..."
mkdir -p "$INSTALL_DIR/backups"
mkdir -p /var/log/mycosoft
touch /var/log/mycosoft-deployments.log
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$INSTALL_DIR/backups" /var/log/mycosoft /var/log/mycosoft-deployments.log
ok "Directories created"

# ============================================================
# 6. SETUP .ENV FILE
# ============================================================

if [ ! -f "$INSTALL_DIR/.env" ]; then
  if [ -f "$INSTALL_DIR/env.production.example" ]; then
    cp "$INSTALL_DIR/env.production.example" "$INSTALL_DIR/.env"
    chmod 600 "$INSTALL_DIR/.env"
    chown "$DEPLOY_USER:$DEPLOY_USER" "$INSTALL_DIR/.env"
    warn ".env file created from template — EDIT IT with real secrets before deploying!"
    warn "  nano $INSTALL_DIR/.env"
  fi
else
  ok ".env file already exists"
fi

# ============================================================
# 7. PULL DOCKER IMAGES (pre-warm)
# ============================================================

log "Pre-pulling Docker images..."
docker pull ollama/ollama:latest
docker pull postgres:16-alpine
docker pull redis:7-alpine
docker pull cloudflare/cloudflared:latest
docker pull grafana/grafana:latest
docker pull prom/prometheus:latest
docker pull n8nio/n8n:latest
ok "Docker images pre-pulled"

# ============================================================
# 8. INSTALL SYSTEMD SERVICE (auto-start on boot)
# ============================================================

log "Installing systemd service for auto-start on boot..."
cp "$INSTALL_DIR/scripts/mycosoft-stack.service" /etc/systemd/system/mycosoft-stack.service
systemctl daemon-reload
systemctl enable mycosoft-stack
ok "Systemd service installed — stack will auto-start on VM reboot"

# ============================================================
# 9. INSTALL WATCHDOG CRON (auto-recovery every 2 min)
# ============================================================

log "Installing watchdog cron..."
chmod +x "$INSTALL_DIR/scripts/watchdog.sh"
cat > /etc/cron.d/mycosoft-watchdog << CRON
# Auto-recover Mycosoft production services every 2 minutes
*/2 * * * * $DEPLOY_USER $INSTALL_DIR/scripts/watchdog.sh >> /var/log/mycosoft-watchdog.log 2>&1
CRON
touch /var/log/mycosoft-watchdog.log
chown "$DEPLOY_USER:$DEPLOY_USER" /var/log/mycosoft-watchdog.log
ok "Watchdog cron installed (every 2 minutes)"

# ============================================================
# 10. SETUP DOCKER CLEANUP CRON
# ============================================================

log "Setting up Docker cleanup cron..."
cat > /etc/cron.weekly/docker-cleanup << 'CRON'
#!/bin/sh
# Remove dangling images and stopped containers older than 7 days
docker system prune -f --filter "until=168h" > /dev/null 2>&1
CRON
chmod +x /etc/cron.weekly/docker-cleanup
ok "Docker cleanup cron installed (weekly)"

# ============================================================
# 11. CONFIGURE UNATTENDED SECURITY UPDATES
# ============================================================

log "Configuring automatic security updates..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'APT_CONF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
APT_CONF
ok "Unattended security updates configured"

# ============================================================
# 12. FIREWALL (UFW)
# ============================================================

log "Configuring firewall..."
if command -v ufw &>/dev/null; then
  ufw --force reset >/dev/null 2>&1
  ufw default deny incoming
  ufw default allow outgoing
  # SSH
  ufw allow 22/tcp
  # Only expose what Cloudflare tunnel needs (nothing — tunnel connects outbound)
  # Allow LAN access to monitoring
  ufw allow from 192.168.0.0/24 to any port 3000  # Website (LAN only)
  ufw allow from 192.168.0.0/24 to any port 9090  # Prometheus (LAN only)
  ufw allow from 192.168.0.0/24 to any port 3030  # Grafana (LAN only)
  ufw allow from 192.168.0.0/24 to any port 5678  # N8N (LAN only)
  ufw --force enable
  ok "Firewall configured (SSH + LAN-only services)"
else
  warn "UFW not installed — configure firewall manually"
fi

# ============================================================
# DONE
# ============================================================

echo ""
echo "============================================"
echo -e "${GREEN}  VM BOOTSTRAP COMPLETE${NC}"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Edit .env with real secrets:"
echo "     sudo -u $DEPLOY_USER nano $INSTALL_DIR/.env"
echo ""
echo "  2. Deploy the stack:"
echo "     cd $INSTALL_DIR"
echo "     sudo -u $DEPLOY_USER bash scripts/deploy-production.sh"
echo ""
echo "  3. After first deploy, pull the Ollama model:"
echo "     docker exec mycosoft-ollama ollama pull llama3.3"
echo ""
echo "  4. Verify everything:"
echo "     curl http://localhost:3000/api/health | jq"
echo "     curl http://localhost:3000/api/health/providers | jq"
echo ""
echo "============================================"
