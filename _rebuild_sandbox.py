#!/usr/bin/env python3
"""Rebuild and restart website on sandbox VM - Feb 5, 2026"""

import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

VM_HOST = "192.168.0.187"
VM_USER = "mycosoft"
VM_PASS = "REDACTED_VM_SSH_PASSWORD"
WEBSITE_DIR = "/opt/mycosoft/website"

def main():
    print(f"Connecting to {VM_HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    
    # Stop current container
    print("\n1. Stopping current container...")
    stdin, stdout, stderr = ssh.exec_command("docker stop mycosoft-website", timeout=60)
    out = stdout.read().decode().strip()
    print(f"   Stopped: {out}")
    
    # Remove old container
    print("\n2. Removing old container...")
    stdin, stdout, stderr = ssh.exec_command("docker rm mycosoft-website", timeout=30)
    out = stdout.read().decode().strip()
    print(f"   Removed: {out}")
    
    # Rebuild image
    print("\n3. Rebuilding Docker image (this may take a few minutes)...")
    print("   Running: docker build -t mycosoft-always-on-mycosoft-website:latest .")
    stdin, stdout, stderr = ssh.exec_command(
        f"cd {WEBSITE_DIR} && docker build -t mycosoft-always-on-mycosoft-website:latest . 2>&1 | tail -20",
        timeout=600  # 10 minutes
    )
    out = stdout.read().decode()
    print(f"   Last 20 lines of build:\n{out}")
    
    # Start new container with NAS mount (as per user rules)
    print("\n4. Starting new container with NAS mount...")
    start_cmd = """docker run -d --name mycosoft-website -p 3000:3000 \
        -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
        --restart unless-stopped mycosoft-always-on-mycosoft-website:latest"""
    stdin, stdout, stderr = ssh.exec_command(start_cmd, timeout=60)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(f"   Container ID: {out[:12]}")
    if err:
        print(f"   Error: {err}")
    
    # Wait for container to be healthy
    print("\n5. Waiting for container to become healthy...")
    time.sleep(10)
    
    # Check status
    stdin, stdout, stderr = ssh.exec_command("docker ps --filter name=mycosoft-website --format '{{.Status}}'", timeout=30)
    status = stdout.read().decode().strip()
    print(f"   Status: {status}")
    
    # Test the site
    print("\n6. Testing site health...")
    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000", timeout=30)
    http_code = stdout.read().decode().strip()
    print(f"   HTTP status: {http_code}")
    
    ssh.close()
    
    if http_code == "200":
        print("\n✅ Deployment successful! Site is live at sandbox.mycosoft.com")
    else:
        print(f"\n⚠️  Site returned {http_code} - may need attention")
    
    print("\n⚡ Remember to PURGE EVERYTHING in Cloudflare cache!")

if __name__ == "__main__":
    main()
