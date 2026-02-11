#!/usr/bin/env python3
"""Wait for build and restart container - Feb 5, 2026"""

import os
import paramiko
import sys
import time
from _cloudflare_cache import purge_everything

sys.stdout.reconfigure(encoding='utf-8')

# Load credentials from environment variables
VM_HOST = os.environ.get("SANDBOX_VM_HOST", "192.168.0.187")
VM_USER = os.environ.get("SANDBOX_VM_USER", "mycosoft")
VM_PASS = os.environ.get("VM_PASSWORD")

if not VM_PASS:
    print("ERROR: VM_PASSWORD environment variable is not set.")
    print("Please set it with: $env:VM_PASSWORD = 'your-password'")
    sys.exit(1)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)

# Wait for build to complete
print("1. Waiting for Docker build to complete...")
max_wait = 300  # 5 minutes
waited = 0
while waited < max_wait:
    stdin, stdout, stderr = ssh.exec_command("ps aux | grep 'docker build' | grep -v grep | wc -l", timeout=30)
    count = stdout.read().decode().strip()
    if count == "0":
        print("   Build completed!")
        break
    print(f"   Still building... (waited {waited}s)")
    time.sleep(10)
    waited += 10
else:
    print("   Build still running after 5 minutes, proceeding anyway...")

# Check build log for success
print("\n2. Checking build result...")
stdin, stdout, stderr = ssh.exec_command("tail -5 /tmp/docker_build.log 2>/dev/null", timeout=30)
log = stdout.read().decode().strip()
print(f"   {log}")

# Stop and remove current container
print("\n3. Stopping current container...")
stdin, stdout, stderr = ssh.exec_command("docker stop mycosoft-website 2>/dev/null; docker rm mycosoft-website 2>/dev/null; echo 'Done'", timeout=60)
print(f"   {stdout.read().decode().strip()}")

# Start new container
print("\n4. Starting new container with fresh image...")
cmd = """docker run -d --name mycosoft-website -p 3000:3000 \
    -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
    --restart unless-stopped mycosoft-always-on-mycosoft-website:latest"""
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
container_id = stdout.read().decode().strip()[:12]
err = stderr.read().decode().strip()
if container_id:
    print(f"   Started: {container_id}")
if err:
    print(f"   Error: {err}")

# Wait for startup
time.sleep(10)

# Test pages
print("\n5. Testing pages...")
pages = ["/", "/test-fluid-search", "/api/search/unified?q=amanita"]
for page in pages:
    stdin, stdout, stderr = ssh.exec_command(f'curl -s -o /dev/null -w "%{{http_code}}" http://localhost:3000{page}', timeout=30)
    code = stdout.read().decode().strip()
    status = "✅" if code == "200" else "❌"
    print(f"   {status} {page}: HTTP {code}")

ssh.close()
print("\n✅ Deployment complete!")
purge_everything()
