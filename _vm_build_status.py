"""Quick VM check: build exit file and container status. Load .credentials.local then run."""
import os
import sys
from pathlib import Path

# Load credentials
creds = Path(__file__).resolve().parent / ".credentials.local"
if creds.exists():
    for line in creds.read_text().splitlines():
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip()

pw = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD") or ""
if not pw:
    print("No VM_PASSWORD or VM_SSH_PASSWORD in .credentials.local")
    sys.exit(1)

import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    c.connect("192.168.0.187", username="mycosoft", password=pw, timeout=60)
except Exception as e:
    print("SSH connect failed:", e)
    sys.exit(2)

def run(cmd, timeout=90):
    _, stdout, _ = c.exec_command(cmd, timeout=timeout)
    return stdout.read().decode().strip()

# One shot: exit file, container list, build processes, last 25 lines of build log
cmd = (
    "echo '=== EXIT ==='; cat /tmp/rebuild_build.exit 2>/dev/null || true; "
    "echo '=== CONTAINERS ==='; docker ps -a --format '{{.Names}} {{.Status}}' 2>/dev/null | head -10; "
    "echo '=== BUILD PROCESSES ==='; ps aux | grep -E 'docker|build' | grep -v grep || true; "
    "echo '=== LOG TAIL ==='; tail -25 /tmp/rebuild_build.log 2>/dev/null || true"
)
out = run(cmd)
print(out)
c.close()
