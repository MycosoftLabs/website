#!/usr/bin/env python3
"""Check build status and start container - Feb 5, 2026"""

import paramiko
import sys
import time
from _cloudflare_cache import purge_everything

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.0.187', username='mycosoft', password='REDACTED_VM_SSH_PASSWORD', timeout=30)

# Check if build is still running
print("1. Checking if Docker build is still running...")
stdin, stdout, stderr = ssh.exec_command("ps aux | grep 'docker build' | grep -v grep", timeout=30)
out = stdout.read().decode().strip()
if out:
    print(f"   Build still running: {out[:80]}...")
else:
    print("   Build not running")

# Check if image exists
print("\n2. Checking if image was built...")
stdin, stdout, stderr = ssh.exec_command("docker images | grep mycosoft-always-on", timeout=30)
out = stdout.read().decode().strip()
print(f"   Images:\n{out if out else '   No mycosoft-always-on images found'}")

# Check Docker build log
print("\n3. Last 10 lines of build log...")
stdin, stdout, stderr = ssh.exec_command("tail -10 /tmp/docker_build.log 2>/dev/null || echo 'No log file'", timeout=30)
out = stdout.read().decode().strip()
print(f"   {out}")

# Check container status
print("\n4. Container status...")
stdin, stdout, stderr = ssh.exec_command("docker ps -a --filter name=mycosoft-website --format '{{.Names}}: {{.Status}}'", timeout=30)
out = stdout.read().decode().strip()
print(f"   {out if out else 'Container not found'}")

# If container doesn't exist but image does, start it
print("\n5. Starting container if needed...")
stdin, stdout, stderr = ssh.exec_command("""
if ! docker ps --format '{{.Names}}' | grep -q mycosoft-website; then
    echo 'Starting container...'
    docker run -d --name mycosoft-website -p 3000:3000 \
        -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
        --restart unless-stopped mycosoft-always-on-mycosoft-website:latest 2>&1
else
    echo 'Container already running'
fi
""", timeout=60)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
print(f"   {out}")
if err:
    print(f"   Error: {err}")

# Wait and check
time.sleep(5)

# Test site
print("\n6. Testing site...")
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'Failed'", timeout=30)
http_code = stdout.read().decode().strip()
print(f"   HTTP status: {http_code}")

ssh.close()

if http_code == "200":
    print("\n✅ Site is up at sandbox.mycosoft.com")
    purge_everything()
else:
    print(f"\n⚠️  Site returned {http_code}")
