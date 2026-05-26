#!/usr/bin/env bash
# Install /opt/mycosoft/deploy.env on the production VM from local credentials.
# Run from the website repo on a trusted admin machine (reads .credentials.local).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRED_FILE="${CRED_FILE:-$REPO_ROOT/.credentials.local}"
TARGET_HOST="${TARGET_HOST:-192.168.0.187}"
TARGET_USER="${TARGET_USER:-mycosoft}"
TARGET_PATH="${TARGET_PATH:-/opt/mycosoft/deploy.env}"

if [[ ! -f "$CRED_FILE" ]]; then
  echo "Missing credentials file: $CRED_FILE" >&2
  exit 1
fi

zone=""
token=""
user="$TARGET_USER"
password=""
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%%#*}"
  line="$(echo "$line" | tr -d '\r' | xargs)"
  [[ -z "$line" || "$line" != *"="* ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  case "$key" in
    CLOUDFLARE_ZONE_ID_PRODUCTION|CLOUDFLARE_ZONE_ID) [[ -z "$zone" ]] && zone="$val" ;;
    CLOUDFLARE_API_TOKEN) token="$val" ;;
    VM_SSH_USER) user="$val" ;;
    VM_SSH_PASSWORD) password="$val" ;;
  esac
done <"$CRED_FILE"

if [[ -z "$zone" || -z "$token" ]]; then
  echo "CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN required in $CRED_FILE" >&2
  exit 1
fi
if [[ -z "$password" ]]; then
  echo "VM_SSH_PASSWORD required in $CRED_FILE for non-interactive install" >&2
  exit 1
fi

tmp="$(mktemp)"
chmod 600 "$tmp"
cat >"$tmp" <<EOF
# Managed by scripts/install-vm-deploy-env.sh — do not commit
CF_ZONE_ID=$zone
CF_API_TOKEN=$token
EOF

if command -v sshpass >/dev/null 2>&1; then
  sshpass -p "$password" scp -o StrictHostKeyChecking=no "$tmp" "${user}@${TARGET_HOST}:${TARGET_PATH}.new"
  sshpass -p "$password" ssh -o StrictHostKeyChecking=no "${user}@${TARGET_HOST}" \
    "sudo mkdir -p /opt/mycosoft && sudo mv ${TARGET_PATH}.new ${TARGET_PATH} && sudo chown root:${user} ${TARGET_PATH} && sudo chmod 640 ${TARGET_PATH}"
else
  scp "$tmp" "${user}@${TARGET_HOST}:${TARGET_PATH}.new"
  ssh "${user}@${TARGET_HOST}" \
    "sudo mkdir -p /opt/mycosoft && sudo mv ${TARGET_PATH}.new ${TARGET_PATH} && sudo chown root:${user} ${TARGET_PATH} && sudo chmod 640 ${TARGET_PATH}"
fi
rm -f "$tmp"

echo "Installed ${TARGET_PATH} on ${TARGET_HOST}"
echo "Verify: ssh ${user}@${TARGET_HOST} 'grep -c CF_ZONE_ID ${TARGET_PATH}'"
