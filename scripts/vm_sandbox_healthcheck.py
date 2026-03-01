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


def run(ssh: paramiko.SSHClient, command: str) -> str:
    stdin, stdout, stderr = ssh.exec_command(command, timeout=30)
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

    endpoints = [
        "http://localhost:3000/api/health",
        "http://localhost:3000/api/mas/health",
        "http://localhost:3000/api/mindex/health",
    ]

    for endpoint in endpoints:
        print(run(ssh, f"curl -s -o /dev/null -w '%{{http_code}}' {endpoint}"))

    ssh.close()


if __name__ == "__main__":
    main()
