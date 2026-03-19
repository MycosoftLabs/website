#!/usr/bin/env python3
"""
Check if /opt/mycosoft/.env exists on Sandbox VM (192.168.0.187) and upload
.env.production.generated there if needed. Uses .credentials.local for VM_PASSWORD.
Run from website repo root: python scripts/upload-compose-env-to-vm.py
"""
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GENERATED = REPO_ROOT / ".env.production.generated"
VM_HOST = os.environ.get("SANDBOX_VM_HOST", "192.168.0.187")
VM_USER = os.environ.get("SANDBOX_VM_USER", os.environ.get("VM_SSH_USER", "mycosoft"))
REMOTE_PATH = "/opt/mycosoft/.env"


def load_credentials() -> None:
    """Load from website and MAS .credentials.local / .env.local (no secrets printed)."""
    for base in (REPO_ROOT, REPO_ROOT.parent / "MAS" / "mycosoft-mas"):
        for fname in (".credentials.local", ".env.local"):
            p = base / fname
            if p.exists():
                for line in p.read_text().splitlines():
                    if line and not line.startswith("#") and "=" in line:
                        key, _, value = line.partition("=")
                        os.environ[key.strip()] = value.strip().strip('"\'').strip()


def main() -> int:
    load_credentials()
    vm_pass = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
    if not vm_pass:
        print("ERROR: VM_PASSWORD not set. Add VM_SSH_PASSWORD=... to .credentials.local (website or MAS repo).")
        return 1

    if not GENERATED.exists():
        print("ERROR: .env.production.generated not found. Run: python scripts/build-production-env.py")
        return 1

    try:
        import paramiko
    except ImportError:
        print("ERROR: paramiko not installed. Run: pip install paramiko")
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(VM_HOST, username=VM_USER, password=vm_pass, timeout=30)
    except Exception as e:
        print(f"ERROR: SSH to {VM_HOST} failed: {e}")
        return 1

    try:
        # Check if remote .env exists and list key names only
        stdin, stdout, stderr = client.exec_command(f"test -f {REMOTE_PATH} && echo exists || echo missing", timeout=10)
        status = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        if err:
            print("Note:", err)
        print(f"On VM: {REMOTE_PATH} -> {status}")

        content = GENERATED.read_text()
        key_names = [line.split("=", 1)[0].strip() for line in content.splitlines() if line.strip() and "=" in line and not line.strip().startswith("#")]
        print(f"Uploading {len(key_names)} variables (keys only): {', '.join(key_names[:8])}{'...' if len(key_names) > 8 else ''}")

        sftp = client.open_sftp()
        try:
            with sftp.file(REMOTE_PATH, "w") as f:
                f.write(content)
        finally:
            sftp.close()
        print(f"Wrote {REMOTE_PATH} on {VM_HOST}.")
        return 0
    except Exception as e:
        print("ERROR:", e)
        return 1
    finally:
        client.close()


if __name__ == "__main__":
    sys.exit(main())
