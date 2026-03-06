#!/usr/bin/env python3
"""One-shot deploy website to Sandbox VM (192.168.0.187)."""
import os
import sys

try:
    import paramiko
except ImportError:
    print("ERROR: paramiko not installed. Run: pip install paramiko")
    sys.exit(1)

VM = "192.168.0.187"
USER = "mycosoft"
PASS = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
DIR = "/opt/mycosoft/website"

if not PASS:
    print("ERROR: VM_PASSWORD or VM_SSH_PASSWORD not set. Load .credentials.local first.")
    sys.exit(1)


def run(ssh, cmd, desc=""):
    if desc:
        print(">>>", desc)
    print("$", cmd[:90] + ("..." if len(cmd) > 90 else ""))
    i, o, e = ssh.exec_command(cmd, timeout=600)
    code = o.channel.recv_exit_status()
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    if out:
        print(out[:3000])
    if err and code:
        print("STDERR:", err[:800])
    return code


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VM, username=USER, password=PASS, timeout=30)
    try:
        run(c, f"cd {DIR} && git fetch origin && git reset --hard origin/main", "Pull code")
        run(c, "docker stop mycosoft-website 2>/dev/null; docker rm mycosoft-website 2>/dev/null", "Stop container")
        code = run(c, f"cd {DIR} && docker build -t mycosoft-always-on-mycosoft-website:latest --no-cache .", "Build image")
        if code != 0:
            print("Build failed")
            sys.exit(1)
        run(
            c,
            "docker run -d --name mycosoft-website -p 3000:3000 -v /opt/mycosoft/media/website/assets:/app/public/assets:ro --restart unless-stopped mycosoft-always-on-mycosoft-website:latest",
            "Start container",
        )
        print("\nDeploy done. Purge Cloudflare cache next.")
    finally:
        c.close()


if __name__ == "__main__":
    main()
