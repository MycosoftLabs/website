#!/usr/bin/env python3
"""One-off: Install python3.12-venv and create MycoBrain venv on Sandbox."""
import os
import paramiko
from pathlib import Path

creds = Path(__file__).parent / ".credentials.local"
if creds.exists():
    for line in creds.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip()

p = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
if not p:
    print("No VM_PASSWORD"); exit(1)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.0.187", username="mycosoft", password=p, timeout=30)
esc = p.replace("'", "'\"'\"'").replace("\\", "\\\\").replace("\n", " ").replace("\r", "")

def safe_print(s):
    try:
        print(s)
    except UnicodeEncodeError:
        print(repr(s)[:500])

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    code = stdout.channel.recv_exit_status()
    return code, stdout.read().decode(errors="replace"), stderr.read().decode(errors="replace")

def sudo(cmd):
    code, out, err = run(cmd)
    if code != 0 and ("password" in (out+err).lower() or "sorry" in (out+err).lower()):
        inner = cmd.replace("sudo ", "")
        return run(f"echo '{esc}' | sudo -S sh -c {repr(inner)}")
    return code, out, err

print("1. apt update...")
code, out, err = sudo("sudo apt-get update -qq")
print(out or err or f"code={code}")

print("2. apt install python3.12-venv...")
code, out, err = sudo("sudo apt-get install -y python3.12-venv")
print(out or err or f"code={code}")

print("3. Create venv...")
code, out, err = run("rm -rf /home/mycosoft/.venv-mycobrain && /usr/bin/python3 -m venv /home/mycosoft/.venv-mycobrain")
print(out or err or f"code={code}")

print("4. pip install...")
code, out, err = run("/home/mycosoft/.venv-mycobrain/bin/python -m pip install httpx fastapi uvicorn pydantic pyserial")
safe_print(out or err or f"code={code}")

print("5. Verify import...")
code, out, err = run("/home/mycosoft/.venv-mycobrain/bin/python -c 'import httpx; print(\"OK\")'")
safe_print(out or err or f"code={code}")

ssh.close()
print("Done.")
