#!/usr/bin/env python3
"""Quick check on VM 187: build status, container, assets path. No deploy."""
import os
import sys
from pathlib import Path

# Load credentials like _rebuild_sandbox.py
for fname in (".credentials.local", ".env.local"):
    f = Path(__file__).parent / fname
    if f.exists():
        for line in f.read_text().splitlines():
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip().strip('"\'')
VM_PASS = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
if not VM_PASS:
    print("No VM_PASSWORD in .credentials.local"); sys.exit(1)

import paramiko
VM_HOST = "192.168.0.187"
VM_USER = os.environ.get("VM_SSH_USER", "mycosoft")

def run(ssh, cmd, timeout=30):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    code = out.channel.recv_exit_status()
    return code, out.read().decode(errors="replace").strip(), err.read().decode(errors="replace").strip()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)

print("=== Build status ===")
code, out, _ = run(client, "test -f /tmp/rebuild_build.exit && cat /tmp/rebuild_build.exit")
if code == 0:
    print(f"Build exit code: {out}")
else:
    print("Build exit file not found (build may still be running or never started)")
code, out, _ = run(client, "tail -30 /tmp/rebuild_build.log 2>/dev/null || echo '(no log)'")
print(f"Last 30 lines of build log:\n{out}")

print("\n=== Container ===")
code, out, _ = run(client, "docker ps -a --filter name=mycosoft-website --format '{{.Names}} {{.Status}} {{.Ports}}'")
print(out or "(no container)")
code, out, _ = run(client, "docker inspect mycosoft-website --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{\"\\n\"}}{{end}}' 2>/dev/null || echo '(inspect failed)'")
print("Mounts:", out or "none")

print("\n=== Local HTTP ===")
code, out, _ = run(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000")
print(f"localhost:3000 HTTP: {out}")

print("\n=== Assets (NAS mount path) ===")
code, out, _ = run(client, "ls -la /opt/mycosoft/media/website/assets 2>/dev/null || echo 'NAS path missing'")
print(out[:800] if out else "empty")
code, out, _ = run(client, "ls -la /opt/mycosoft/media/website/assets/homepage 2>/dev/null || echo 'homepage dir missing'")
print(out[:800] if out else "empty")

client.close()
print("\nDone.")
