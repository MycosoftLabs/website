#!/usr/bin/env python3
"""Verify team assets and container config on Sandbox VM."""
import os
import json
from pathlib import Path

import paramiko

VM_HOST = "192.168.0.187"
VM_USER = "mycosoft"


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
    ssh.connect(VM_HOST, username=VM_USER, password=password, timeout=30)

    # 1. List team files on NAS
    _, stdout, _ = ssh.exec_command("ls -la /opt/mycosoft/media/website/assets/team/")
    out = stdout.read().decode()
    print("=== Team files on NAS ===")
    print(out)

    # 2. Check container mounts
    _, stdout, _ = ssh.exec_command(
        "docker inspect mycosoft-website --format '{{json .Mounts}}'"
    )
    mounts_json = stdout.read().decode().strip()
    if mounts_json:
        mounts = json.loads(mounts_json)
        has_assets = any(
            m.get("Destination") == "/app/public/assets"
            for m in mounts
            if isinstance(m, dict)
        )
        print("\n=== Container mounts ===")
        for m in mounts:
            if isinstance(m, dict):
                print(f"  {m.get('Source','')} -> {m.get('Destination','')}")
        print(f"\nAssets mount present: {has_assets}")
        if not has_assets:
            print("WARNING: Container may not have NAS assets mount!")
    else:
        print("\nCould not get container mounts (container may not exist)")

    ssh.close()


if __name__ == "__main__":
    main()
