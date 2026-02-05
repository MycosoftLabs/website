#!/usr/bin/env python3
"""Deploy to sandbox VM - Feb 5, 2026"""

import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

VM_HOST = "192.168.0.187"
VM_USER = "mycosoft"
VM_PASS = "Mushroom1!Mushroom1!"
WEBSITE_DIR = "/opt/mycosoft/website"

def main():
    print(f"Connecting to {VM_HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    
    # Check current status
    print("\n1. Checking current container status...")
    stdin, stdout, stderr = ssh.exec_command("docker ps --filter name=mycosoft-website --format '{{.Names}}: {{.Status}}'", timeout=30)
    status = stdout.read().decode().strip()
    print(f"   Current: {status or 'Not running'}")
    
    # Restart container with new code
    print("\n2. Restarting container to pick up new code...")
    stdin, stdout, stderr = ssh.exec_command(
        f"cd {WEBSITE_DIR} && docker compose -p mycosoft-production restart mycosoft-website",
        timeout=120
    )
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(f"   Output: {out}")
    if err:
        print(f"   Stderr: {err}")
    
    # Check new status
    print("\n3. Checking container status after restart...")
    time.sleep(5)  # Wait for container to start
    stdin, stdout, stderr = ssh.exec_command("docker ps --filter name=mycosoft-website --format '{{.Names}}: {{.Status}}'", timeout=30)
    new_status = stdout.read().decode().strip()
    print(f"   New status: {new_status or 'Not running'}")
    
    # Test the site
    print("\n4. Testing site health...")
    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'Failed'", timeout=30)
    http_code = stdout.read().decode().strip()
    print(f"   HTTP status: {http_code}")
    
    ssh.close()
    
    if http_code == "200":
        print("\n✅ Deployment successful! Site is live at sandbox.mycosoft.com")
    else:
        print(f"\n⚠️  Site returned {http_code} - may need attention")
    
    print("\nNote: Remember to clear Cloudflare cache for changes to appear.")

if __name__ == "__main__":
    main()
