#!/usr/bin/env python3
"""One-off: check VM build exit, log tail, container status."""
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
pw = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
if not pw:
    print("No VM_PASSWORD")
    exit(1)
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.0.187", username="mycosoft", password=pw, timeout=15)

def run(cmd):
    i, o, e = c.exec_command(cmd, timeout=20)
    return o.read().decode(errors="replace").strip(), e.read().decode(errors="replace").strip()

exit_out, _ = run("cat /tmp/rebuild_build.exit 2>/dev/null || echo MISSING")
log_out, _ = run("tail -25 /tmp/rebuild_build.log 2>/dev/null || echo NONE")
ps_out, _ = run('docker ps -a --filter name=mycosoft-website --format "{{.Names}} {{.Status}} {{.CreatedAt}}" 2>/dev/null || echo NONE')
c.close()
print("EXIT:", exit_out)
print("--- LOG TAIL ---")
print(log_out)
print("--- CONTAINER ---")
print(ps_out)
