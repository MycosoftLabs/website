"""Upload and run names-only env probe on 187."""
from __future__ import annotations

import os
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[2]
CREDS_CANDIDATES = [
    ROOT / ".credentials.local",
    Path(r"d:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas\.credentials.local"),
]


def load_creds() -> None:
    for creds in CREDS_CANDIDATES:
        if not creds.exists():
            continue
        for line in creds.read_text(encoding="utf-8").splitlines():
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())
        return
    raise SystemExit("credentials file missing")


def main() -> None:
    load_creds()
    password = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD") or ""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect("192.168.0.187", username="mycosoft", password=password, timeout=30)
    sftp = ssh.open_sftp()
    sftp.put(str(ROOT / "scripts/launchpad/_probe_env_names.sh"), "/tmp/_probe_env_names.sh")
    sftp.close()
    stdin, stdout, stderr = ssh.exec_command(
        "sed -i 's/\\r$//' /tmp/_probe_env_names.sh && sh /tmp/_probe_env_names.sh",
        timeout=45,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    ssh.close()
    print(out)
    if err.strip():
        print(err.replace(password, "[redacted]")[-1500:])
    raise SystemExit(code)


if __name__ == "__main__":
    main()
