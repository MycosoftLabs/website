#!/usr/bin/env python3
"""
Fetch the deploy private key from the Sandbox VM and set GitHub Actions secret SSH_KEY_B64.
Uses .credentials.local (MAS repo or website repo) for VM_SSH_PASSWORD.
Requires: paramiko, gh cli authenticated for the website repo.
Run from website repo: python scripts/set-github-ssh-secret-from-vm.py
"""
import base64
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlparse

try:
    import paramiko
except ImportError:
    print("Install paramiko: pip install paramiko", file=sys.stderr)
    sys.exit(1)


def load_credentials():
    """Load VM_SSH_PASSWORD from .credentials.local (MAS or website repo)."""
    root = Path(__file__).resolve().parent.parent
    for candidate in [root / ".credentials.local", root.parent.parent / "MAS" / "mycosoft-mas" / ".credentials.local"]:
        if candidate.exists():
            for line in candidate.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()
            return os.environ.get("VM_SSH_PASSWORD")
    return None


def resolve_repo(repo_root: Path) -> str:
    """Resolve target GitHub repo for `gh secret set`."""
    if os.environ.get("GH_REPO"):
        return os.environ["GH_REPO"].strip()
    if os.environ.get("GITHUB_REPOSITORY"):
        return os.environ["GITHUB_REPOSITORY"].strip()

    # Fallback to this repo's origin URL (works in local dev).
    remote = subprocess.run(
        ["git", "remote", "get-url", "origin"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    remote_url = (remote.stdout or "").strip()
    if not remote_url:
        return "MycosoftLabs/website"

    if remote_url.startswith("git@github.com:"):
        path = remote_url.split("git@github.com:", 1)[1]
    else:
        parsed = urlparse(remote_url)
        path = parsed.path.lstrip("/")

    if path.endswith(".git"):
        path = path[:-4]
    return path or "MycosoftLabs/website"


def set_secret(repo_root: Path, repo: str, body: str, environment: str | None = None) -> None:
    """Set SSH_KEY_B64 secret at repo scope or environment scope."""
    cmd = ["gh", "secret", "set", "SSH_KEY_B64", "--body", body, "-R", repo]
    scope = "repository"
    if environment:
        cmd.extend(["--env", environment])
        scope = f"environment:{environment}"

    result = subprocess.run(
        cmd,
        cwd=repo_root,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Failed setting {scope} secret:\n{result.stderr or result.stdout}"
        )


def main():
    host = os.environ.get("DEPLOY_HOST", "192.168.0.187")
    user = os.environ.get("SSH_USER", "mycosoft")
    password = load_credentials()
    if not password:
        print("VM_SSH_PASSWORD not found in .credentials.local", file=sys.stderr)
        sys.exit(1)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, username=user, password=password, timeout=15)
    except Exception as e:
        print(f"SSH connect failed: {e}", file=sys.stderr)
        sys.exit(1)

    # Prefer ed25519, fallback to rsa
    key_pem = None
    for key_path in ["~/.ssh/id_ed25519", "~/.ssh/id_rsa"]:
        _, stdout, stderr = client.exec_command(f"cat {key_path} 2>/dev/null")
        out = stdout.read().decode("utf-8", errors="replace").strip()
        if out and "BEGIN" in out and "PRIVATE" in out:
            key_pem = out
            break
    client.close()

    if not key_pem:
        print("No private key found on VM at ~/.ssh/id_ed25519 or ~/.ssh/id_rsa", file=sys.stderr)
        sys.exit(1)

    b64 = base64.b64encode(key_pem.encode("utf-8")).decode("ascii")

    repo_root = Path(__file__).resolve().parent.parent
    with tempfile.NamedTemporaryFile(mode="w", suffix=".b64", delete=False) as f:
        f.write(b64)
        tmp = f.name
    repo = resolve_repo(repo_root)

    try:
        with open(tmp, "r") as f:
            body = f.read()

        set_secret(repo_root, repo, body)
        print(f"SSH_KEY_B64 set at repository scope for {repo}.")

        # Deploy jobs run in environment: production; keep env secrets in sync.
        set_secret(repo_root, repo, body, environment="production")
        print("SSH_KEY_B64 set for environment:production.")
    finally:
        try:
            os.unlink(tmp)
        except OSError:
            pass


if __name__ == "__main__":
    main()
