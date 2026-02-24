#!/usr/bin/env python3
"""Diagnose sandbox video 404 - check NAS mount and container config."""

import os
import sys
from pathlib import Path

# Load credentials
creds_file = Path(__file__).resolve().parent.parent / ".credentials.local"
if creds_file.exists():
    for line in creds_file.read_text().splitlines():
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ[key.strip()] = value.strip()

VM_HOST = "192.168.0.187"
VM_USER = os.environ.get("VM_SSH_USER", "mycosoft")
VM_PASS = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")

if not VM_PASS:
    print("ERROR: VM_PASSWORD not set. Create .credentials.local with VM_SSH_PASSWORD=...")
    sys.exit(1)

def main():
    import paramiko
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)

    def run(cmd):
        _, stdout, stderr = client.exec_command(cmd, timeout=30)
        code = stdout.channel.recv_exit_status()
        out = stdout.read().decode(errors="replace").strip()
        err = stderr.read().decode(errors="replace").strip()
        return code, out, err

    print("=== 1. NAS mount path on VM ===")
    code, out, err = run("ls -la /opt/mycosoft/media/website/assets/ 2>&1")
    print(f"Exit: {code}\n{out or err}")

    print("\n=== 2. SporeBase folder on VM ===")
    code, out, err = run("ls -la /opt/mycosoft/media/website/assets/sporebase/ 2>&1")
    print(f"Exit: {code}\n{out or err}")

    print("\n=== 3. Container mounts ===")
    code, out, err = run("docker inspect mycosoft-website --format '{{json .Mounts}}' 2>&1")
    print(f"Exit: {code}\n{out or err}")

    print("\n=== 4. Files inside container /app/public/assets/sporebase/ ===")
    code, out, err = run("docker exec mycosoft-website ls -la /app/public/assets/sporebase/ 2>&1")
    print(f"Exit: {code}\n{out or err}")

    print("\n=== 5. Direct curl to localhost:3000 for video ===")
    code, out, err = run("curl -sI http://localhost:3000/assets/sporebase/sporebase1publish.mp4 2>&1 | head -5")
    print(f"Exit: {code}\n{out or err}")

    client.close()

if __name__ == "__main__":
    main()
