#!/usr/bin/env python3
"""Fetch journalctl for mycobrain-service on Sandbox."""
import os
import paramiko
from pathlib import Path

creds = Path(__file__).parent / ".credentials.local"
if creds.exists():
    for line in creds.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip()

p = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
if not p:
    print("No VM_PASSWORD")
    exit(1)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.0.187", username="mycosoft", password=p, timeout=30)
escaped = p.replace("'", "'\"'\"'").replace("\\", "\\\\").replace("\n", " ")
stdin, stdout, stderr = ssh.exec_command(
    f"echo '{escaped}' | sudo -S journalctl -u mycobrain-service -n 60 --no-pager 2>/dev/null",
    timeout=15,
)
print(stdout.read().decode(errors="replace"))
ssh.close()
