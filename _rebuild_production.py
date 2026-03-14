#!/usr/bin/env python3
"""Rebuild and restart website on Production VM (192.168.0.186) - March 13, 2026
Deploys to mycosoft.com. Mirror of _rebuild_sandbox but VM 186, no MycoBrain."""
import base64
import io
import os
import paramiko
import sys
import time
from pathlib import Path
from _cloudflare_cache import purge_everything

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)


def load_credentials():
    """Load from .credentials.local and .env.local (for Supabase, etc.)."""
    for fname in (".credentials.local", ".env.local"):
        creds_file = Path(__file__).parent / fname
        if creds_file.exists():
            for line in creds_file.read_text().splitlines():
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip().strip('"\'')
    return True


load_credentials()


def _build_supabase_args():
    """Build env exports and --build-arg for Supabase (base64 avoids shell escaping)."""
    exports = []
    args = []
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    if url:
        b64 = base64.b64encode(url.encode()).decode()
        exports.append(f"NEXT_PUBLIC_SUPABASE_URL=$(echo {b64} | base64 -d)")
        args.append("--build-arg NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL")
    if key:
        b64 = base64.b64encode(key.encode()).decode()
        exports.append(f"NEXT_PUBLIC_SUPABASE_ANON_KEY=$(echo {b64} | base64 -d)")
        args.append("--build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not exports:
        return ""
    return "export " + " ".join(exports) + " && " + " ".join(args) + " "


VM_HOST = os.environ.get("PRODUCTION_VM_HOST", "192.168.0.186")
VM_USER = os.environ.get("VM_SSH_USER", "mycosoft")
VM_PASS = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
WEBSITE_DIR = "/opt/mycosoft/website"

if not VM_PASS:
    print("ERROR: VM_PASSWORD not found.")
    print("Create .credentials.local with: VM_SSH_PASSWORD=your-password")
    sys.exit(1)


def main():
    def _connect_ssh():
        print(f"Connecting to Production VM {VM_HOST}...")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
        transport = client.get_transport()
        if transport:
            transport.set_keepalive(30)
        return client

    ssh = _connect_ssh()

    def _run(cmd: str, timeout: int = 60):
        nonlocal ssh
        try:
            stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        except paramiko.SSHException:
            try:
                ssh.close()
            except Exception:
                pass
            ssh = _connect_ssh()
            stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        exit_code = stdout.channel.recv_exit_status()
        out = stdout.read().decode(errors="replace").strip()
        err = stderr.read().decode(errors="replace").strip()
        return exit_code, out, err

    def _tail_build(cmd: str, timeout: int = 600):
        wrapped = f"bash -lc \"set -o pipefail; {cmd} 2>&1 | tail -25\""
        code, out, _ = _run(wrapped, timeout=timeout)
        return code, out

    print("\n1. Syncing repo to origin/main...")
    code, out, err = _run(f"cd {WEBSITE_DIR} && git fetch origin && git reset --hard origin/main", timeout=120)
    if code != 0:
        raise RuntimeError(f"Failed to sync repo (exit {code}): {err or out}")
    if out:
        print(f"   {out.split(chr(10))[-1]}")

    print("\n2. Rebuilding Docker image (--no-cache)...")
    image_tag = "mycosoft-always-on-mycosoft-website:latest"
    build_args = _build_supabase_args()
    build_cmd_legacy = f"cd {WEBSITE_DIR} && {build_args}DOCKER_BUILDKIT=0 docker build --network host --no-cache -t {image_tag} ."
    build_cmd_buildkit = f"cd {WEBSITE_DIR} && {build_args}DOCKER_BUILDKIT=1 docker build --network host --no-cache -t {image_tag} ."

    print("   Attempt 1/2: DOCKER_BUILDKIT=0")
    code, out = _tail_build(build_cmd_legacy, timeout=900)
    print(f"   Last 25 lines:\n{out}")

    if code != 0:
        print("   Legacy build failed. Attempt 2/2: BuildKit")
        for attempt in (1, 2):
            code, out = _tail_build(build_cmd_buildkit, timeout=900)
            print(f"   BuildKit attempt {attempt}/2 exit {code}\n   Last 25 lines:\n{out}")
            if code == 0:
                break
            time.sleep(5 * attempt)
        if code != 0:
            print("\n❌ Docker build failed. Container unchanged.")
            raise RuntimeError(f"Docker build failed (exit {code}).")

    print("   Docker image build succeeded.")

    print("\n3. Stopping current container...")
    _run("docker stop mycosoft-website >/dev/null 2>&1 || true", timeout=60)
    _run("docker rm mycosoft-website >/dev/null 2>&1 || true", timeout=60)

    print("\n4. Starting new container (Production: mycosoft.com)...")
    # No MycoBrain env - Production does not host MycoBrain
    start_cmd = f"""docker run -d --name mycosoft-website -p 3000:3000 \
        -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
        -e NEXT_PUBLIC_BASE_URL=https://mycosoft.com \
        -e NEXTAUTH_URL=https://mycosoft.com \
        -e MAS_API_URL=http://192.168.0.188:8001 \
        -e MINDEX_API_URL=http://192.168.0.189:8000 \
        -e OLLAMA_BASE_URL=http://192.168.0.188:11434 \
        -e N8N_URL=http://192.168.0.188:5678 \
        --restart unless-stopped {image_tag}"""
    code, out, err = _run(start_cmd, timeout=60)
    if out:
        print(f"   Container ID: {out[:12]}")
    if err:
        print(f"   Error: {err}")

    print("\n5. Waiting for container...")
    time.sleep(10)

    stdin, stdout, _ = ssh.exec_command(
        "docker ps --filter name=mycosoft-website --format '{{.Status}}'", timeout=30
    )
    status = stdout.read().decode().strip()
    print(f"   Status: {status}")

    print("\n6. Testing site health...")
    stdin, stdout, _ = ssh.exec_command(
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000", timeout=30
    )
    http_code = stdout.read().decode().strip()
    print(f"   HTTP status: {http_code}")

    ssh.close()

    if http_code == "200":
        print("\n✅ Production deployment successful! Site is live at mycosoft.com")
        purge_everything()
    else:
        print(f"\n⚠️  Site returned {http_code} - may need attention")

    print("\nNote: Cloudflare purge for mycosoft.com zone runs when CLOUDFLARE_ZONE_ID_PRODUCTION (or CLOUDFLARE_ZONE_ID) is set.")


if __name__ == "__main__":
    main()
