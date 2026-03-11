#!/usr/bin/env python3
"""Quick check of MycoBrain service on Sandbox VM."""
import os
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

root = Path(__file__).resolve().parent.parent
creds = root / ".credentials.local"
if not creds.exists():
    creds = root.parent / "MAS/mycosoft-mas/.credentials.local"
if creds.exists():
    for line in creds.read_text().splitlines():
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip()

import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("192.168.0.187", username="mycosoft", password=os.environ.get("VM_SSH_PASSWORD", ""))

for label, cmd in [
    ("systemctl status", "systemctl status mycobrain-service"),
    ("curl health", "curl -s -o /dev/null -w 'HTTP%{http_code}' --connect-timeout 2 http://127.0.0.1:8003/health; echo"),
    ("unit file", "cat /etc/systemd/system/mycobrain-service.service 2>/dev/null | head -25"),
]:
    _, out, err = client.exec_command(cmd)
    text = (out.read() + err.read()).decode("utf-8", errors="replace")
    print(f"--- {label} ---")
    print(text)

client.close()
