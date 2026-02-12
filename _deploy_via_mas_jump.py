#!/usr/bin/env python3
"""
Deploy website to Sandbox VM (187) using MAS VM (188) as jump host.
Created: Feb 10, 2026
"""
import paramiko
import time
import sys
from pathlib import Path

def load_credentials():
    """Load VM credentials from .credentials.local"""
    creds_file = Path(__file__).parent / ".credentials.local"
    if not creds_file.exists():
        raise FileNotFoundError(f"Credentials file not found: {creds_file}")
    
    creds = {}
    with open(creds_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                creds[key.strip()] = value.strip()
    
    return creds

def execute_command(ssh, command, timeout=300):
    """Execute command and return output"""
    print(f"  Running: {command[:80]}...")
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    
    # Read output as it comes
    output = []
    errors = []
    
    while True:
        line = stdout.readline()
        if not line:
            break
        output.append(line)
        print(f"    {line.rstrip()}")
    
    exit_code = stdout.channel.recv_exit_status()
    
    if exit_code != 0:
        error_output = stderr.read().decode()
        if error_output:
            print(f"  ERROR: {error_output}")
            errors.append(error_output)
    
    return exit_code, ''.join(output), ''.join(errors)

def main():
    print("=" * 80)
    print("DEPLOY TO SANDBOX VIA MAS JUMP HOST")
    print("=" * 80)
    
    # Load credentials
    print("\n1. Loading credentials...")
    creds = load_credentials()
    password = creds["VM_SSH_PASSWORD"]
    username = creds["VM_SSH_USER"]
    mas_host = creds["MAS_VM"]
    sandbox_host = creds["SANDBOX_VM"]
    
    # Connect to MAS VM first
    print(f"\n2. Connecting to MAS VM ({mas_host})...")
    mas_client = paramiko.SSHClient()
    mas_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        mas_client.connect(
            mas_host,
            username=username,
            password=password,
            timeout=10,
            banner_timeout=10
        )
        print("  [OK] Connected to MAS VM")
    except Exception as e:
        print(f"  [FAIL] Failed to connect to MAS: {e}")
        sys.exit(1)
    
    # From MAS, SSH to Sandbox
    print(f"\n3. Opening SSH tunnel from MAS to Sandbox ({sandbox_host})...")
    
    # Get a transport channel from MAS to Sandbox
    transport = mas_client.get_transport()
    dest_addr = (sandbox_host, 22)
    local_addr = (mas_host, 22)
    
    try:
        channel = transport.open_channel("direct-tcpip", dest_addr, local_addr)
        print("  [OK] Channel opened to Sandbox via MAS")
    except Exception as e:
        print(f"  [FAIL] Failed to open channel: {e}")
        mas_client.close()
        sys.exit(1)
    
    # Connect to Sandbox through the channel
    print(f"\n4. Connecting to Sandbox via tunnel...")
    sandbox_client = paramiko.SSHClient()
    sandbox_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        sandbox_client.connect(
            sandbox_host,
            username=username,
            password=password,
            sock=channel,
            timeout=10
        )
        print("  [OK] Connected to Sandbox VM")
    except Exception as e:
        print(f"  [FAIL] Failed to connect to Sandbox: {e}")
        mas_client.close()
        sys.exit(1)
    
    # Now deploy on Sandbox
    print(f"\n5. Deploying website on Sandbox...")
    
    try:
        # Pull latest code
        print("\n  >> Pulling latest code...")
        exit_code, out, err = execute_command(
            sandbox_client,
            "cd /opt/mycosoft/website && git fetch origin && git reset --hard origin/main",
            timeout=30
        )
        if exit_code != 0:
            print(f"  [FAIL] Git pull failed: {err}")
            raise Exception("Git pull failed")
        
        # Force remove old container
        print("\n  >> Removing old container...")
        execute_command(
            sandbox_client,
            "docker kill mycosoft-website 2>/dev/null || true",
            timeout=10
        )
        execute_command(
            sandbox_client,
            "docker rm -f mycosoft-website 2>/dev/null || true",
            timeout=10
        )
        
        # Build new image
        print("\n  >> Building Docker image (this takes 2-5 minutes)...")
        exit_code, out, err = execute_command(
            sandbox_client,
            "cd /opt/mycosoft/website && docker build --no-cache -t mycosoft-always-on-mycosoft-website:latest .",
            timeout=600
        )
        if exit_code != 0:
            print(f"  [FAIL] Docker build failed: {err}")
            raise Exception("Docker build failed")
        
        # Start container
        print("\n  >> Starting container...")
        docker_run_cmd = """docker run -d --name mycosoft-website -p 3000:3000 \
  -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
  -e MAS_API_URL=http://192.168.0.188:8001 \
  --restart unless-stopped \
  mycosoft-always-on-mycosoft-website:latest"""
        
        exit_code, out, err = execute_command(
            sandbox_client,
            docker_run_cmd,
            timeout=30
        )
        if exit_code != 0:
            print(f"  [FAIL] Container start failed: {err}")
            raise Exception("Container start failed")
        
        container_id = out.strip()
        print(f"  [OK] Container started: {container_id[:12]}")
        
        # Verify
        print("\n  >> Verifying deployment...")
        time.sleep(3)
        
        exit_code, out, err = execute_command(
            sandbox_client,
            "docker ps | grep mycosoft-website",
            timeout=10
        )
        if exit_code == 0:
            print(f"  [OK] Container running:\n    {out.strip()}")
        else:
            print(f"  [WARN] Container may not be running")
        
        exit_code, out, err = execute_command(
            sandbox_client,
            "curl -I -s http://localhost:3000 | head -n 1",
            timeout=10
        )
        if exit_code == 0 and "200" in out:
            print(f"  [OK] Website responding: {out.strip()}")
        else:
            print(f"  [WARN] Website may not be responding yet (give it 10-20 seconds)")
        
        print("\n" + "=" * 80)
        print("[SUCCESS] DEPLOYMENT COMPLETE")
        print("=" * 80)
        print("\nNext steps:")
        print("  1. Purge Cloudflare cache: https://dash.cloudflare.com/")
        print("  2. Verify: https://sandbox.mycosoft.com/natureos/devices")
        print("  3. Check for MycoBrain devices on the page")
        
    except Exception as e:
        print(f"\n[FAIL] Deployment failed: {e}")
        sys.exit(1)
    finally:
        sandbox_client.close()
        mas_client.close()

if __name__ == "__main__":
    main()
