#!/usr/bin/env python3
"""Check MycoBrain status on Sandbox."""
import os, paramiko
from pathlib import Path
creds = Path(__file__).parent / ".credentials.local"
if creds.exists():
    for line in creds.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip()
p = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.0.187", username="mycosoft", password=p, timeout=30)
def run(c, t=60):
    stdin, stdout, stderr = ssh.exec_command(c, t)
    code = stdout.channel.recv_exit_status()
    return code, stdout.read().decode(errors="replace"), stderr.read().decode(errors="replace")
def sudo(cmd):
    esc = p.replace("'", "'\"'\"'").replace("\\", "\\\\").replace("\n", " ").replace("\r", "")
    return run(f"echo '{esc}' | sudo -S sh -c {repr(cmd)}")
for label, cmd, need_sudo in [
    ("systemd", "systemctl is-active mycobrain-service", False),
    ("curl localhost", "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8003/health", False),
    ("journal", "journalctl -u mycobrain-service -n 25 --no-pager", True),
]:
    code, out, err = (sudo(cmd) if need_sudo else run(cmd))
    print(f"--- {label} ---"); print(out or err or f"code={code}")
ssh.close()
