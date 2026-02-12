#!/usr/bin/env python3
"""
Ultra-robust deployment with fresh SSH connections per step
Handles docker stop timeouts by using separate connections
"""
import os
import sys
import time
from pathlib import Path
import paramiko

# Load credentials
creds_file = Path(__file__).parent / ".credentials.local"
if creds_file.exists():
    for line in creds_file.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip()

VM_IP = "192.168.0.187"
VM_USER = "mycosoft"
VM_PASSWORD = os.environ.get("VM_SSH_PASSWORD")

def ssh_exec_simple(command, timeout=30):
    """Execute single command with fresh SSH connection"""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VM_IP, username=VM_USER, password=VM_PASSWORD, timeout=10)
        print(f"[EXEC] {command}")
        stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
        exit_code = stdout.channel.recv_exit_status()
        output = stdout.read().decode('utf-8').strip()
        error = stderr.read().decode('utf-8').strip()
        ssh.close()
        
        if output:
            print(f"[OUT] {output}")
        if error and exit_code != 0:
            print(f"[ERR] {error}")
        
        return exit_code, output, error
    except Exception as e:
        print(f"[FAIL] {e}")
        try:
            ssh.close()
        except:
            pass
        return -1, "", str(e)

def main():
    print("=" * 80)
    print("DEPLOYING WEBSITE TO SANDBOX VM")
    print("=" * 80)
    
    # Step 1: Pull latest code
    print("\n[STEP 1] Pull latest code")
    ssh_exec_simple("cd /opt/mycosoft/website && git fetch origin", timeout=30)
    exit_code, output, _ = ssh_exec_simple("cd /opt/mycosoft/website && git reset --hard origin/main", timeout=30)
    if exit_code != 0:
        print("[ERROR] Git pull failed")
        return 1
    print("[OK] Code updated to latest")
    
    # Step 2: Force kill container (don't wait for graceful stop)
    print("\n[STEP 2] Remove old container")
    print("Forcing immediate kill (no graceful stop)...")
    ssh_exec_simple("docker kill mycosoft-website 2>/dev/null || true", timeout=10)
    ssh_exec_simple("docker rm -f mycosoft-website 2>/dev/null || true", timeout=10)
    time.sleep(2)
    print("[OK] Old container removed")
    
    # Step 3: Build image (long timeout)
    print("\n[STEP 3] Build Docker image (this will take 5-10 minutes)")
    print("Building with --no-cache...")
    exit_code, output, error = ssh_exec_simple(
        "cd /opt/mycosoft/website && docker build --no-cache -t mycosoft-always-on-mycosoft-website:latest .",
        timeout=900  # 15 minutes
    )
    
    if exit_code != 0:
        print("[ERROR] Docker build failed")
        print(f"Error: {error}")
        return 1
    
    print("[OK] Image built successfully")
    
    # Step 4: Start container
    print("\n[STEP 4] Start new container")
    start_cmd = """docker run -d --name mycosoft-website -p 3000:3000 \
-v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
-e MAS_API_URL=http://192.168.0.188:8001 \
--restart unless-stopped \
mycosoft-always-on-mycosoft-website:latest"""
    
    exit_code, container_id, error = ssh_exec_simple(start_cmd, timeout=30)
    
    if exit_code != 0:
        print("[ERROR] Container start failed")
        return 1
    
    print(f"[OK] Container started: {container_id[:12]}")
    
    # Step 5: Verify
    print("\n[STEP 5] Verify deployment")
    time.sleep(5)
    
    exit_code, status, _ = ssh_exec_simple("docker ps --filter name=mycosoft-website --format '{{.Status}}'", timeout=10)
    if "Up" in status:
        print(f"[OK] Container running: {status}")
    else:
        print("[WARN] Container may not be healthy")
        ssh_exec_simple("docker logs mycosoft-website --tail 30", timeout=10)
        return 1
    
    # Test HTTP
    print("\n[STEP 6] Test HTTP endpoint")
    exit_code, output, _ = ssh_exec_simple("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000", timeout=10)
    if output == "200":
        print("[OK] Website responding with HTTP 200")
    else:
        print(f"[WARN] HTTP status: {output}")
    
    print("\n" + "=" * 80)
    print("DEPLOYMENT COMPLETE")
    print("=" * 80)
    print("\nNext steps:")
    print("1. Purge Cloudflare cache")
    print("2. Verify: https://sandbox.mycosoft.com/natureos/devices")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
