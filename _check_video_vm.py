#!/usr/bin/env python3
"""Check VM 187 for NAS assets path and hero video file."""
import os
import paramiko
from pathlib import Path

for f in (".credentials.local", ".env.local"):
    p = Path(__file__).parent / f
    if p.exists():
        for line in p.read_text().splitlines():
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip().strip("'\"")
host = "192.168.0.187"
user = os.environ.get("VM_SSH_USER", "mycosoft")
pw = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
if not pw:
    print("No VM_PASSWORD")
    exit(1)
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=user, password=pw, timeout=15)
for label, cmd in [
    ("assets dir", "ls -la /opt/mycosoft/media/website/assets 2>&1 | head -25"),
    ("homepage", "ls -la /opt/mycosoft/media/website/assets/homepage 2>&1"),
    ("Mycosoft Background", "ls -la '/opt/mycosoft/media/website/assets/homepage/Mycosoft Background' 2>&1"),
    ("container mounts", "docker inspect mycosoft-website --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}; {{end}}' 2>&1"),
]:
    _, out, err = c.exec_command(cmd, timeout=10)
    t = (out.read() + err.read()).decode().strip()
    print(f"--- {label} ---\n{t}\n")
c.close()
