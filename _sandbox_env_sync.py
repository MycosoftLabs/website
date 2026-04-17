#!/usr/bin/env python3
"""Sync env keys from local .env.local to Sandbox VM (192.168.0.187).

FALLBACK/OPS TOOL: Production deploy gets Supabase and build config from
GitHub Actions secrets; VM .env is for runtime-only keys (Stripe, etc.).
Use this script only when you need to push updated keys to the VM manually
(e.g. after rotating Stripe or adding a new key). Uses .credentials.local
and .env.local (never committed).

Writes /opt/mycosoft/website/.env on the VM so the website container can use
STRIPE_SECRET_KEY, Supabase, and other keys. Run this after changing keys
or before first deploy.

Usage:
  python _sandbox_env_sync.py           # sync and optionally restart container
  python _sandbox_env_sync.py --no-restart   # sync only, do not restart
"""

import argparse
import os
import sys
from pathlib import Path

import paramiko

# Allowlist: only these vars are written to the VM .env (no SSH/VM/Cloudflare creds).
SANDBOX_ENV_ALLOWLIST = [
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "MINDEX_API_KEY",
    "MAS_API_KEY",
    "NEXT_PUBLIC_BASE_URL",
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_API_URL",
    "DATABASE_URL",
    "REDIS_URL",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "ELEVENLABS_API_KEY",
    "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
    "MAPBOX_ACCESS_TOKEN",
    "AZURE_MAPS_KEY",
    "AISSTREAM_API_KEY",
    "EBIRD_API_KEY",
    "NEXT_PUBLIC_NEWS_API_KEY",
    "NEXT_PUBLIC_TMDB_API_KEY",
    "SLACK_WEBHOOK",
    "ALERT_WEBHOOK_URL",
    # LAN services (MAS / MINDEX / PersonaPlex bridge on GPU Legions)
    "MAS_API_URL",
    "NEXT_PUBLIC_MAS_API_URL",
    "MINDEX_API_URL",
    "PERSONAPLEX_BRIDGE_URL",
    "NEXT_PUBLIC_PERSONAPLEX_BRIDGE_URL",
    # iNat ETL — GitHub Actions cron POSTs /api/etl/inat/sync with x-cron-token
    "ETL_CRON_TOKEN",
]


def load_credentials():
    """Load from .credentials.local and .env.local - never ask user for password."""
    for fname in (".credentials.local", ".env.local"):
        creds_file = Path(__file__).parent / fname
        if creds_file.exists():
            for line in creds_file.read_text(encoding="utf-8", errors="replace").splitlines():
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip().strip('"\'')


def main():
    parser = argparse.ArgumentParser(description="Sync .env keys to Sandbox VM")
    parser.add_argument("--no-restart", action="store_true", help="Do not restart website container after sync")
    args = parser.parse_args()

    load_credentials()
    VM_HOST = os.environ.get("SANDBOX_VM_HOST", "192.168.0.187")
    VM_USER = os.environ.get("SANDBOX_VM_USER", os.environ.get("VM_SSH_USER", "mycosoft"))
    VM_PASS = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
    WEBSITE_DIR = "/opt/mycosoft/website"

    if not VM_PASS:
        print("ERROR: VM_PASSWORD not set. Create .credentials.local with VM_SSH_PASSWORD=...")
        sys.exit(1)

    lines = []
    for key in SANDBOX_ENV_ALLOWLIST:
        value = os.environ.get(key)
        if value:
            # Escape newlines and backslashes for env file
            safe = value.replace("\\", "\\\\").replace("\n", "\\n").replace('"', '\\"')
            if " " in safe or "#" in safe or "=" in safe:
                lines.append(f'{key}="{safe}"')
            else:
                lines.append(f"{key}={safe}")
    if not lines:
        print("No allowlisted keys found in .env.local. Add STRIPE_SECRET_KEY, etc.")
        sys.exit(0)

    env_content = "\n".join(lines) + "\n"
    print(f"Syncing {len(lines)} env vars to {VM_HOST}:{WEBSITE_DIR}/.env ...")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)

    try:
        sftp = client.open_sftp()
        remote = f"{WEBSITE_DIR}/.env"
        with sftp.file(remote, "w") as f:
            f.write(env_content)
        sftp.close()
        print(f"Wrote {remote}")

        if not args.no_restart:
            print("Restarting website container so it picks up new env...")
            stdin, stdout, stderr = client.exec_command(
                "docker restart mycosoft-website 2>/dev/null || true", timeout=30
            )
            stdout.channel.recv_exit_status()
            err = stderr.read().decode().strip()
            if err:
                print("Note:", err)
            else:
                print("Container restarted.")
    except Exception as e:
        print("Warning:", e)
        print("Env file was written. Restart container on VM: docker restart mycosoft-website")
    finally:
        client.close()

    if args.no_restart:
        print("Skipped restart (--no-restart). Run 'docker restart mycosoft-website' on VM to apply.")


if __name__ == "__main__":
    main()
