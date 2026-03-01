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


def run(ssh: paramiko.SSHClient, command: str, password: str | None, sudo: bool = False, timeout: int = 1800) -> str:
    cmd = f"sudo -S -p '' {command}" if sudo else command
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    if sudo and password:
        stdin.write(password + "\n")
        stdin.flush()
    out = stdout.read().decode(errors="replace").strip()
    err = stderr.read().decode(errors="replace").strip()
    return "\n".join([line for line in (out, err) if line])


def main() -> None:
    load_credentials()
    user = os.environ.get("VM_SSH_USER", "mycosoft")
    password = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
    if not password:
        raise RuntimeError("VM_PASSWORD not found.")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect("192.168.0.187", username=user, password=password, timeout=30)

    print(run(ssh, "cd /opt/mycosoft/website && git fetch origin", password))
    print(run(ssh, "cd /opt/mycosoft/website && git reset --hard origin/main", password))
    print(run(ssh, "docker stop mycosoft-website || true", password))
    print(run(ssh, "docker rm mycosoft-website || true", password))
    build_cmd = (
        "cd /opt/mycosoft/website && "
        "docker build -t mycosoft-always-on-mycosoft-website:latest --no-cache . "
        "> /tmp/mycosoft_website_build.log 2>&1"
    )
    print(run(ssh, build_cmd, password, timeout=3600))
    print(run(ssh, "tail -n 200 /tmp/mycosoft_website_build.log", password, timeout=60))
    print(run(
        ssh,
        "docker run -d --name mycosoft-website -p 3000:3000 "
        "-v /opt/mycosoft/media/website/assets:/app/public/assets:ro "
        "--restart unless-stopped mycosoft-always-on-mycosoft-website:latest",
        password,
    ))
    print(run(ssh, "sleep 10 && docker ps --format '{{.Names}} {{.Status}}' | grep mycosoft-website", password))
    print(run(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000", password))
    ssh.close()


if __name__ == "__main__":
    main()
