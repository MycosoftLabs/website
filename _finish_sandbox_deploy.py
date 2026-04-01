#!/usr/bin/env python3
"""If VM build already succeeded (e.g. previous deploy timed out during poll), run container restart + purge only."""

import os
import sys
from pathlib import Path

# Same credential and env loading as _rebuild_sandbox
def load_credentials():
    for fname in (".credentials.local", ".env.local"):
        creds_file = Path(__file__).parent / fname
        if creds_file.exists():
            for line in creds_file.read_text().splitlines():
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip().strip('"\'')
load_credentials()

import paramiko

VM_HOST = os.environ.get("SANDBOX_VM_HOST", "192.168.0.187")
VM_USER = os.environ.get("SANDBOX_VM_USER", os.environ.get("VM_SSH_USER", "mycosoft"))
VM_PASS = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
WEBSITE_DIR = "/opt/mycosoft/website"
IMAGE_TAG = "mycosoft-always-on-mycosoft-website:latest"

if not VM_PASS:
    print("ERROR: VM_PASSWORD not found. Set .credentials.local or VM_PASSWORD.")
    sys.exit(1)


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=60)

    def run(cmd, timeout=90):
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        code = stdout.channel.recv_exit_status()
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        return code, out, err

    # 1) Check build exit
    code, out, _ = run("test -f /tmp/rebuild_build.exit && cat /tmp/rebuild_build.exit", timeout=10)
    if code != 0 or not (out or "").strip().isdigit():
        _, log, _ = run("tail -80 /tmp/rebuild_build.log 2>/dev/null || echo '(no log)'", timeout=10)
        print("Build exit file missing or invalid. Last 80 lines of build log:")
        print(log)
        print("\nRun full deploy: python _rebuild_sandbox.py (allow 90+ min for build)")
        return 1
    build_exit = int((out or "").strip())
    if build_exit != 0:
        _, log, _ = run("tail -80 /tmp/rebuild_build.log 2>/dev/null", timeout=10)
        print(f"Build failed (exit {build_exit}). Last 80 lines:")
        print(log)
        return 1

    print("VM build succeeded. Running container restart + purge...")

    # 2) Stop and remove current container
    run("docker stop mycosoft-website >/dev/null 2>&1 || true", timeout=60)
    run("docker rm mycosoft-website >/dev/null 2>&1 || true", timeout=60)

    # 3) Optional env sync
    sync_script = Path(__file__).resolve().parent / "_sandbox_env_sync.py"
    if sync_script.exists():
        import subprocess
        subprocess.call([sys.executable, str(sync_script), "--no-restart"], cwd=str(sync_script.parent), timeout=60)

    # 4) Build start_cmd (same as _rebuild_sandbox)
    base_url = "https://sandbox.mycosoft.com"
    mycobrain_url = "http://host.docker.internal:8003"
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    supabase_env = ""
    if supabase_url:
        supabase_env += f' -e NEXT_PUBLIC_SUPABASE_URL="{supabase_url}"'
    if supabase_key:
        supabase_env += f' -e NEXT_PUBLIC_SUPABASE_ANON_KEY="{supabase_key}"'
    ec, _, _ = run(f"test -f {WEBSITE_DIR}/.env && echo ok", timeout=5)
    env_file_opt = f" --env-file {WEBSITE_DIR}/.env" if (ec == 0) else ""
    start_cmd = f"""docker run -d --name mycosoft-website -p 3000:3000 \
        --add-host=host.docker.internal:host-gateway \
        -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
        {env_file_opt} \
        -e NEXT_PUBLIC_BASE_URL={base_url} \
        -e NEXTAUTH_URL={base_url} \
        -e NEXT_PUBLIC_SITE_URL={base_url} \
        -e MAS_API_URL=http://${MAS_VM_HOST:-localhost}:8001 \
        -e MINDEX_API_URL=http://${MINDEX_VM_HOST:-localhost}:8000 \
        -e OLLAMA_BASE_URL=http://${MAS_VM_HOST:-localhost}:11434 \
        -e N8N_URL=http://${MAS_VM_HOST:-localhost}:5678 \
        -e MYCOBRAIN_SERVICE_URL={mycobrain_url} \
        -e MYCOBRAIN_API_URL={mycobrain_url}{supabase_env} \
        --restart unless-stopped {IMAGE_TAG}"""
    code, out, err = run(start_cmd, timeout=60)
    if code != 0:
        print("Container start failed:", err or out)
        return 1
    print("Container started:", (out or "")[:12])

    # 5) Wait and test
    import time
    time.sleep(10)
    _, status, _ = run("docker ps --filter name=mycosoft-website --format '{{.Status}}'", timeout=30)
    print("Status:", status)
    _, http_code, _ = run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000", timeout=30)
    print("HTTP:", http_code)
    if http_code != "200":
        print("Site not 200; check container logs.")
    # MycoBrain ensure (same as rebuild)
    ensure_script = Path(__file__).resolve().parent / "_ensure_mycobrain_sandbox.py"
    if ensure_script.exists():
        import subprocess
        subprocess.call([sys.executable, str(ensure_script)], cwd=str(ensure_script.parent), timeout=90)
    ssh.close()

    # 6) Purge Cloudflare
    sys.path.insert(0, str(Path(__file__).parent))
    from _cloudflare_cache import purge_everything
    purge_everything()
    print("Cloudflare purge done.")
    print("Sandbox should be live at https://sandbox.mycosoft.com")
    return 0


if __name__ == "__main__":
    sys.exit(main())
