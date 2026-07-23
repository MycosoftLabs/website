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
            for line in creds_file.read_text(encoding="utf-8", errors="replace").splitlines():
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key.strip(), value.strip().strip('"\''))
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
    parser.add_argument(
        "--branch",
        default=os.environ.get("REBUILD_GIT_REF", "main"),
        help="Git ref on origin to deploy (default: main or REBUILD_GIT_REF env)",
    )
    parser.add_argument(
        "--require-gcs-verified",
        action="store_true",
        help="Abort if branch looks like Psathyrella GCS and GCS_VERIFIED is not set",
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Skip Dockerfile fix and docker build; use existing image on VM (start container only)",
    )
    parser.add_argument(
        "--local-build",
        action="store_true",
        help="Build on Sandbox only when no verified GHCR image is available",
    )
    parser.add_argument(
        "--image",
        default=os.environ.get("REBUILD_IMAGE", "ghcr.io/mycosoftlabs/website:production-latest"),
        help="Verified registry image to pull and deploy (default: GHCR production-latest)",
    )
    parser.add_argument(
        "--diagnose",
        action="store_true",
        help="Report Sandbox build capacity and stalled-build evidence without deploying",
    )
    args = parser.parse_args()

    branch_slug = args.branch.replace("origin/", "").lower()
    if args.require_gcs_verified or "psathyrella" in branch_slug or branch_slug == "feat/psathyrella-gcs":
        gcs_ok = os.environ.get("GCS_VERIFIED", "").strip().lower() in ("1", "true", "yes", "verified")
        morgan_ok = os.environ.get("MORGAN_APPROVE_GCS_DEPLOY", "").strip().lower() in ("1", "true", "yes")
        if not gcs_ok and not morgan_ok:
            print(
                "ERROR: Psathyrella GCS deploy blocked. Set GCS_VERIFIED=1 after Claude 3010 smoke, "
                "or MORGAN_APPROVE_GCS_DEPLOY=1. Use scripts/group_release_deploy.py --phase core for Earth Sim/NLM only."
            )
            sys.exit(2)

    base_url = "https://mycosoft.com" if args.production else "https://sandbox.mycosoft.com"
    site_label = "mycosoft.com" if args.production else "sandbox.mycosoft.com"
    def _connect_ssh() -> paramiko.SSHClient:
        print(f"Connecting to {VM_HOST}...")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            VM_HOST,
            username=VM_USER,
            password=VM_PASS,
            look_for_keys=False,
            allow_agent=False,
            timeout=60,
        )
        transport = client.get_transport()
        if transport:
            transport.set_keepalive(30)
        return client

    ssh = _connect_ssh()
    # This is an absolute safety cap only. The no-progress watchdog below terminates a
    # hung build far sooner, with an actionable tail of its log.
    build_timeout_sec = int(os.environ.get("REBUILD_BUILD_TIMEOUT_SEC", "14400"))
    progress_timeout_sec = int(os.environ.get("REBUILD_PROGRESS_TIMEOUT_SEC", "1200"))
    min_disk_mb = int(os.environ.get("REBUILD_MIN_DISK_MB", "12288"))
    min_mem_mb = int(os.environ.get("REBUILD_MIN_MEM_MB", "4096"))

    def _run(cmd: str, timeout: int = 90) -> tuple[int, str, str]:
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

    def _start_background_build(cmd: str) -> str:
        """Start build in background on VM; return PID. Avoids holding SSH channel for 40+ min."""
        log = "/tmp/rebuild_build.log"
        exit_file = "/tmp/rebuild_build.exit"
        pid_file = "/tmp/rebuild_build.pid"
        script_file = "/tmp/rebuild_build.sh"
        # Clear previous run; script runs in subshell, writes log and exit code
        script_content = f"({cmd}) > {log} 2>&1; echo $? > {exit_file}"
        b64 = base64.b64encode(script_content.encode()).decode()
        _run(f"rm -f {log} {exit_file} {pid_file} {script_file}", timeout=5)
        # Write script via base64 (no quoting issues). Start build in subshell so SSH channel
        # closes as soon as subshell exits; PID written to file so we don't depend on stdout.
        run_cmd = (
            f"echo {b64} | base64 -d > {script_file} && chmod +x {script_file} && "
            f"( nohup setsid bash {script_file} >>{log} 2>&1 & echo $! > {pid_file} )"
        )
        code, out, err = _run(run_cmd, timeout=45)
        if code != 0:
            raise RuntimeError(f"Failed to start background build: {err or out}")
        code2, out2, _ = _run(f"cat {pid_file}", timeout=5)
        if code2 != 0 or not (out2 or "").strip().isdigit():
            raise RuntimeError(f"Could not read build PID from {pid_file}: {out2!r}")
        return (out2 or "").strip()

    def _poll_build_until_done(
        pid: str,
        poll_interval: int = 30,
        timeout_sec: int = 7200,
        no_progress_timeout_sec: int = 1200,
    ) -> tuple[int, str]:
        """Poll a build and terminate its process group when its log stops changing."""
        log = "/tmp/rebuild_build.log"
        exit_file = "/tmp/rebuild_build.exit"
        deadline = time.monotonic() + timeout_sec
        last_size = -1
        last_progress_at = time.monotonic()
        while time.monotonic() < deadline:
            code, out, _ = _run(f"test -f {exit_file} && cat {exit_file}", timeout=10)
            if code == 0 and out.strip().isdigit():
                build_code = int(out.strip())
                _, tail_out, _ = _run(f"tail -50 {log}", timeout=10)
                return build_code, (tail_out or "").strip()
            _, size_out, _ = _run(f"stat -c %s {log} 2>/dev/null || echo 0", timeout=10)
            try:
                current_size = int((size_out or "0").strip())
            except ValueError:
                current_size = 0
            if current_size != last_size:
                last_size = current_size
                last_progress_at = time.monotonic()
            elif time.monotonic() - last_progress_at >= no_progress_timeout_sec:
                _, tail_out, _ = _run(f"tail -100 {log}", timeout=10)
                _run(f"kill -- -{pid} 2>/dev/null || kill {pid} 2>/dev/null || true", timeout=10)
                raise RuntimeError(
                    f"Build made no log progress for {no_progress_timeout_sec}s; "
                    f"terminated process group {pid}. Last log lines:\n{(tail_out or '').strip()}"
                )
            # Progress: show last 5 lines
            _, progress, _ = _run(f"tail -5 {log} 2>/dev/null || true", timeout=10)
            if progress.strip():
                print(f"   ... {progress.strip().split(chr(10))[-1]}")
            time.sleep(poll_interval)
        _run(f"kill -- -{pid} 2>/dev/null || kill {pid} 2>/dev/null || true", timeout=10)
        raise RuntimeError(f"Build did not finish within {timeout_sec}s (PID {pid} killed)")

    def _build_preflight() -> None:
        """Fail before a VM build can exhaust disk, RAM, or compete with another build."""
        command = (
            "set -eu; "
            "timeout 15 docker version >/dev/null; "
            "free_mb=$(awk '/MemAvailable:/ {print int($2/1024)}' /proc/meminfo); "
            "disk_mb=$(df -Pm /var/lib/docker | awk 'NR==2 {print $4}'); "
            "if pgrep -af 'docker( |-)build|buildkitd|buildx.*build|next build' >/dev/null; then "
            "echo 'Another Docker/Next build is already running:' >&2; "
            "pgrep -af 'docker( |-)build|buildkitd|buildx.*build|next build' >&2; exit 21; fi; "
            f"if [ \"$disk_mb\" -lt {min_disk_mb} ]; then echo \"Insufficient Docker disk: ${'{'}disk_mb{'}'}MB < {min_disk_mb}MB\" >&2; exit 22; fi; "
            f"if [ \"$free_mb\" -lt {min_mem_mb} ]; then echo \"Insufficient available memory: ${'{'}free_mb{'}'}MB < {min_mem_mb}MB\" >&2; exit 23; fi; "
            "echo \"Preflight passed: disk=${disk_mb}MB available_mem=${free_mb}MB\""
        )
        code, out, err = _run(command, timeout=45)
        if code != 0:
            raise RuntimeError(f"Sandbox build preflight failed (exit {code}): {err or out}")
        print(f"   {out}")

    def _diagnose_build_host() -> None:
        command = (
            "echo '=== resources ==='; df -h / /var/lib/docker; df -ih / /var/lib/docker; "
            "free -h; swapon --show; echo '=== docker ==='; timeout 15 docker system df; "
            "echo '=== build processes ==='; pgrep -af 'docker( |-)build|buildkitd|buildx.*build|next build' || true; "
            "echo '=== OOM evidence ==='; (sudo dmesg -T 2>/dev/null || dmesg -T 2>/dev/null || true) | "
            "grep -Ei 'out of memory|oom-kill|killed process' | tail -30 || true; "
            "echo '=== last build log ==='; tail -100 /tmp/rebuild_build.log 2>/dev/null || true"
        )
        code, out, err = _run(command, timeout=90)
        print(out)
        if err:
            print(err)
        if code != 0:
            raise RuntimeError(f"Sandbox diagnostics failed (exit {code})")
    
    # Pull latest code so build uses requested branch/ref
    git_ref = args.branch if args.branch.startswith("origin/") else f"origin/{args.branch}"
    print(f"\n1. Syncing repo to {git_ref}...")
    code, out, err = _run(f"cd {WEBSITE_DIR} && git fetch origin && git reset --hard {git_ref}", timeout=180)
    if code != 0:
        raise RuntimeError(f"Failed to sync repo (exit {code}): {err or out}")
    if out:
        print(f"   {out.split(chr(10))[-1]}")

    if args.diagnose:
        _diagnose_build_host()
        ssh.close()
        return

    image_tag = "mycosoft-always-on-mycosoft-website:latest"

    if args.skip_build:
        print("\n2–3. Skipping Dockerfile fix and image build (--skip-build).")
        print("   Tagging current :latest as :previous for rollback...")
        _run(
            f"docker image inspect {image_tag} >/dev/null 2>&1 && docker tag {image_tag} mycosoft-always-on-mycosoft-website:previous || true",
            timeout=30,
        )
    elif not args.local_build:
        print(f"\n2–3. Pulling pre-built GHCR image instead of building on Sandbox: {args.image}")
        _build_preflight()
        code, out, err = _run(f"timeout 900 docker pull {args.image}", timeout=930)
        if code != 0:
            raise RuntimeError(
                f"Could not pull verified GHCR image {args.image} (exit {code}): {err or out}. "
                "Refusing to fall back to a local build; rerun with --local-build only after resolving registry availability."
            )
        _run(
            f"docker image inspect {image_tag} >/dev/null 2>&1 && docker tag {image_tag} "
            "mycosoft-always-on-mycosoft-website:previous || true",
            timeout=30,
        )
        code, out, err = _run(f"docker tag {args.image} {image_tag}", timeout=30)
        if code != 0:
            raise RuntimeError(f"Could not tag GHCR image for blue/green deploy: {err or out}")
        print("   GHCR image pulled and tagged for blue/green cutover.")
    else:
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
        code, out, err = _run(fix_cmd, timeout=30)
        print(f"   {out or err or 'ok'}")

        print("\n3. Rebuilding Docker image (--no-cache, may take a few minutes)...")
        print(
            f"   Preflight thresholds: {min_disk_mb}MB Docker disk, {min_mem_mb}MB available memory; "
            f"no-progress watchdog: {progress_timeout_sec}s."
        )
        _build_preflight()

        # Kill any stale build processes so only one build runs (prevents resource contention from multiple deploys)
        print("   Stopping any existing docker build processes on VM...")
        _run("pkill -f 'docker build.*mycosoft-always-on-mycosoft-website' 2>/dev/null || true", timeout=15)
        _run("pkill -f '/tmp/rebuild_build.sh' 2>/dev/null || true", timeout=10)
        _run("rm -f /tmp/rebuild_build.log /tmp/rebuild_build.exit /tmp/rebuild_build.pid /tmp/rebuild_build.sh", timeout=5)
        time.sleep(3)

        # Build strategy:
        # 1) Try classic builder first (DOCKER_BUILDKIT=0). If the base image is already cached, this
        #    avoids Docker Hub metadata calls that have been timing out.
        # 2) Fall back to BuildKit with retries in case classic builder still needs to pull.
        exports_cmd, docker_args = _build_supabase_args()
        public_site_args = (
            f"--build-arg NEXT_PUBLIC_SITE_URL={base_url} "
            f"--build-arg NEXT_PUBLIC_BASE_URL={base_url} "
        )
        build_cmd_legacy = f"cd {WEBSITE_DIR} && {exports_cmd}DOCKER_BUILDKIT=0 docker build {docker_args}{public_site_args}--network host --no-cache -t {image_tag} ."
        build_cmd_buildkit = f"cd {WEBSITE_DIR} && {exports_cmd}DOCKER_BUILDKIT=1 docker build {docker_args}{public_site_args}--network host --no-cache -t {image_tag} ."

        # Preserve last known-good image for rollback (Cloudflare 502 if new container dies on :3000)
        print("   Tagging current :latest as :previous (rollback target)...")
        _run(
            f"docker image inspect {image_tag} >/dev/null 2>&1 && docker tag {image_tag} mycosoft-always-on-mycosoft-website:previous || true",
            timeout=30,
        )

        print(
            f"   Build absolute timeout: {build_timeout_sec}s ({build_timeout_sec // 3600}h); "
            f"no-progress timeout: {progress_timeout_sec}s."
        )
        print("   Attempt 1/2: DOCKER_BUILDKIT=0 (legacy builder)")
        pid = _start_background_build(build_cmd_legacy)
        code, out = _poll_build_until_done(
            pid,
            poll_interval=30,
            timeout_sec=build_timeout_sec,
            no_progress_timeout_sec=progress_timeout_sec,
        )
        print(f"   Last 50 lines:\n{out}")

        if code != 0:
            print(f"   Legacy build failed (exit {code}). Attempt 2/2: BuildKit (retry 2x)")
            for attempt in (1, 2):
                pid = _start_background_build(build_cmd_buildkit)
                code, out = _poll_build_until_done(
                    pid,
                    poll_interval=30,
                    timeout_sec=build_timeout_sec,
                    no_progress_timeout_sec=progress_timeout_sec,
                )
                print(f"   BuildKit attempt {attempt}/2 exit {code}\n   Last 50 lines:\n{out}")
                if code == 0:
                    break
                time.sleep(5 * attempt)

            if code != 0:
                # Do NOT stop/remove the running container if we failed to produce a new image.
                print("\n❌ Docker image build failed. Leaving the currently running container untouched.")
                print("   Most common cause: sandbox VM cannot reach Docker Hub (TLS handshake timeout).")
                raise RuntimeError(f"Docker build failed (exit {code}).")

        print("   Docker image build succeeded.")

    # Sync env before any container changes (keeps public :3000 serving until candidate is proven).
    print("\n4. Syncing env keys to VM (.env.local -> /opt/mycosoft/website/.env)...")
    sync_script = Path(__file__).resolve().parent / "_sandbox_env_sync.py"
    if sync_script.exists():
        import subprocess
        code_sync = subprocess.call(
            [sys.executable, str(sync_script), "--no-restart"],
            cwd=str(sync_script.parent),
            timeout=60,
        )
        if code_sync != 0:
            print("   Warning: env sync had non-zero exit; container may lack Stripe/other keys.")
    else:
        print("   _sandbox_env_sync.py not found; run it once to push keys to VM.")

    env_file = f"{WEBSITE_DIR}/.env"
    ec, _, _ = _run(f"test -f {env_file} && echo ok", timeout=5)
    if ec != 0:
        print("   Warning: VM .env missing — blue-green deploy may fail auth/env checks.")

    def _wait_http(url: str, attempts: int = 60, delay_sec: int = 3) -> str:
        """Poll curl on VM until HTTP 200 or attempts exhausted."""
        last = "000"
        for i in range(attempts):
            code, out, _ = _run(
                f"curl -s -o /dev/null -w '%{{http_code}}' --connect-timeout 5 '{url}' 2>/dev/null || echo 000",
                timeout=25,
            )
            last = (out or "000").strip() or "000"
            if last == "200":
                return last
            if i % 5 == 0:
                print(f"   ... health {url} attempt {i + 1}/{attempts} (code {last})")
            time.sleep(delay_sec)
        return last

    def _ensure_blue_green_proxy() -> None:
        """Ensure mycosoft-website-proxy owns host :3000 — never bind app directly on :3000."""
        _, out, _ = _run(
            "docker ps --format '{{.Names}}' | grep -qx 'mycosoft-website-proxy' && echo yes || echo no",
            timeout=15,
        )
        if (out or "").strip() != "yes":
            print("   Proxy missing — running scripts/blue-green-bootstrap.sh ...")
            code, bout, berr = _run(
                f"cd {WEBSITE_DIR} && bash scripts/blue-green-bootstrap.sh",
                timeout=900,
            )
            if code != 0:
                raise RuntimeError(
                    f"blue-green-bootstrap failed (exit {code}): {berr or bout}\n"
                    "Refusing direct docker run on :3000 without nginx proxy."
                )
            print(f"   Bootstrap: {(bout or berr or 'ok')[-400:]}")

        proxy_code = _wait_http("http://127.0.0.1:3000/healthz", attempts=40, delay_sec=2)
        if proxy_code != "200":
            raise RuntimeError(
                f"mycosoft-website-proxy unhealthy on :3000/healthz (HTTP {proxy_code}). "
                "Fix proxy before deploy — do not docker run on host :3000."
            )
        print("   mycosoft-website-proxy healthy on :3000/healthz")

    def _blue_green_cutover(img: str, public_host: str) -> None:
        """Cut over via blue-green-deploy.sh — never single-container docker run on :3000."""
        cutover = (
            f"cd {WEBSITE_DIR} && "
            f"IMAGE={img} PUBLIC_HOST={public_host} "
            f"bash scripts/blue-green-deploy.sh"
        )
        print(f"   Running: IMAGE={img} PUBLIC_HOST={public_host} blue-green-deploy.sh")
        code, out, err = _run(cutover, timeout=1800)
        tail = (out or err or "")[-2000:]
        if tail:
            print(f"   {tail}")
        if code != 0:
            raise RuntimeError(
                f"blue-green-deploy failed (exit {code}). "
                "Do not fall back to docker run on :3000 — fix compose/proxy/network on VM 187."
            )

    def _verify_public_https(url: str, attempts: int = 36, delay_sec: int = 5) -> str:
        """Verify public URL returns HTTP 200 (from dev machine after VM cutover)."""
        import subprocess

        last = "000"
        curl_bin = "curl.exe" if sys.platform == "win32" else "curl"
        for i in range(attempts):
            try:
                proc = subprocess.run(
                    [curl_bin, "-sS", "-o", os.devnull, "-w", "%{http_code}", "--max-time", "20", url],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                last = (proc.stdout or "000").strip() or "000"
            except Exception:
                last = "000"
            if last == "200":
                return last
            if i % 3 == 0:
                print(f"   ... public {url} attempt {i + 1}/{attempts} (HTTP {last})")
            time.sleep(delay_sec)
        return last

    http_code = "000"

    print(
        f"\n5. Blue/green deploy ({site_label}): ensure proxy on :3000, cutover idle slot — "
        "NEVER docker run single container on host :3000..."
    )
    _ensure_blue_green_proxy()
    _blue_green_cutover(image_tag, site_label)

    print(f"\n6. Verifying public HTTPS {base_url} returns 200...")
    http_code = _verify_public_https(base_url, attempts=36, delay_sec=5)

    _, pub_status, _ = _run(
        "docker ps --filter name=mycosoft-website-proxy --format '{{.Names}} {{.Status}}' | head -1",
        timeout=30,
    )
    print(f"   Proxy: {pub_status or '(unknown)'}")

    if http_code != "200":
        ssh.close()
        raise RuntimeError(
            f"Deploy guardrail failed: {base_url} returned HTTP {http_code} (expected 200). "
            "Site may be down — run blue-green-bootstrap.sh on VM 187 and check docker network."
        )

    print("\n7. NAS media spot-check (critical MP4)...")
    _, spot_out, _ = _run(
        "curl -sI 'http://127.0.0.1:3000/assets/mushroom1/mushroom%201%20walking.mp4' 2>/dev/null | head -12",
        timeout=30,
    )
    print(spot_out[:800] if spot_out else "   (no curl output)")
    if spot_out and "Content-Length: 0" in spot_out:
        print("   WARNING: mushroom1 walking MP4 reports 0 bytes — check NAS files and bind mount.")
    elif spot_out and "200" not in spot_out[:200]:
        print("   WARNING: Critical MP4 did not return OK — verify container has -v /opt/mycosoft/media/website/assets:/app/public/assets:ro")

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
        print(f"\n⚠️  Site returned {http_code} — Cloudflare purge skipped.")

    print("\nNote: Cloudflare purge runs only after public HTTPS returns 200.")

if __name__ == "__main__":
    main()
