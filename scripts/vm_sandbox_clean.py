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


def run(ssh: paramiko.SSHClient, command: str, password: str | None = None, sudo: bool = False) -> str:
    cmd = f"sudo -S -p '' {command}" if sudo else command
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=300)
    if sudo and password:
        stdin.write(password + "\n")
        stdin.flush()
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
        "pkill -9 -f 'docker build' || true",
        "docker rm -f mycosoft-website 2>/dev/null || true",
        "docker image rm -f mycosoft-always-on-mycosoft-website:latest 2>/dev/null || true",
        "docker builder prune -af || true",
        "rm -f /tmp/mycosoft_website_build.log || true",
    ]
    for command in commands:
        print(run(ssh, command, password, sudo=False))

    ssh.close()


if __name__ == "__main__":
    main()
