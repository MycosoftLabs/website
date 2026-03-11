import os
from pathlib import Path

import paramiko


def load_pw() -> str:
    creds = Path(__file__).resolve().parent.parent / ".credentials.local"
    if creds.exists():
        for line in creds.read_text(encoding="utf-8", errors="ignore").splitlines():
            if "=" not in line or line.strip().startswith("#"):
                continue
            key, value = line.split("=", 1)
            if key.strip() in {"VM_PASSWORD", "VM_SSH_PASSWORD"} and value.strip():
                return value.strip()
    return os.environ.get("VM_PASSWORD", "") or os.environ.get("VM_SSH_PASSWORD", "")


def main() -> None:
    pw = load_pw()
    if not pw:
        raise RuntimeError("Missing VM credentials")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect("192.168.0.187", username="mycosoft", password=pw, timeout=20)

    checks = [
        "hostname",
        "date",
        "ps -ef | grep -E 'docker build|_rebuild_sandbox|python' | grep -v grep | head -n 20",
        "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'",
        "docker images | head -n 10",
    ]

    for cmd in checks:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
        out = stdout.read().decode(errors="replace")
        err = stderr.read().decode(errors="replace")
        print(f"\n### {cmd}\n{out}{err}")

    ssh.close()


if __name__ == "__main__":
    main()
