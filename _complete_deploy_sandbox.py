#!/usr/bin/env python3
"""
Complete website deployment to Sandbox VM via MAS jump host.
"""
import paramiko
import time
import sys
from pathlib import Path

# Load credentials
creds_file = Path(__file__).parent.parent.parent / "MAS" / "mycosoft-mas" / ".credentials.local"
if not creds_file.exists():
    creds_file = Path(__file__).parent / ".credentials.local"

password = "REDACTED_VM_SSH_PASSWORD"
if creds_file.exists():
    for line in creds_file.read_text().splitlines():
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            if key.strip() in ["VM_SSH_PASSWORD", "VM_PASSWORD"]:
                password = value.strip()
                break

mas_vm = "192.168.0.188"
sandbox_vm = "192.168.0.187"
username = "mycosoft"

print(f">> Deploying website to Sandbox VM ({sandbox_vm}) via MAS VM ({mas_vm})")
print("=" * 80)

# Step 1: Connect to MAS VM
print(f"\n>> Connecting to MAS VM ({mas_vm})...")
mas_client = paramiko.SSHClient()
mas_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    mas_client.connect(mas_vm, username=username, password=password, timeout=10)
    print(f">> Connected to MAS VM")
    
    # Step 2: Setup SSH jump to Sandbox
    print(f"\n>> Opening SSH channel to Sandbox VM ({sandbox_vm})...")
    transport = mas_client.get_transport()
    dest_addr = (sandbox_vm, 22)
    local_addr = (mas_vm, 22)
    channel = transport.open_channel("direct-tcpip", dest_addr, local_addr)
    
    # Connect through the channel
    sandbox_client = paramiko.SSHClient()
    sandbox_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    sandbox_client.connect(sandbox_vm, username=username, password=password, sock=channel, timeout=10)
    print(f">> Connected to Sandbox VM")
    
    # Step 3: Stop and remove existing container (force)
    print(f"\n>> Stopping and removing existing container (forced)...")
    stdin, stdout, stderr = sandbox_client.exec_command(
        "docker stop -t 2 mycosoft-website 2>&1 || true"
    )
    stdout.channel.recv_exit_status()
    stop_output = stdout.read().decode().strip()
    if stop_output and "No such container" not in stop_output:
        print(f"    Stop: {stop_output}")
    
    stdin, stdout, stderr = sandbox_client.exec_command(
        "docker rm -f mycosoft-website 2>&1 || true"
    )
    stdout.channel.recv_exit_status()
    rm_output = stdout.read().decode().strip()
    if rm_output and "No such container" not in rm_output:
        print(f"    Remove: {rm_output}")
    
    # Wait for cleanup
    time.sleep(2)
    print("    Container cleanup complete")
    
    # Step 4: Build Docker image
    print(f"\n>> Building Docker image (this may take several minutes)...")
    print("    Location: /opt/mycosoft/website")
    print("    Image: mycosoft-always-on-mycosoft-website:latest")
    
    stdin, stdout, stderr = sandbox_client.exec_command(
        "cd /opt/mycosoft/website && "
        "docker build -t mycosoft-always-on-mycosoft-website:latest . 2>&1",
        get_pty=True
    )
    
    # Stream output
    while True:
        line = stdout.readline()
        if not line:
            break
        print(f"    {line.rstrip()}")
    
    exit_status = stdout.channel.recv_exit_status()
    if exit_status != 0:
        print(f"ERROR: Docker build failed with exit code {exit_status}")
        error = stderr.read().decode()
        if error:
            print(f"Error: {error}")
        sys.exit(1)
    
    print(f">> Docker image built successfully")
    
    # Step 5: Start new container
    print(f"\n>> Starting new container...")
    start_cmd = (
        "docker run -d --name mycosoft-website -p 3000:3000 "
        "-v /opt/mycosoft/media/website/assets:/app/public/assets:ro "
        "-e MAS_API_URL=http://192.168.0.188:8001 "
        "--restart unless-stopped "
        "mycosoft-always-on-mycosoft-website:latest"
    )
    
    stdin, stdout, stderr = sandbox_client.exec_command(start_cmd)
    exit_status = stdout.channel.recv_exit_status()
    output = stdout.read().decode()
    error = stderr.read().decode()
    
    if exit_status != 0:
        print(f"ERROR: Container start failed with exit code {exit_status}")
        print(f"Error: {error}")
        sys.exit(1)
    
    container_id = output.strip()
    print(f">> Container started: {container_id[:12]}")
    
    # Step 6: Verify container is running
    print(f"\n>> Verifying container status...")
    time.sleep(2)
    
    stdin, stdout, stderr = sandbox_client.exec_command(
        "docker ps --filter name=mycosoft-website --format '{{.ID}} {{.Status}} {{.Ports}}'"
    )
    exit_status = stdout.channel.recv_exit_status()
    output = stdout.read().decode().strip()
    
    if output:
        print(f">> Container is running:")
        print(f"    {output}")
        print(f"\n>> Website should be accessible at:")
        print(f"    http://192.168.0.187:3000")
        print(f"    https://sandbox.mycosoft.com")
    else:
        print(f"WARNING: Container may not be running. Checking logs...")
        stdin, stdout, stderr = sandbox_client.exec_command(
            "docker logs mycosoft-website --tail 20 2>&1"
        )
        logs = stdout.read().decode()
        print(f"\n>> Container logs:")
        print(logs)
    
    # Cleanup
    sandbox_client.close()
    mas_client.close()
    
    print(f"\n" + "=" * 80)
    print(f">> Deployment complete!")
    print(f"\n>> Next steps:")
    print(f"    1. Verify website: http://192.168.0.187:3000")
    print(f"    2. Test a page or feature")
    print(f"    3. Purge Cloudflare cache if everything works")
    
except paramiko.AuthenticationException:
    print(f"ERROR: Authentication failed. Check credentials in .credentials.local")
    sys.exit(1)
except paramiko.SSHException as e:
    print(f"ERROR: SSH error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: Deployment failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
