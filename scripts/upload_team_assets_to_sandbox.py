#!/usr/bin/env python3
"""Upload team images from local public/assets/team to Sandbox VM NAS mount.

VM mounts /opt/mycosoft/media/website/assets from NAS. Team images must be in
/opt/mycosoft/media/website/assets/team/ for sandbox.mycosoft.com to serve them.

Usage: python scripts/upload_team_assets_to_sandbox.py
"""
import os
from pathlib import Path

import paramiko

VM_HOST = "192.168.0.187"
VM_USER = "mycosoft"
REMOTE_TEAM_DIR = "/opt/mycosoft/media/website/assets/team"

# Required by team-data.ts
REQUIRED_IMAGES = [
    "morgan-rockwell-new.png",
    "garret-baquet.png",
    "rj-ricasata.png",
    "chris-freetage.png",
    "alberto-septien.png",
    "michelle-seven.png",
]


def load_credentials() -> None:
    for base in [Path(__file__).resolve().parent.parent, Path(__file__).resolve().parent.parent.parent.parent / "mycosoft-mas"]:
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
        raise RuntimeError("VM_PASSWORD not found. Set in .credentials.local")

    local_team = Path(__file__).resolve().parent.parent / "public" / "assets" / "team"
    if not local_team.exists():
        raise SystemExit(f"Local team dir missing: {local_team}")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VM_HOST, username=VM_USER, password=password, timeout=30)
    sftp = ssh.open_sftp()

    # Ensure remote dir exists
    try:
        sftp.stat(REMOTE_TEAM_DIR)
    except FileNotFoundError:
        # Create parent and team dir
        for d in ["/opt/mycosoft/media/website/assets", REMOTE_TEAM_DIR]:
            try:
                sftp.mkdir(d)
                print(f"Created {d}")
            except OSError:
                pass

    uploaded = 0
    missing = []
    for name in REQUIRED_IMAGES:
        local_path = local_team / name
        remote_path = f"{REMOTE_TEAM_DIR}/{name}"
        if not local_path.exists():
            missing.append(name)
            continue
        size = local_path.stat().st_size
        sftp.put(str(local_path), remote_path)
        print(f"Uploaded {name} ({size:,} bytes)")
        uploaded += 1

    sftp.close()
    ssh.close()

    print(f"\nDone: {uploaded} uploaded to {REMOTE_TEAM_DIR}")
    if missing:
        print(f"Missing locally (not uploaded): {', '.join(missing)}")


if __name__ == "__main__":
    main()
