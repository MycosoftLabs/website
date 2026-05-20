#!/usr/bin/env python3
"""Install /opt/mycosoft/deploy.env on production VM for blue/green CF purge."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import paramiko

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CRED = REPO_ROOT / ".credentials.local"
TARGET_PATH = "/opt/mycosoft/deploy.env"


def parse_credentials(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        out[key.strip()] = value.strip().strip('"').strip("'")
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="192.168.0.187")
    parser.add_argument("--cred-file", type=Path, default=DEFAULT_CRED)
    args = parser.parse_args()

    if not args.cred_file.is_file():
        print(f"Missing {args.cred_file}", file=sys.stderr)
        return 1

    creds = parse_credentials(args.cred_file)
    zone = creds.get("CLOUDFLARE_ZONE_ID_PRODUCTION") or creds.get("CLOUDFLARE_ZONE_ID", "")
    token = creds.get("CLOUDFLARE_API_TOKEN", "")
    user = creds.get("VM_SSH_USER", "mycosoft")
    password = creds.get("VM_SSH_PASSWORD", "")
    host = creds.get("SANDBOX_VM_IP", args.host)

    if not zone or not token:
        print("CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN required in credentials", file=sys.stderr)
        return 1
    if not password:
        print("VM_SSH_PASSWORD required in credentials", file=sys.stderr)
        return 1

    body = (
        "# Managed by scripts/install_vm_deploy_env.py — do not commit\n"
        f"CF_ZONE_ID={zone}\n"
        f"CF_API_TOKEN={token}\n"
    )

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, timeout=30)

    def sudo(cmd: str) -> tuple[int, str]:
        stdin, stdout, stderr = ssh.exec_command(f"sudo -S -p '' bash -lc {repr(cmd)}", timeout=60)
        stdin.write(password + "\n")
        stdin.flush()
        out = (stdout.read() + stderr.read()).decode("utf-8", errors="replace")
        return stdout.channel.recv_exit_status(), out

    sftp = ssh.open_sftp()
    remote_tmp = f"/home/{user}/deploy.env.new"
    with sftp.file(remote_tmp, "w") as f:
        f.write(body)
    sftp.chmod(remote_tmp, 0o600)
    sftp.close()

    rc, out = sudo(
        f"mkdir -p /opt/mycosoft && "
        f"mv {remote_tmp} {TARGET_PATH}.new && "
        f"chown root:{user} {TARGET_PATH}.new && "
        f"chmod 640 {TARGET_PATH}.new && "
        f"mv {TARGET_PATH}.new {TARGET_PATH}"
    )
    if rc != 0:
        print(out, file=sys.stderr)
        return rc

    rc, out = sudo(f"test -r {TARGET_PATH} && wc -l < {TARGET_PATH}")
    if rc != 0 or not out.strip():
        print(out, file=sys.stderr)
        return rc or 1

    # Purge is verified from the admin machine (same token as deploy.env).
    import requests

    resp = requests.post(
        f"https://api.cloudflare.com/client/v4/zones/{zone}/purge_cache",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"purge_everything": True},
        timeout=20,
    )
    data = resp.json()
    if not (resp.ok and data.get("success")):
        print(f"Cloudflare purge test failed: {data}", file=sys.stderr)
        return 2

    ssh.close()
    print(f"OK: installed {TARGET_PATH} on {host} ({out.strip()} lines)")
    print("Cloudflare purge API verified (purge_everything)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
