#!/usr/bin/env python3
"""Restart website container on Sandbox VM with NAS assets mount.

Ensures /opt/mycosoft/media/website/assets is mounted to /app/public/assets
so team images and other media are served.
"""
import os
from pathlib import Path

import paramiko

VM_HOST = "192.168.0.187"
VM_USER = "mycosoft"
CONTAINER = "mycosoft-website"
IMAGE = "mycosoft-always-on-mycosoft-website:latest"


def load_credentials() -> None:
    for base in [
        Path(__file__).resolve().parent.parent,
        Path(__file__).resolve().parent.parent.parent.parent / "mycosoft-mas",
    ]:
        creds = base / ".credentials.local"
        if creds.exists():
            for line in creds.read_text().splitlines():
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()
            return


def main() -> None:
    load_credentials()
    password = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
    if not password:
        raise RuntimeError("VM_PASSWORD not found")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VM_HOST, username=VM_USER, password=password, timeout=60)

    cmds = [
        f"docker stop {CONTAINER} 2>/dev/null || true",
        f"docker rm {CONTAINER} 2>/dev/null || true",
        f'docker run -d --name {CONTAINER} -p 3000:3000 '
        f'-v /opt/mycosoft/media/website/assets:/app/public/assets:ro '
        f'--restart unless-stopped {IMAGE}',
        "sleep 5",
        "docker ps | grep mycosoft-website",
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000",
    ]
    for cmd in cmds:
        print(f"> {cmd}")
        _, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode()
        err = stderr.read().decode()
        if out:
            print(out)
        if err and "Cannot remove" not in err and "No such container" not in err:
            print("stderr:", err)

    ssh.close()
    print("\nContainer restarted with NAS assets mount.")
    print("Run Cloudflare purge and verify: https://mycosoft.com/about/human-team")


if __name__ == "__main__":
    main()
