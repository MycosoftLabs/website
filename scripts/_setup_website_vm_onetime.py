#!/usr/bin/env python3
"""One-time setup on website VM: mkdir /opt/mycosoft/website and clone repo. Mar 15, 2026."""
import os
import sys
from pathlib import Path

# Load credentials from repo root
repo = Path(__file__).resolve().parent.parent
creds = repo / ".credentials.local"
if creds.exists():
    for line in creds.read_text().splitlines():
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip().strip("'\"")

import paramiko

host = os.environ.get("SANDBOX_VM_HOST", "192.168.0.187")
user = os.environ.get("VM_SSH_USER", "mycosoft")
pw = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
if not pw:
    print("ERROR: VM_PASSWORD not in .credentials.local")
    sys.exit(1)

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(host, username=user, password=pw, timeout=30)

# If .git exists, pull; else clone into . Then copy shared .env if present.
cmd = (
    "mkdir -p /opt/mycosoft/website && cd /opt/mycosoft/website && "
    "(test -d .git && git pull origin main || git clone https://github.com/MycosoftLabs/website.git .) && "
    "([ -f /opt/mycosoft/.env ] && cp /opt/mycosoft/.env /opt/mycosoft/website/.env || true)"
)
stdin, stdout, stderr = cli.exec_command(cmd, get_pty=True)
out = stdout.read().decode()
err = stderr.read().decode()
code = stdout.channel.recv_exit_status()
cli.close()

print(out)
if err:
    print("stderr:", err)
print("Exit code:", code)
sys.exit(0 if code == 0 else 1)
