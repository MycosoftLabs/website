#!/usr/bin/env python3
"""SSH to Sandbox VM 187: verify NAS path, docker bind mount, and HTTP HEAD for canonical MP4s.

Container name may be mycosoft-website (standard deploy) or website-live; any container
publishing port 3000 is inspected.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

import paramiko

VM_HOST = "192.168.0.187"
NAS_PATH = "/opt/mycosoft/media/website/assets"
CANONICAL_URLS = [
    ("homepage hero", "http://127.0.0.1:3000/assets/homepage/Mycosoft%20Background.mp4", 1024),
    ("mushroom1 walking", "http://127.0.0.1:3000/assets/mushroom1/mushroom%201%20walking.mp4", 10_000),
]


def load_credentials() -> None:
    here = Path(__file__).resolve().parent
    website_root = here.parent
    code_root = website_root.parent.parent
    for base in (website_root, code_root / "MAS" / "mycosoft-mas"):
        p = base / ".credentials.local"
        if p.exists():
            for line in p.read_text(encoding="utf-8").splitlines():
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip("\"\''"))
            return


def run(ssh: paramiko.SSHClient, cmd: str, timeout: int = 60) -> tuple[int, str, str]:
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    rc = stdout.channel.recv_exit_status()
    return (
        rc,
        stdout.read().decode("utf-8", errors="replace"),
        stderr.read().decode("utf-8", errors="replace"),
    )


def parse_content_length(head: str) -> int | None:
    for line in head.splitlines():
        m = re.match(r"^[Cc]ontent-[Ll]ength:\s*(\d+)", line.strip())
        if m:
            return int(m.group(1))
    return None


def main() -> int:
    load_credentials()
    user = os.environ.get("VM_SSH_USER", "mycosoft")
    password = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
    if not password:
        print("ERROR: VM_PASSWORD / VM_SSH_PASSWORD not set (check .credentials.local)")
        return 1

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(VM_HOST, username=user, password=password, timeout=30)
    except Exception as e:
        print(f"ERROR: SSH connect to {VM_HOST} failed: {e}")
        return 1

    ok = True
    try:
        print("=== findmnt (NAS path) ===")
        _, out, _ = run(ssh, "findmnt -T " + NAS_PATH + " 2>/dev/null || true")
        print(out or "(none)")

        print("\n=== ls " + NAS_PATH + " (sample) ===")
        _, out, _ = run(ssh, f"ls -la {NAS_PATH} 2>&1 | head -20")
        print(out)
        if "No such file" in out or not out.strip():
            ok = False

        print("\n=== Zero-byte MP4s on NAS (should be empty) ===")
        _, out, _ = run(
            ssh,
            f"find {NAS_PATH} -name '*.mp4' -size 0 2>/dev/null | head -20 || true",
        )
        print(out or "(none)")
        if out.strip():
            print("WARNING: 0-byte MP4 files found — replace via NAS/UniFi upload.")
            ok = False

        print("\n=== Website container on :3000 + NAS bind mount ===")
        _, cname, _ = run(
            ssh,
            "docker ps --filter publish=3000 --format '{{.Names}}' | head -1",
        )
        cname = cname.strip()
        if not cname:
            print("ERROR: No container publishing port 3000")
            ok = False
        else:
            print(f"Container: {cname}")
            _, mout, _ = run(
                ssh,
                f"docker inspect {cname} --format '{{{{json .Mounts}}}}' 2>/dev/null",
            )
            print(mout)
            if NAS_PATH not in mout:
                print("WARNING: Expected NAS bind mount source missing.")
                ok = False

        print("\n=== curl -sI canonical MP4s (localhost:3000) ===")
        for label, url, min_len in CANONICAL_URLS:
            safe = url.replace("'", "'\\''")
            _, out, _ = run(ssh, f"curl -sI '{safe}' | head -20")
            print(f"--- {label} ---\n{out}")
            cl = parse_content_length(out)
            if "200" not in out[:400]:
                ok = False
            elif cl is not None and cl < min_len:
                print(f"FAIL: Content-Length {cl} < minimum {min_len} bytes")
                ok = False
            elif cl == 0:
                print("FAIL: Content-Length is 0 — file on NAS is empty")
                ok = False
    finally:
        ssh.close()

    print("\n=== RESULT ===")
    if ok:
        print("verify_sandbox_nas_media: PASS")
        return 0
    print("verify_sandbox_nas_media: FAIL — fix NAS files, docker -v, or container")
    return 2


if __name__ == "__main__":
    sys.exit(main())
