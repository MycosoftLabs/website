#!/usr/bin/env python3
"""Restart Cloudflare Tunnel (cloudflared) on Sandbox VM to fix error 1033."""
import os
import paramiko
from pathlib import Path

# Resolve path: scripts -> website -> WEBSITE -> CODE
_code = Path(__file__).resolve().parents[3]
creds_file = _code / "MAS" / "mycosoft-mas" / ".credentials.local"
if not creds_file.exists():
    creds_file = Path(__file__).parent.parent / ".credentials.local"
password = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD") or ""
if creds_file.exists():
    for line in creds_file.read_text().splitlines():
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            if key.strip() in ["VM_SSH_PASSWORD", "VM_PASSWORD"]:
                password = value.strip()
                break

mas_vm, sandbox_vm, username = "192.168.0.188", "192.168.0.187", "mycosoft"

def connect_sandbox():
    # Try direct connection first (dev PC on same LAN)
    sb = paramiko.SSHClient()
    sb.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        sb.connect(sandbox_vm, username=username, password=password, timeout=10)
        return sb, None
    except Exception as e:
        sb.close()
    # Fallback: jump via MAS
    mas = paramiko.SSHClient()
    mas.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    mas.connect(mas_vm, username=username, password=password, timeout=10)
    ch = mas.get_transport().open_channel("direct-tcpip", (sandbox_vm, 22), (mas_vm, 22))
    sb = paramiko.SSHClient()
    sb.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    sb.connect(sandbox_vm, username=username, password=password, sock=ch, timeout=10)
    return sb, mas

sb, mas = connect_sandbox()

# Check cloudflared - common service names
cmds = [
    "systemctl status cloudflared 2>&1 | head -5",
    "systemctl list-units --all | grep -i cloudflare",
    "which cloudflared",
    "ps aux | grep -E 'cloudflared|tunnel' | grep -v grep",
]
for c in cmds:
    _, out, _ = sb.exec_command(c)
    r = out.read().decode(errors="replace").strip()
    # Avoid Unicode bullets that break Windows console
    r = r.replace("\u25cf", "*").replace("\u25cb", "o")
    print(f">> {c[:50]}...")
    print(r or "(none)")
    print()

# Restart cloudflared (try common service names)
restarted = False
for svc in ["cloudflared", "cloudflare-tunnel"]:
    stdin, out, err = sb.exec_command(f"sudo -S systemctl restart {svc} 2>&1", get_pty=True)
    stdin.write(password + "\n")
    stdin.flush()
    code = out.channel.recv_exit_status()
    txt = (out.read() + err.read()).decode(errors="replace").strip()
    if code == 0:
        print(f">> Restarted {svc} successfully")
        restarted = True
        break
    if "not found" not in txt.lower() and "failed" in txt.lower() and "no such" not in txt.lower():
        print(f">> {svc}: {txt[:200]}")

# Fallback: try restarting Docker tunnel container
if not restarted:
    print(">> No systemd service found, trying Docker container...")
    _, out, _ = sb.exec_command("docker restart mycosoft-tunnel 2>&1")
    code = out.channel.recv_exit_status()
    txt = out.read().decode(errors="replace").strip()
    if code == 0:
        print(f">> Restarted Docker tunnel container: {txt}")
    else:
        print(f">> Docker restart failed: {txt}")
        # Last resort: start tunnel via docker-compose if available
        _, out, _ = sb.exec_command(
            "cd /opt/mycosoft && docker compose -f docker-compose.production.yml up -d cloudflared 2>&1 || "
            "cd /opt/mycosoft/website && docker compose -f docker-compose.production.yml up -d cloudflared 2>&1"
        )
        code = out.channel.recv_exit_status()
        txt = out.read().decode(errors="replace").strip()
        print(f">> docker-compose up cloudflared: {txt}")

sb.close()
if mas:
    mas.close()
print(">> Done.")
