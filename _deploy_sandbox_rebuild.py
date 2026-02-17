#!/usr/bin/env python3
"""Deploy to sandbox VM with full rebuild - Feb 12, 2026"""

import os
import paramiko
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# Load credentials
def load_credentials():
    """Load credentials from .credentials.local file"""
    creds_file = Path(__file__).parent / ".credentials.local"
    if not creds_file.exists():
        # Try MAS repo
        creds_file = Path(__file__).parent.parent.parent / "MAS" / "mycosoft-mas" / ".credentials.local"
    
    if creds_file.exists():
        for line in creds_file.read_text().splitlines():
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()

load_credentials()

# VM details
MAS_HOST = "192.168.0.188"
SANDBOX_HOST = "192.168.0.187"
VM_USER = os.environ.get("VM_SSH_USER", "mycosoft")
VM_PASS = os.environ.get("VM_SSH_PASSWORD") or os.environ.get("VM_PASSWORD")
WEBSITE_DIR = "/opt/mycosoft/website"

if not VM_PASS:
    print("ERROR: VM_PASSWORD environment variable is not set.")
    print("Check .credentials.local file.")
    sys.exit(1)

def execute_command(ssh, command, description, timeout=300):
    """Execute a command and print output"""
    print(f"\n{description}")
    print(f"Command: {command[:100]}...")
    
    # Use get_pty=True to avoid timeout issues with long-running commands
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout, get_pty=True)
    
    # For long commands, just wait for completion and get all output
    exit_status = stdout.channel.recv_exit_status()
    
    # Read all output
    output = stdout.read().decode()
    if output:
        for line in output.splitlines():
            print(f"  {line}")
    
    err = stderr.read().decode()
    if err:
        print(f"  STDERR: {err}")
    
    if exit_status != 0:
        print(f"  ⚠️  Command exited with status {exit_status}")
    return exit_status

def main():
    try:
        # Connect to MAS VM first (jump host)
        print(f"=== Connecting to MAS VM ({MAS_HOST}) as jump host ===")
        mas_ssh = paramiko.SSHClient()
        mas_ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        mas_ssh.connect(MAS_HOST, username=VM_USER, password=VM_PASS, timeout=30)
        print("✅ Connected to MAS VM")
        
        # Create SSH tunnel through MAS to Sandbox
        print(f"\n=== Establishing tunnel to Sandbox VM ({SANDBOX_HOST}) ===")
        mas_transport = mas_ssh.get_transport()
        dest_addr = (SANDBOX_HOST, 22)
        mas_addr = (MAS_HOST, 22)
        mas_channel = mas_transport.open_channel("direct-tcpip", dest_addr, mas_addr)
        
        # Connect to Sandbox through tunnel
        sandbox_ssh = paramiko.SSHClient()
        sandbox_ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        sandbox_ssh.connect(SANDBOX_HOST, username=VM_USER, password=VM_PASS, 
                          sock=mas_channel, timeout=30)
        print("✅ Connected to Sandbox VM via tunnel")
        
        # Check current git status
        execute_command(sandbox_ssh, f"cd {WEBSITE_DIR} && pwd && git log -1 --oneline", 
                       "1. Checking current code version")
        
        # Stop and remove existing container
        execute_command(sandbox_ssh, 
                       "docker kill mycosoft-website 2>/dev/null || echo 'Container not running'",
                       "2. Stopping existing container", timeout=30)
        execute_command(sandbox_ssh,
                       "docker rm mycosoft-website 2>/dev/null || echo 'Container already removed'",
                       "3. Removing existing container", timeout=30)
        
        # Build new image (try with --no-cache first, fallback if fails)
        print("\n=== 4. Building new Docker image (this may take several minutes) ===")
        build_cmd = f"cd {WEBSITE_DIR} && docker build --no-cache -t mycosoft-always-on-mycosoft-website:latest ."
        exit_status = execute_command(sandbox_ssh, build_cmd, 
                                     "Building with --no-cache", timeout=600)
        
        if exit_status != 0:
            print("\n⚠️  Build with --no-cache failed, trying without...")
            build_cmd = f"cd {WEBSITE_DIR} && docker build -t mycosoft-always-on-mycosoft-website:latest ."
            exit_status = execute_command(sandbox_ssh, build_cmd,
                                        "Building without --no-cache", timeout=600)
            if exit_status != 0:
                print("\n❌ Docker build failed!")
                return False
        
        # Start new container with NAS mount
        run_cmd = """docker run -d --name mycosoft-website -p 3000:3000 \
  -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
  -e MAS_API_URL=http://192.168.0.188:8001 \
  --restart unless-stopped \
  mycosoft-always-on-mycosoft-website:latest"""
        
        execute_command(sandbox_ssh, run_cmd, "5. Starting new container", timeout=30)
        
        # Wait for container to initialize
        print("\n⏳ Waiting 10 seconds for container to initialize...")
        time.sleep(10)
        
        # Verify container status
        execute_command(sandbox_ssh, "docker ps --filter name=mycosoft-website",
                       "6. Verifying container status", timeout=30)
        
        # Check container logs
        execute_command(sandbox_ssh, "docker logs mycosoft-website --tail 20",
                       "7. Checking container logs", timeout=30)
        
        # Test website response
        execute_command(sandbox_ssh, 
                       "curl -s -o /dev/null -w 'HTTP Status: %{http_code}\\n' http://localhost:3000 || echo 'Warning: Website not responding yet'",
                       "8. Testing website response", timeout=30)
        
        print("\n" + "="*60)
        print("✅ Deployment completed successfully!")
        print("="*60)
        print(f"Website should be available at:")
        print(f"  - http://{SANDBOX_HOST}:3000")
        print(f"  - https://sandbox.mycosoft.com")
        print(f"\nNext step: Purge Cloudflare cache if needed")
        
        sandbox_ssh.close()
        mas_ssh.close()
        return True
        
    except paramiko.AuthenticationException:
        print("\n❌ Authentication failed. Check credentials in .credentials.local")
        return False
    except paramiko.SSHException as e:
        print(f"\n❌ SSH error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Deployment failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
