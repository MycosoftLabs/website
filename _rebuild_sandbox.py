#!/usr/bin/env python3
"""Rebuild and restart website on sandbox VM - Feb 10, 2026

Use --production to deploy with mycosoft.com URLs (sandbox-as-production on VM 187).
Without --production, uses sandbox.mycosoft.com.
"""

import argparse
import base64
import io
import os
import paramiko
import sys
import time
from pathlib import Path
from _cloudflare_cache import purge_everything

# Ensure output flushes promptly during long SSH/build steps
sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)

# Load credentials from .credentials.local file (gitignored)
def load_credentials():
    """Load from .credentials.local and .env.local - NEVER ASK USER FOR PASSWORD"""
    for fname in (".credentials.local", ".env.local"):
        creds_file = Path(__file__).parent / fname
        if creds_file.exists():
            for line in creds_file.read_text().splitlines():
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip().strip('"\'')
    return True

# Try to load from file first
load_credentials()


def _build_supabase_args():
    """Build env exports and --build-arg for Supabase (base64 avoids shell escaping).
    Returns (exports_cmd, docker_build_args) where exports_cmd is run before docker build,
    and docker_build_args are passed to docker build.
    """
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
        return "", ""
    exports_cmd = "export " + " ".join(exports) + " && "
    docker_args = " ".join(args) + " "
    return exports_cmd, docker_args


# Load credentials from environment variables
VM_HOST = os.environ.get("SANDBOX_VM_HOST", "192.168.0.187")
VM_USER = os.environ.get("SANDBOX_VM_USER", os.environ.get("VM_SSH_USER", "mycosoft"))
VM_PASS = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
WEBSITE_DIR = "/opt/mycosoft/website"

if not VM_PASS:
    print("ERROR: VM_PASSWORD not found.")
    print("Create .credentials.local with: VM_SSH_PASSWORD=your-password")
    print("Or set env var: $env:VM_PASSWORD = 'your-password'")
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Rebuild and deploy website to Sandbox VM (187)")
    parser.add_argument("--production", action="store_true", help="Deploy with mycosoft.com URLs (production)")
    args = parser.parse_args()

    base_url = "https://mycosoft.com" if args.production else "https://sandbox.mycosoft.com"
    site_label = "mycosoft.com" if args.production else "sandbox.mycosoft.com"
    def _connect_ssh() -> paramiko.SSHClient:
        print(f"Connecting to {VM_HOST}...")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
        transport = client.get_transport()
        if transport:
            transport.set_keepalive(30)
        return client

    ssh = _connect_ssh()

    def _run(cmd: str, timeout: int = 60) -> tuple[int, str, str]:
        """Run a remote command and return (exit_code, stdout, stderr)."""
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

    def _tail_build(cmd: str, timeout: int = 600) -> tuple[int, str]:
        """
        Run a build-like command, keep output small, and preserve exit code.
        We use bash + pipefail so errors propagate through the tail pipe.
        """
        wrapped = f"bash -lc \"set -o pipefail; {cmd} 2>&1 | tail -25\""
        code, out, _ = _run(wrapped, timeout=timeout)
        return code, out
    
    # Pull latest code so build uses current main
    print("\n1. Syncing repo to origin/main...")
    code, out, err = _run(f"cd {WEBSITE_DIR} && git fetch origin && git reset --hard origin/main", timeout=120)
    if code != 0:
        raise RuntimeError(f"Failed to sync repo (exit {code}): {err or out}")
    if out:
        print(f"   {out.split(chr(10))[-1]}")
    
    # Fix Dockerfile encoding: strip BOM and convert UTF-16 to UTF-8 (VM git/encoding can cause "unknown instruction" errors)
    print("\n2. Fixing Dockerfile encoding (BOM + UTF-16 -> UTF-8)...")
    fix_script = b"""import pathlib
p = pathlib.Path('Dockerfile')
b = p.read_bytes()
# Strip BOM
for bom, n in [(bytes.fromhex('efbbbf'), 3), (bytes.fromhex('fffe'), 2), (bytes.fromhex('feff'), 2)]:
    if b.startswith(bom):
        b = b[n:]
        break
# Detect UTF-16: null bytes (UTF-16 LE ASCII) or wrong char pattern mean it's UTF-16
try:
    text = b.decode('utf-8')
    sane = not (chr(0) in text) and text.lstrip().startswith('#') and 'FROM' in text
except Exception:
    sane = False
if not sane:
    try:
        text = b.decode('utf-16')
        p.write_text(text, encoding='utf-8')
        print('Converted UTF-16 to UTF-8')
    except Exception:
        print('Could not convert encoding')
else:
    p.write_bytes(b)
    print('Encoding OK')
"""
    fix_b64 = base64.b64encode(fix_script).decode()
    fix_cmd = f"cd {WEBSITE_DIR} && echo {fix_b64} | base64 -d | python3"
    code, out, err = _run(fix_cmd, timeout=10)
    print(f"   {out or err or 'ok'}")

    print("\n3. Rebuilding Docker image (--no-cache, may take a few minutes)...")
    image_tag = "mycosoft-always-on-mycosoft-website:latest"

    # Build strategy:
    # 1) Try classic builder first (DOCKER_BUILDKIT=0). If the base image is already cached, this
    #    avoids Docker Hub metadata calls that have been timing out.
    # 2) Fall back to BuildKit with retries in case classic builder still needs to pull.
    exports_cmd, docker_args = _build_supabase_args()
    site_url_arg = f"--build-arg NEXT_PUBLIC_SITE_URL={base_url} "
    build_cmd_legacy = f"cd {WEBSITE_DIR} && {exports_cmd}DOCKER_BUILDKIT=0 docker build {docker_args}{site_url_arg}--network host --no-cache -t {image_tag} ."
    build_cmd_buildkit = f"cd {WEBSITE_DIR} && {exports_cmd}DOCKER_BUILDKIT=1 docker build {docker_args}{site_url_arg}--network host --no-cache -t {image_tag} ."

    print("   Attempt 1/2: DOCKER_BUILDKIT=0 (legacy builder)")
    code, out = _tail_build(build_cmd_legacy, timeout=900)
    print(f"   Last 25 lines:\n{out}")

    if code != 0:
        print(f"   Legacy build failed (exit {code}). Attempt 2/2: BuildKit (retry 2x)")
        for attempt in (1, 2):
            code, out = _tail_build(build_cmd_buildkit, timeout=900)
            print(f"   BuildKit attempt {attempt}/2 exit {code}\n   Last 25 lines:\n{out}")
            if code == 0:
                break
            time.sleep(5 * attempt)

        if code != 0:
            # Do NOT stop/remove the running container if we failed to produce a new image.
            print("\n❌ Docker image build failed. Leaving the currently running container untouched.")
            print("   Most common cause: sandbox VM cannot reach Docker Hub (TLS handshake timeout).")
            raise RuntimeError(f"Docker build failed (exit {code}).")

    print("   Docker image build succeeded.")

    # Stop/remove only AFTER successful build so we never 'deploy' an old image.
    print("\n4. Stopping current container (post-build)...")
    _run("docker stop mycosoft-website >/dev/null 2>&1 || true", timeout=60)
    _run("docker rm mycosoft-website >/dev/null 2>&1 || true", timeout=60)
    print("   Old container removed.")
    
    # Start new container with NAS mount, MAS URL, MycoBrain gateway URL, and Supabase.
    # host.docker.internal lets container reach MycoBrain on host (port 8003).
    print(f"\n5. Starting new container with NAS mount ({site_label})...")
    mycobrain_url = "http://host.docker.internal:8003"
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    supabase_env = ""
    if supabase_url:
        supabase_env += f' -e NEXT_PUBLIC_SUPABASE_URL="{supabase_url}"'
    if supabase_key:
        supabase_env += f' -e NEXT_PUBLIC_SUPABASE_ANON_KEY="{supabase_key}"'
    start_cmd = f"""docker run -d --name mycosoft-website -p 3000:3000 \
        --add-host=host.docker.internal:host-gateway \
        -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
        -e NEXT_PUBLIC_BASE_URL={base_url} \
        -e NEXTAUTH_URL={base_url} \
        -e NEXT_PUBLIC_SITE_URL={base_url} \
        -e MAS_API_URL=http://192.168.0.188:8001 \
        -e MINDEX_API_URL=http://192.168.0.189:8000 \
        -e OLLAMA_BASE_URL=http://192.168.0.188:11434 \
        -e N8N_URL=http://192.168.0.188:5678 \
        -e MYCOBRAIN_SERVICE_URL={mycobrain_url} \
        -e MYCOBRAIN_API_URL={mycobrain_url}{supabase_env} \
        --restart unless-stopped {image_tag}"""
    code, out, err = _run(start_cmd, timeout=60)
    if out:
        print(f"   Container ID: {out[:12]}")
    if err:
        print(f"   Error: {err}")
    
    # Wait for container to be healthy
    print("\n6. Waiting for container to become healthy...")
    time.sleep(10)
    
    # Check status
    stdin, stdout, stderr = ssh.exec_command("docker ps --filter name=mycosoft-website --format '{{.Status}}'", timeout=30)
    status = stdout.read().decode().strip()
    print(f"   Status: {status}")
    
    # Test the site
    print("\n7. Testing site health...")
    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000", timeout=30)
    http_code = stdout.read().decode().strip()
    print(f"   HTTP status: {http_code}")
    
    # 8. MycoBrain service: always-on (CRITICAL - never let it stay down)
    print("\n8. MycoBrain service (ensure always-on)...")
    ensure_script = Path(__file__).resolve().parent / "_ensure_mycobrain_sandbox.py"
    if ensure_script.exists():
        import subprocess
        code = subprocess.call(
            [sys.executable, str(ensure_script)],
            cwd=str(ensure_script.parent),
            timeout=90,
        )
        if code != 0:
            print("   MycoBrain ensure had issues; check output above.")
    else:
        print("   _ensure_mycobrain_sandbox.py not found; MycoBrain may need manual setup.")
    
    ssh.close()
    
    if http_code == "200":
        print(f"\n✅ Deployment successful! Site is live at {site_label}")
        purge_everything()
    else:
        print(f"\n⚠️  Site returned {http_code} - may need attention")
    
    print("\nNote: Cloudflare purge runs automatically when configured.")

if __name__ == "__main__":
    main()
