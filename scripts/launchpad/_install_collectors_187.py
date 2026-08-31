"""Install Launchpad collectors timer on 187. Never prints secret values."""
from __future__ import annotations

import os
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[2]
CREDS_CANDIDATES = [
    ROOT / ".credentials.local",
    Path(r"d:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas\.credentials.local"),
]


def load_creds() -> None:
    for creds in CREDS_CANDIDATES:
        if not creds.exists():
            continue
        for line in creds.read_text(encoding="utf-8").splitlines():
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())
        return
    raise SystemExit("credentials file missing")


def main() -> None:
    load_creds()
    password = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD") or ""
    if not password:
        raise SystemExit("VM_PASSWORD unset")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect("192.168.0.187", username="mycosoft", password=password, timeout=30)
    sftp = ssh.open_sftp()
    sftp.put(
        str(ROOT / "scripts/launchpad/mycosoft-launchpad-collectors.service"),
        "/tmp/mycosoft-launchpad-collectors.service",
    )
    sftp.put(
        str(ROOT / "scripts/launchpad/mycosoft-launchpad-collectors.timer"),
        "/tmp/mycosoft-launchpad-collectors.timer",
    )
    sftp.close()
    wrapper = """
set -euo pipefail
read -r SUDO_PW
cd /opt/mycosoft/website
if ! grep -q '^LAUNCHPAD_INGEST_BEARER=.\+' .env 2>/dev/null; then
  token=$(openssl rand -hex 24)
  printf '\\nLAUNCHPAD_INGEST_BEARER=%s\\n' "$token" >> .env
  echo "ingest_bearer=generated"
else
  echo "ingest_bearer=present"
fi
printf '%s\\n' "$SUDO_PW" | sudo -S cp /tmp/mycosoft-launchpad-collectors.service /etc/systemd/system/mycosoft-launchpad-collectors.service
printf '%s\\n' "$SUDO_PW" | sudo -S cp /tmp/mycosoft-launchpad-collectors.timer /etc/systemd/system/mycosoft-launchpad-collectors.timer
printf '%s\\n' "$SUDO_PW" | sudo -S systemctl daemon-reload
printf '%s\\n' "$SUDO_PW" | sudo -S systemctl enable --now mycosoft-launchpad-collectors.timer
unset SUDO_PW
systemctl is-enabled mycosoft-launchpad-collectors.timer || true
systemctl list-timers --all | grep -i launchpad || true
git -C /opt/mycosoft/website rev-parse --short HEAD || true
docker ps --format '{{.Names}} {{.Image}}' | grep -i website || true
test -n "$(grep -E '^STRIPE_LAUNCHPAD_WEBHOOK_SECRET=.+' .env || true)" && echo webhook_secret=set || echo webhook_secret=absent
test -n "$(grep -E '^SAM_API_KEY=.+' .env || true)" && echo sam_key=set || echo sam_key=absent
test -n "$(grep -E '^CALCOM_WEBHOOK_SECRET=.+' .env || true)" && echo calcom_webhook=set || echo calcom_webhook=absent
test -n "$(grep -E '^DOCUSIGN_INTEGRATION_KEY=.+' .env || true)" && echo docusign_ik=set || echo docusign_ik=absent
test -n "$(grep -E '^LAUNCHPAD_INGEST_BEARER=.+' .env || true)" && echo ingest_bearer=set || echo ingest_bearer=absent
"""
    stdin, stdout, stderr = ssh.exec_command("bash -s", timeout=60)
    stdin.write(password + "\n")
    stdin.write(wrapper)
    stdin.channel.shutdown_write()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    ssh.close()
    print(out)
    redacted = err.replace(password, "[redacted]") if password else err
    if redacted.strip():
        print(redacted[-2000:])
    raise SystemExit(code)


if __name__ == "__main__":
    main()
