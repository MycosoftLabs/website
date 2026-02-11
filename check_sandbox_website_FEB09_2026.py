#!/usr/bin/env python3
"""
Sandbox website health check - Feb 9, 2026.

Checks:
- container status
- HTTP status from localhost:3000 on the VM
"""

from __future__ import annotations

import sys
import time

import paramiko

from _rebuild_sandbox import VM_HOST, VM_PASS, VM_USER


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)

    def run(cmd: str, timeout: int = 60) -> str:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode("utf-8", errors="replace").strip()
        return out

    print(run("docker ps --filter name=mycosoft-website --format '{{.Names}}\\t{{.Status}}\\t{{.Ports}}'"))
    print("MAS health from sandbox VM:", run("curl -s -o /dev/null -w '%{http_code}' http://192.168.0.188:8001/health"))

    for i in range(10):
        code = run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000", timeout=30)
        print(f"Attempt {i+1}/10: HTTP {code}")
        if code in {"200", "307"}:
            break
        time.sleep(3)

    ssh.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

