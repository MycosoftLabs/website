#!/usr/bin/env python3
"""One-off: check VM 187 container status and run Cloudflare purge for production."""
import os
import sys
from pathlib import Path

# Load creds from website repo root (same as _rebuild_sandbox.py)
repo = Path(__file__).resolve().parent.parent
for fname in (".credentials.local", ".env.local"):
    f = repo / fname
    if f.exists():
        for line in f.read_text().splitlines():
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"\''))

import paramiko

VM = "192.168.0.187"
USER = os.environ.get("VM_SSH_USER", "mycosoft")
PASS = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
if not PASS:
    print("No VM_PASSWORD"); sys.exit(1)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VM, username=USER, password=PASS, timeout=15)

def run(cmd, timeout=30):
    _, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode().strip(), e.read().decode().strip()

out, _ = run("docker ps -a --filter name=mycosoft-website --format '{{.ID}} {{.Image}} {{.Status}} {{.CreatedAt}}'")
print("Container:", out or "(none)")
out2, _ = run("docker images mycosoft-always-on-mycosoft-website --format '{{.Repository}}:{{.Tag}} {{.CreatedAt}}' --no-trunc")
print("Image:", out2 or "(none)")
code, _ = run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000")
print("HTTP 3000:", code)
c.close()

# Purge production zone (script dir = website root)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.chdir(Path(__file__).resolve().parent.parent)
from _cloudflare_cache import purge_everything
# Use production zone if set
zone = os.environ.get("CLOUDFLARE_ZONE_ID_PRODUCTION") or os.environ.get("CLOUDFLARE_ZONE_ID")
ok = purge_everything(zone_id_override=zone)
print("Purge:", "OK" if ok else "skipped or failed")
