"""Ensure LAUNCHPAD_INGEST_BEARER exists on 187 host .env. Never prints the value."""
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


REMOTE = r"""
python3 - <<'PY'
from pathlib import Path
import secrets
p = Path("/opt/mycosoft/website/.env")
text = p.read_text(encoding="utf-8", errors="replace")
lines = text.splitlines()
present = False
for line in lines:
    if line.startswith("LAUNCHPAD_INGEST_BEARER="):
        val = line.split("=", 1)[1].strip()
        if val:
            present = True
            break
if present:
    print("ingest_bearer=present")
else:
    kept = [ln for ln in lines if not ln.startswith("LAUNCHPAD_INGEST_BEARER=")]
    kept.append("LAUNCHPAD_INGEST_BEARER=" + secrets.token_hex(24))
    p.write_text("\n".join(kept) + "\n", encoding="utf-8")
    print("ingest_bearer=generated")
# names only
for k in ("LAUNCHPAD_INGEST_BEARER", "STRIPE_LAUNCHPAD_WEBHOOK_SECRET"):
    ok = any(ln.startswith(k + "=") and ln.split("=", 1)[1].strip() for ln in p.read_text(encoding="utf-8").splitlines())
    print(f"{k}={'set' if ok else 'absent'}")
PY
"""


def main() -> None:
    load_creds()
    password = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD") or ""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect("192.168.0.187", username="mycosoft", password=password, timeout=30)
    stdin, stdout, stderr = ssh.exec_command(REMOTE, timeout=30)
    print(stdout.read().decode("utf-8", errors="replace"))
    err = stderr.read().decode("utf-8", errors="replace")
    if err.strip():
        print(err.replace(password, "[redacted]")[-800:])
    raise SystemExit(stdout.channel.recv_exit_status())


if __name__ == "__main__":
    main()
