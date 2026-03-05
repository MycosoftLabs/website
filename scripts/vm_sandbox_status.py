#!/usr/bin/env python3
import os
import sys
from pathlib import Path

import paramiko


def load_credentials() -> None:
    creds_path = Path(__file__).resolve().parent.parent / ".credentials.local"
    if not creds_path.exists():
        return
    for line in creds_path.read_text().splitlines():
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ[key.strip()] = value.strip()


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    load_credentials()
    user = os.environ.get("VM_SSH_USER", "mycosoft")
    password = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
    if not password:
        raise RuntimeError("VM_PASSWORD not found.")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect("192.168.0.187", username=user, password=password, timeout=30)

    commands = [
        "timeout 20 docker ps --format '{{.Names}} {{.Status}}' || echo 'docker_ps_timeout'",
        "timeout 20 sh -lc \"docker images --format '{{.Repository}}:{{.Tag}} {{.CreatedSince}}' | head -n 5\" || echo 'docker_images_timeout'",
        "ps -ef | grep 'docker build' | grep -v grep || true",
        "test -f /tmp/mycosoft_website_build.log && tail -n 140 /tmp/mycosoft_website_build.log || true",
    ]
    for command in commands:
        stdin, stdout, stderr = client.exec_command(command, timeout=30)
        out = stdout.read().decode(errors="replace").strip()
        err = stderr.read().decode(errors="replace").strip()
        print(out or err)

    client.close()


if __name__ == "__main__":
    main()
