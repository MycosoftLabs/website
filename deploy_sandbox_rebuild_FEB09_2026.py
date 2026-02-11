#!/usr/bin/env python3
"""
Deploy website to Sandbox VM (187) - Feb 9, 2026.

This is a non-interactive deploy helper for Cursor runs:
- git fetch/reset on the VM to origin/main
- docker build --no-cache
- restart container with required NAS mount
- purge Cloudflare cache

Secrets are not duplicated here; credentials come from existing deploy modules.
"""

from __future__ import annotations

import sys
import time

import paramiko

from _cloudflare_cache import purge_everything
from _rebuild_sandbox import VM_HOST, VM_PASS, VM_USER, WEBSITE_DIR


def run(ssh: paramiko.SSHClient, cmd: str, timeout: int = 1200) -> tuple[int, str, str]:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return exit_code, out, err


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print(f"Connecting to {VM_HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)

    cmds: list[tuple[str, int]] = [
        (f"cd {WEBSITE_DIR} && git fetch origin", 300),
        (f"cd {WEBSITE_DIR} && git reset --hard origin/main", 300),
        (f"cd {WEBSITE_DIR} && git log -1 --oneline", 60),
        # Be robust to compose vs run naming differences.
        ("docker rm -f mycosoft-website mycosoft_website 2>/dev/null || true", 60),
        ("docker rm -f $(docker ps -aq --filter \"name=mycosoft-website\") 2>/dev/null || true", 60),
        # Stream build output into stdout so failures are visible.
        (f"cd {WEBSITE_DIR} && docker build -t mycosoft-always-on-mycosoft-website:latest --no-cache . 2>&1", 1800),
        (
            "docker run -d --name mycosoft-website -p 3000:3000 "
            "-v /opt/mycosoft/media/website/assets:/app/public/assets:ro "
            "--restart unless-stopped mycosoft-always-on-mycosoft-website:latest",
            120,
        ),
        ("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000", 60),
    ]

    for cmd, timeout in cmds:
        print(f"\n> {cmd}")
        code, out, err = run(ssh, cmd, timeout=timeout)
        if out:
            print(out if len(out) < 4000 else out[-4000:])
        if err:
            print(f"[stderr] {err[:1200]}")

        # Hard-stop if the Docker build fails; the image won't exist.
        if "docker build -t mycosoft-always-on-mycosoft-website:latest" in cmd and code != 0:
            print(f"[ERROR] Docker build failed (exit {code}). Aborting deploy.")
            ssh.close()
            return 1

        if code != 0 and "curl -s -o /dev/null" not in cmd:
            print(f"[WARN] Non-zero exit code {code} for: {cmd}")

    print("\nWaiting briefly for site warmup...")
    time.sleep(3)

    ssh.close()

    print("\nPurging Cloudflare cache (purge everything)...")
    purge_everything()
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

