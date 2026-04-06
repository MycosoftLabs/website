#!/usr/bin/env python3
import os
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


def run(ssh: paramiko.SSHClient, command: str, timeout: int = 120) -> str:
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    out = stdout.read().decode(errors="replace").strip()
    err = stderr.read().decode(errors="replace").strip()
    return out or err


def main() -> None:
    load_credentials()
    user = os.environ.get("VM_SSH_USER", "mycosoft")
    password = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
    if not password:
        raise RuntimeError("VM_PASSWORD not found.")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect("192.168.0.187", username=user, password=password, timeout=30)

    commands = [
        "docker rm -f mycosoft-website 2>/dev/null || true",
        "docker run -d --name mycosoft-website -p 3000:3000 "
        "-e NEXTAUTH_URL=https://sandbox.mycosoft.com "
        "-e AUTH_TRUST_HOST=true "
        "-e MAS_API_URL=http://${MAS_VM_HOST:-localhost}:8001 "
        "-e NEXT_PUBLIC_MAS_API_URL=http://${MAS_VM_HOST:-localhost}:8001 "
        "-e MINDEX_API_URL=http://${MINDEX_VM_HOST:-localhost}:8000 "
        "-e MINDEX_API_BASE_URL=http://${MINDEX_VM_HOST:-localhost}:8000 "
        "-e NEXT_PUBLIC_MINDEX_API_BASE_URL=http://${MINDEX_VM_HOST:-localhost}:8000 "
        "-v /opt/mycosoft/media/website/assets:/app/public/assets:ro "
        "--restart unless-stopped mycosoft-always-on-mycosoft-website:latest",
        "sleep 10",
        "docker ps --format '{{.Names}} {{.Status}}' | grep mycosoft-website || true",
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000",
    ]

    for command in commands:
        print(run(ssh, command))

    ssh.close()


if __name__ == "__main__":
    main()
