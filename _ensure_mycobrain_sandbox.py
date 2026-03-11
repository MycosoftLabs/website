#!/usr/bin/env python3
"""Ensure MycoBrain service is always-on on Sandbox VM - Mar 07, 2026

Run this script to install, fix, or verify the MycoBrain service on 192.168.0.187.
Does NOT rebuild the website - only ensures MycoBrain (systemd + watchdog) is running.

Usage: python _ensure_mycobrain_sandbox.py
"""

import io
import os
import paramiko
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)

VM_HOST = os.environ.get("SANDBOX_VM_HOST", "192.168.0.187")
VM_USER = os.environ.get("VM_SSH_USER", "mycosoft")
VM_PASS = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
MAS_GIT = "https://github.com/Mycosoft/mycosoft-mas.git"
MAS_ROOT = "/opt/mycosoft/mas/mycosoft-mas"
# Fallback if /opt requires root; mycosoft can clone here without sudo
MAS_ROOT_FALLBACK = "/home/mycosoft/mas/mycosoft-mas"


def load_credentials():
    creds_file = Path(__file__).parent / ".credentials.local"
    if creds_file.exists():
        for line in creds_file.read_text().splitlines():
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()
        return True
    return False


load_credentials()
VM_PASS = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")

if not VM_PASS:
    print("ERROR: VM_PASSWORD not found. Create .credentials.local with VM_SSH_PASSWORD=...")
    sys.exit(1)


def _default_unit(mas_root: str) -> str:
    return f"""[Unit]
Description=MycoBrain serial gateway and ingestion service (port 8003)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mycosoft
Group=mycosoft
WorkingDirectory={mas_root}
ExecStart=/usr/bin/python3 {mas_root}/services/mycobrain/mycobrain_service_standalone.py
Restart=always
RestartSec=3
StartLimitIntervalSec=0
TimeoutStartSec=30
Environment=MYCOBRAIN_SERVICE_PORT=8003
Environment=MAS_REGISTRY_URL=http://192.168.0.188:8001
Environment=TELEMETRY_INGEST_URL=http://127.0.0.1:3000/api/devices/ingest
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mycobrain-service

[Install]
WantedBy=multi-user.target
"""


def main():
    print(f"Connecting to {VM_HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)

    def run(cmd: str, timeout: int = 60) -> tuple[int, str, str]:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        code = stdout.channel.recv_exit_status()
        out = stdout.read().decode(errors="replace").strip()
        err = stderr.read().decode(errors="replace").strip()
        return code, out, err

    def run_sudo(cmd: str, timeout: int = 60) -> tuple[int, str, str]:
        """Run command with sudo; use sudo -S if password required."""
        code, out, err = run(cmd, timeout=timeout)
        if code == 0:
            return code, out, err
        if "password" in (err + out).lower() or "sorry" in (err + out).lower():
            # Run as root via single sudo -S sh -c (avoids multiple password prompts)
            inner = cmd.replace("sudo ", "")
            escaped = VM_PASS.replace("'", "'\"'\"'").replace("\\", "\\\\").replace("\n", " ").replace("\r", "")
            wrapped = f"echo '{escaped}' | sudo -S sh -c {repr(inner)}"
            return run(wrapped, timeout=timeout)
        return code, out, err

    # 1. Ensure MAS repo exists
    print("\n1. Checking MAS repo...")
    mas_root = None
    for candidate in [MAS_ROOT, MAS_ROOT_FALLBACK, "/opt/mycosoft/mas", "/opt/mycosoft/mycosoft-mas", "/home/mycosoft/mycosoft-mas"]:
        code, out, _ = run(f"test -f {candidate}/services/mycobrain/mycobrain_service_standalone.py && echo {candidate}", timeout=5)
        if candidate in out:
            mas_root = candidate
            break
    if not mas_root:
        # Broader search
        code, out, _ = run("find /opt /home -name mycobrain_service_standalone.py -type f 2>/dev/null | head -1", timeout=10)
        if out.strip():
            p = out.strip().replace("/services/mycobrain/mycobrain_service_standalone.py", "")
            if p:
                mas_root = p
    if not mas_root:
        print("   MAS repo not found. Trying clone to ~/mas (no sudo)...")
        run("mkdir -p /home/mycosoft/mas", timeout=5)
        code, out, err = run(f"cd /home/mycosoft/mas && git clone {MAS_GIT} 2>&1", timeout=120)
        if code != 0:
            print(f"   Clone failed (repo may be private): {err or out}")
            print("   Deploy MAS to Sandbox manually, then re-run this script:")
            print("   1. SSH: ssh mycosoft@192.168.0.187")
            print("   2. Clone or rsync MAS to /home/mycosoft/mas/mycosoft-mas or /opt/mycosoft/mas/mycosoft-mas")
            print("   3. Re-run: python _ensure_mycobrain_sandbox.py")
            ssh.close()
            sys.exit(1)
        mas_root = MAS_ROOT_FALLBACK
        print("   MAS repo cloned.")
    else:
        print(f"   MAS repo OK at {mas_root}.")

    # 1.5 Ensure Python deps (poetry or dedicated venv fallback)
    print("\n1.5 Ensuring Python dependencies...")
    python_exe = "/usr/bin/python3"
    venv_dir = "/home/mycosoft/.venv-mycobrain"  # User-writable, survives reboots
    code, out, _ = run(f"cd {mas_root} && poetry install --no-interaction 2>&1", timeout=120)
    if code == 0:
        code2, venv_path, _ = run(f"cd {mas_root} && poetry env info -p 2>/dev/null || true", timeout=5)
        if code2 == 0 and venv_path.strip() and venv_path.strip().startswith("/"):
            python_exe = f"{venv_path.strip()}/bin/python"
            print(f"   Using Poetry venv: {python_exe}")
        else:
            print("   Poetry deps OK (using system python).")
    else:
        # Create dedicated venv - systemd uses minimal env, pip --user doesn't work there
        print("   Poetry failed; creating dedicated MycoBrain venv...")
        # Ensure python3-venv is installed (Debian/Ubuntu)
        run_sudo("sudo apt-get update -qq 2>/dev/null; sudo apt-get install -y python3-venv 2>&1 || sudo apt-get install -y python3.12-venv 2>&1 || true", timeout=120)
        code_mk, out_mk, err_mk = run(f"mkdir -p /home/mycosoft && rm -rf {venv_dir} && /usr/bin/python3 -m venv {venv_dir} 2>&1", timeout=30)
        if code_mk != 0:
            print(f"   venv create failed: {err_mk or out_mk}")
        code_venv, out_venv, err_venv = run(
            f"{venv_dir}/bin/python -m pip install httpx fastapi uvicorn pydantic pyserial 2>&1",
            timeout=90,
        )
        if code_venv != 0:
            print(f"   pip install failed: {err_venv or out_venv}")
        else:
            # Verify import
            code_imp, _, _ = run(f"{venv_dir}/bin/python -c 'import httpx' 2>&1", timeout=5)
            if code_imp == 0:
                python_exe = f"{venv_dir}/bin/python"
                print(f"   Installed deps in venv: {python_exe}")
            else:
                print("   Import check failed; continuing anyway.")

    # 2. Install systemd unit
    print("\n2. Installing systemd unit...")
    repo_root = Path(__file__).resolve().parent
    unit_path = repo_root / "scripts" / "sandbox" / "mycobrain-service.service"
    unit_content = unit_path.read_text(encoding="utf-8").replace("/opt/mycosoft/mas/mycosoft-mas", mas_root) if unit_path.exists() else _default_unit(mas_root)
    unit_content = unit_content.replace("/usr/bin/python3", python_exe)
    if "PYTHONPATH=" not in unit_content:
        unit_content = unit_content.replace("Environment=MAS_REGISTRY_URL=", f"Environment=PYTHONPATH={mas_root}\nEnvironment=MAS_REGISTRY_URL=")
    sftp = ssh.open_sftp()
    sftp.putfo(io.BytesIO(unit_content.encode("utf-8")), "/tmp/mycobrain-service.service")
    sftp.close()
    code, out, err = run_sudo(
        "sudo mv /tmp/mycobrain-service.service /etc/systemd/system/ && "
        "sudo systemctl daemon-reload && "
        "sudo systemctl enable mycobrain-service && "
        "sudo systemctl start mycobrain-service",
        timeout=15,
    )
    if code != 0:
        print(f"   Error: {err or out}")
    else:
        print("   Unit installed, enabled, started.")
    time.sleep(3)

    # 3. Install watchdog
    print("\n3. Installing watchdog (cron every 1 min)...")
    watchdog_path = repo_root / "scripts" / "sandbox" / "mycobrain-watchdog.sh"
    watchdog_content = watchdog_path.read_text(encoding="utf-8") if watchdog_path.exists() else """#!/bin/bash
HTTP=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 http://127.0.0.1:8003/health 2>/dev/null || echo "000")
ACTIVE=$(systemctl is-active mycobrain-service 2>/dev/null || echo "unknown")
[ "$HTTP" != "200" ] || [ "$ACTIVE" != "active" ] && systemctl restart mycobrain-service 2>/dev/null || true
"""
    sftp = ssh.open_sftp()
    sftp.putfo(io.BytesIO(watchdog_content.encode("utf-8")), "/tmp/mycobrain-watchdog.sh")
    sftp.close()
    run_sudo("sudo mkdir -p /opt/mycosoft/scripts && sudo mv /tmp/mycobrain-watchdog.sh /opt/mycosoft/scripts/ && sudo chmod +x /opt/mycosoft/scripts/mycobrain-watchdog.sh", timeout=10)
    run_sudo("""(sudo crontab -l 2>/dev/null | grep -v mycobrain-watchdog; echo '*/1 * * * * /opt/mycosoft/scripts/mycobrain-watchdog.sh') | sudo crontab -""", timeout=10)
    print("   Watchdog installed.")

    # 4. Verify health (retry up to 30s - service may need time to start)
    print("\n4. Verifying MycoBrain health...")
    http_code, status = "000", "unknown"
    for attempt in range(6):
        code, out, _ = run("curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 --max-time 3 http://127.0.0.1:8003/health 2>/dev/null || echo 000", timeout=5)
        http_code = out.strip() or "000"
        code2, status_out, _ = run("systemctl is-active mycobrain-service 2>/dev/null || echo unknown", timeout=3)
        status = status_out.strip()
        if http_code == "200" and "active" in status:
            break
        if attempt < 5:
            time.sleep(5)

    journal_out = ""
    if http_code != "200" or "active" not in status:
        _, journal_out, _ = run_sudo("sudo journalctl -u mycobrain-service -n 30 --no-pager 2>/dev/null || true", timeout=5)

    ssh.close()

    if http_code == "200" and "active" in status:
        print("   MycoBrain is UP and healthy.")
        print("\n✅ MycoBrain service ensured on Sandbox. Will never stay down (systemd + 1-min watchdog).")
    else:
        print(f"   HTTP: {http_code}, systemd: {status}")
        if journal_out.strip():
            print("\n   --- mycobrain-service logs ---")
            for line in journal_out.strip().split("\n")[-25:]:
                print("   ", line)
            print("   ---")
        print("\n   Fix: ssh mycosoft@192.168.0.187")
        print("   Then: sudo journalctl -u mycobrain-service -n 50")
        print("   If Python/import errors: pip install -r requirements.txt or poetry install in MAS repo on VM.")


if __name__ == "__main__":
    main()
