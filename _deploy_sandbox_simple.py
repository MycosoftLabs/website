#!/usr/bin/env python3
"""Simple deployment to sandbox VM - Feb 12, 2026"""

import os
import paramiko
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# Load credentials
def load_credentials():
    creds_file = Path(__file__).parent / ".credentials.local"
    if not creds_file.exists():
        creds_file = Path(__file__).parent.parent.parent / "MAS" / "mycosoft-mas" / ".credentials.local"
    
    if creds_file.exists():
        for line in creds_file.read_text().splitlines():
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()

load_credentials()

MAS_HOST = "192.168.0.188"
SANDBOX_HOST = "192.168.0.187"
VM_USER = os.environ.get("VM_SSH_USER", "mycosoft")
VM_PASS = os.environ.get("VM_SSH_PASSWORD") or os.environ.get("VM_PASSWORD")

if not VM_PASS:
    print("ERROR: VM_PASSWORD not found in .credentials.local")
    sys.exit(1)

def run_command(ssh, cmd, step_name):
    """Run command and return (stdout, stderr, exit_code)"""
    print(f"\n=== {step_name} ===")
    print(f"CMD: {cmd[:80]}...")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=1200)  # 20 minute timeout
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    
    if out:
        print(f"Output:\n{out}")
    if err:
        print(f"Stderr:\n{err}")
    if exit_code != 0:
        print(f"⚠️  Exit code: {exit_code}")
    else:
        print("✅ Success")
    
    return out, err, exit_code

def main():
    try:
        print("Connecting to MAS VM...")
        mas_ssh = paramiko.SSHClient()
        mas_ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        mas_ssh.connect(MAS_HOST, username=VM_USER, password=VM_PASS, timeout=30)
        print("✅ Connected to MAS")
        
        print("\nCreating tunnel to Sandbox...")
        mas_transport = mas_ssh.get_transport()
        dest_addr = (SANDBOX_HOST, 22)
        mas_addr = (MAS_HOST, 22)
        mas_channel = mas_transport.open_channel("direct-tcpip", dest_addr, mas_addr)
        
        sandbox_ssh = paramiko.SSHClient()
        sandbox_ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        sandbox_ssh.connect(SANDBOX_HOST, username=VM_USER, password=VM_PASS, 
                          sock=mas_channel, timeout=30)
        print("✅ Connected to Sandbox")
        
        # Step 1: Check current code
        run_command(sandbox_ssh, "cd /opt/mycosoft/website && git log -1 --oneline", "1. Current code version")
        
        # Step 2: Stop container
        run_command(sandbox_ssh, "docker kill mycosoft-website 2>/dev/null || true", "2. Stop container")
        
        # Step 3: Remove container
        run_command(sandbox_ssh, "docker rm mycosoft-website 2>/dev/null || true", "3. Remove container")
        
        # Step 4: Build image (without --no-cache to save time)
        print("\n=== 4. Building Docker image (this will take 10-15 minutes) ===")
        print("Building WITHOUT --no-cache to save time...")
        out, err, exit_code = run_command(
            sandbox_ssh,
            "cd /opt/mycosoft/website && docker build -t mycosoft-always-on-mycosoft-website:latest .",
            "4. Docker build"
        )
        
        if exit_code != 0:
            print("\n❌ Docker build failed!")
            print("Stderr:", err)
            return False
        
        # Step 5: Start new container
        run_cmd = """docker run -d --name mycosoft-website -p 3000:3000 \
-v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
-e MAS_API_URL=http://192.168.0.188:8001 \
--restart unless-stopped \
mycosoft-always-on-mycosoft-website:latest"""
        
        run_command(sandbox_ssh, run_cmd, "5. Start container")
        
        # Step 6: Wait and verify
        print("\n⏳ Waiting 10 seconds...")
        time.sleep(10)
        
        run_command(sandbox_ssh, "docker ps --filter name=mycosoft-website", "6. Check status")
        run_command(sandbox_ssh, "docker logs mycosoft-website --tail 15", "7. Check logs")
        run_command(sandbox_ssh, 
                   "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000",
                   "8. Test website")
        
        print("\n" + "="*60)
        print("✅ DEPLOYMENT COMPLETE")
        print("="*60)
        print("Website: http://192.168.0.187:3000")
        print("         https://sandbox.mycosoft.com")
        print("\nNext: Purge Cloudflare cache if needed")
        
        sandbox_ssh.close()
        mas_ssh.close()
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
