#!/usr/bin/env python3
"""
Robust Website Deployment to Sandbox VM
Handles docker stop timeouts and container issues gracefully
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

if not VM_PASSWORD:
    print("ERROR: VM_SSH_PASSWORD not found in .credentials.local")
    sys.exit(1)

def run_ssh_command(ssh, command, timeout=300):
    """Execute SSH command with timeout handling"""
    try:
        print(f"\n[EXEC] {command}")
        stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
        exit_code = stdout.channel.recv_exit_status()
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        
        if output:
            print(f"[OK] Output:\n{output}")
        if error:
            print(f"[WARN] Error output:\n{error}")
        
        return exit_code, output, error
    except Exception as e:
        print(f"[WARN] Command timeout or error: {e}")
        return -1, "", str(e)

def main():
    print("=" * 80)
    print("DEPLOYING WEBSITE TO SANDBOX VM (192.168.0.187)")
    print("=" * 80)
    
    # Connect via SSH
    print(f"\nConnecting to {VM_USER}@{VM_IP}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VM_IP, username=VM_USER, password=VM_PASSWORD, timeout=10)
        print("[OK] SSH connection established")
    except Exception as e:
        print(f"[ERROR] SSH connection failed: {e}")
        sys.exit(1)
    
    # Step 1: Navigate and pull latest code
    print("\n" + "=" * 80)
    print("STEP 1: Pull latest code from GitHub")
    print("=" * 80)
    
    run_ssh_command(ssh, "cd /opt/mycosoft/website && git fetch origin")
    run_ssh_command(ssh, "cd /opt/mycosoft/website && git reset --hard origin/main")
    
    # Step 2: Stop and remove old container (with graceful timeout handling)
    print("\n" + "=" * 80)
    print("STEP 2: Stop and remove old container")
    print("=" * 80)
    
    # Try graceful stop first (30 second timeout)
    print("Attempting graceful container stop (30s timeout)...")
    exit_code, _, _ = run_ssh_command(ssh, "docker stop -t 30 mycosoft-website", timeout=45)
    
    if exit_code != 0:
        print("[WARN] Graceful stop failed or timed out. Forcing kill...")
        run_ssh_command(ssh, "docker kill mycosoft-website", timeout=10)
    
    # Remove container (force if needed)
    print("Removing container...")
    run_ssh_command(ssh, "docker rm -f mycosoft-website", timeout=10)
    
    # Step 3: Build new image
    print("\n" + "=" * 80)
    print("STEP 3: Build Docker image (--no-cache)")
    print("=" * 80)
    
    exit_code, output, error = run_ssh_command(
        ssh,
        "cd /opt/mycosoft/website && docker build --no-cache -t mycosoft-always-on-mycosoft-website:latest .",
        timeout=600  # 10 minutes for build
    )
    
    if exit_code != 0:
        print("[ERROR] Docker build failed!")
        ssh.close()
        sys.exit(1)
    
    print("[OK] Docker image built successfully")
    
    # Step 4: Start new container with NAS mount and MAS_API_URL
    print("\n" + "=" * 80)
    print("STEP 4: Start new container")
    print("=" * 80)
    
    start_command = """docker run -d --name mycosoft-website -p 3000:3000 \
  -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
  -e MAS_API_URL=http://192.168.0.188:8001 \
  --restart unless-stopped \
  mycosoft-always-on-mycosoft-website:latest"""
    
    exit_code, output, error = run_ssh_command(ssh, start_command, timeout=30)
    
    if exit_code != 0:
        print("[ERROR] Container start failed!")
        ssh.close()
        sys.exit(1)
    
    container_id = output.strip()
    print(f"[OK] Container started: {container_id[:12]}")
    
    # Step 5: Verify container is running
    print("\n" + "=" * 80)
    print("STEP 5: Verify deployment")
    print("=" * 80)
    
    time.sleep(3)  # Give container time to start
    
    exit_code, output, _ = run_ssh_command(ssh, "docker ps --filter name=mycosoft-website --format '{{.Status}}'")
    
    if "Up" in output:
        print(f"[OK] Container is running: {output.strip()}")
    else:
        print("[WARN] Container may not be running properly")
        run_ssh_command(ssh, "docker logs mycosoft-website --tail 20")
    
    # Check health
    print("\nChecking container health...")
    run_ssh_command(ssh, "curl -s http://localhost:3000 -I | head -5")
    
    ssh.close()
    
    print("\n" + "=" * 80)
    print("DEPLOYMENT COMPLETE")
    print("=" * 80)
    print("\nNext steps:")
    print("1. Purge Cloudflare cache for sandbox.mycosoft.com")
    print("2. Verify https://sandbox.mycosoft.com/natureos/devices")
    print("3. Check MycoBrain devices display correctly")

if __name__ == "__main__":
    main()
