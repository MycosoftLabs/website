"""
Deploy Homepage Search Upgrade to Sandbox
Feb 5, 2026

Deploys the new HeroSearch component with:
- Glass morphism design
- Voice search integration
- AI-powered suggestions
"""

import paramiko
import time
from _cloudflare_cache import purge_everything

HOST = "192.168.0.187"
USER = "mycosoft"
PASS = "REDACTED_VM_SSH_PASSWORD"

def run_cmd(ssh, cmd, timeout=300, wait=True):
    """Run command and optionally return output"""
    print(f"  > {cmd[:80]}...")
    channel = ssh.get_transport().open_session()
    channel.settimeout(timeout)
    channel.exec_command(cmd)
    
    if not wait:
        time.sleep(1)  # Give command time to start
        return "", "", 0
    
    # Wait for command to complete
    while not channel.exit_status_ready():
        time.sleep(0.5)
    
    out = ""
    err = ""
    while channel.recv_ready():
        out += channel.recv(4096).decode()
    while channel.recv_stderr_ready():
        err += channel.recv_stderr(4096).decode()
    
    exit_code = channel.recv_exit_status()
    out = out.strip()
    err = err.strip()
    
    if out:
        print(f"    {out[:200]}")
    if err and exit_code != 0:
        print(f"    [stderr] {err[:200]}")
    
    channel.close()
    return out, err, exit_code

def main():
    print("=" * 60)
    print("Deploying Homepage Search Upgrade to Sandbox")
    print("=" * 60)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print("\n1. Connecting to sandbox VM...")
    ssh.connect(HOST, username=USER, password=PASS)
    print("   Connected!")
    
    print("\n2. Pulling latest code...")
    run_cmd(ssh, "cd /opt/mycosoft/website && git fetch origin && git reset --hard origin/main")
    
    print("\n3. Checking for running build processes...")
    out, _, _ = run_cmd(ssh, "ps aux | grep 'docker build' | grep -v grep | wc -l")
    if out.strip() != "0":
        print("   Build in progress, waiting...")
        for i in range(60):
            time.sleep(5)
            out, _, _ = run_cmd(ssh, "ps aux | grep 'docker build' | grep -v grep | wc -l")
            if out.strip() == "0":
                print("   Build completed!")
                break
            print(f"   Still building... ({i*5}s)")
    
    print("\n4. Starting Docker build (background)...")
    # Use shell to run in background - don't wait for output
    run_cmd(ssh, "cd /opt/mycosoft/website && docker build -t mycosoft-always-on-mycosoft-website:latest --no-cache . > /tmp/docker-build.log 2>&1 &", wait=False)
    print("   Build started in background")
    
    print("\n5. Waiting for build to complete...")
    time.sleep(5)  # Give it time to start
    for i in range(120):  # Wait up to 10 minutes
        out, _, _ = run_cmd(ssh, "ps aux | grep 'docker build' | grep -v grep | wc -l")
        if out.strip() == "0":
            print(f"\n   ✓ Build completed after ~{i*5}s!")
            break
        if i % 12 == 0:  # Every 60 seconds
            # Check last few lines of build log
            out, _, _ = run_cmd(ssh, "tail -3 /tmp/docker-build.log 2>/dev/null || echo 'building...'")
        time.sleep(5)
    else:
        print("   WARNING: Build may still be running, proceeding anyway...")
    
    print("\n6. Checking build result...")
    run_cmd(ssh, "tail -10 /tmp/docker-build.log 2>/dev/null || echo 'No log'")
    
    print("\n7. Stopping old container...")
    run_cmd(ssh, "docker stop mycosoft-website 2>/dev/null || true")
    
    print("\n8. Removing old container...")
    run_cmd(ssh, "docker rm mycosoft-website 2>/dev/null || true")
    
    print("\n9. Starting new container...")
    out, err, code = run_cmd(ssh, """docker run -d --name mycosoft-website -p 3000:3000 \
        -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
        --restart unless-stopped \
        mycosoft-always-on-mycosoft-website:latest""")
    
    if code == 0:
        container_id = out[:12] if out else "started"
        print(f"   Container started: {container_id}")
    else:
        print(f"   ERROR: {err}")
        return
    
    print("\n10. Waiting for container to be ready...")
    time.sleep(8)
    
    print("\n11. Testing pages...")
    pages = ["/", "/search?q=test", "/test-fluid-search"]
    all_ok = True
    for page in pages:
        out, _, code = run_cmd(ssh, f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000{page}")
        status = "✅" if out == "200" else "❌"
        if out != "200":
            all_ok = False
        print(f"    {status} {page}: HTTP {out}")
    
    ssh.close()
    
    print("\n" + "=" * 60)
    if all_ok:
        print("✅ Deployment successful!")
        purge_everything()
    else:
        print("⚠️  Deployment complete but some pages may not be ready yet")
    print("   URL: https://sandbox.mycosoft.com")
    print("   Note: Cloudflare purge runs automatically when configured.")
    print("=" * 60)

if __name__ == "__main__":
    main()
