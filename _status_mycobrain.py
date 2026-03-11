#!/usr/bin/env python3
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
ssh.connect("192.168.0.187", username="mycosoft", password=p, timeout=15)
def run(c):
    i, o, e = ssh.exec_command(c, 10)
    return o.channel.recv_exit_status(), o.read().decode(), e.read().decode()
c1, o1, e1 = run("systemctl is-active mycobrain-service")
c2, o2, e2 = run('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8003/health')
print("systemd:", (o1 or e1).strip(), "code", c1)
print("curl:", (o2 or e2).strip() or "empty", "code", c2)
ssh.close()
