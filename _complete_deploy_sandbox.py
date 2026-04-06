#!/usr/bin/env python3
"""
Complete website deployment to Sandbox VM via MAS jump host.
Includes automatic Cloudflare cache purge after successful deploy.
"""
import os
import paramiko
import sys
import time
from pathlib import Path

from _cloudflare_cache import purge_everything

# Load credentials
creds_file = Path(__file__).parent.parent.parent / "MAS" / "mycosoft-mas" / ".credentials.local"
if not creds_file.exists():
    creds_file = Path(__file__).parent / ".credentials.local"

password = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD") or ""
if creds_file.exists():
    for line in creds_file.read_text().splitlines():
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            if key.strip() in ["VM_SSH_PASSWORD", "VM_PASSWORD"]:
                password = value.strip()
                break

mas_vm = "${MAS_VM_HOST}"
sandbox_vm = "192.168.0.187"
username = "mycosoft"

print(f">> Deploying website to Sandbox VM ({sandbox_vm})")
print("=" * 80)

def connect_sandbox():
    """Try direct SSH to Sandbox first, then jump via MAS."""
    sandbox_client = paramiko.SSHClient()
    sandbox_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        sandbox_client.connect(sandbox_vm, username=username, password=password, timeout=10)
        return sandbox_client, None
    except Exception:
        sandbox_client.close()
    mas_client = paramiko.SSHClient()
    mas_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    mas_client.connect(mas_vm, username=username, password=password, timeout=10)
    channel = mas_client.get_transport().open_channel("direct-tcpip", (sandbox_vm, 22), (mas_vm, 22))
    sandbox_client = paramiko.SSHClient()
    sandbox_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    sandbox_client.connect(sandbox_vm, username=username, password=password, sock=channel, timeout=10)
    return sandbox_client, mas_client

try:
    print(f"\n>> Connecting to Sandbox VM ({sandbox_vm})...")
    sandbox_client, mas_client = connect_sandbox()
    print(f">> Connected to Sandbox VM")
    
    # Step 2b: Pull latest code from GitHub
    print(f"\n>> Pulling latest code from GitHub...")
    stdin, stdout, stderr = sandbox_client.exec_command(
        "cd /opt/mycosoft/website && git fetch origin && git reset --hard origin/main"
    )
    exit_status = stdout.channel.recv_exit_status()
    pull_output = stdout.read().decode().strip()
    pull_err = stderr.read().decode().strip()
    if exit_status != 0:
        print(f"WARNING: Git pull failed (exit {exit_status}). Proceeding with existing code.")
        if pull_err:
            print(f"    {pull_err}")
    else:
        print(f"    {pull_output or 'Code updated'}")
    
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
    
    # Stream output (safe for Windows cp1252 - replace Unicode)
    def safe_print(s: str) -> None:
        out = s.encode("ascii", errors="replace").decode("ascii")
        print(out)

    while True:
        line = stdout.readline()
        if not line:
            break
        safe_print(f"    {line.rstrip()}")
    
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
        "-e MAS_API_URL=http://${MAS_VM_HOST:-localhost}:8001 "
        "-e MINDEX_API_URL=http://${MINDEX_VM_HOST:-localhost}:8000 "
        "-e OLLAMA_BASE_URL=http://${MAS_VM_HOST:-localhost}:11434 "
        "-e OLLAMA_MODEL=llama3.2:3b "
        "-e N8N_URL=http://${MAS_VM_HOST:-localhost}:5678 "
        "-e NEXT_PUBLIC_BASE_URL=https://sandbox.mycosoft.com "
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
    
    # Step 6b: Restart Cloudflare tunnel (systemd service on sandbox VM)
    print(f"\n>> Restarting Cloudflare tunnel...")
    for svc_name in ["cloudflared", "cloudflare-tunnel"]:
        stdin, stdout, stderr = sandbox_client.exec_command(
            f"sudo -S systemctl restart {svc_name} 2>&1", get_pty=True
        )
        stdin.write(password + "\n")
        stdin.flush()
        exit_status = stdout.channel.recv_exit_status()
        svc_output = (stdout.read() + stderr.read()).decode().strip()
        if exit_status == 0:
            print(f"    Restarted {svc_name} successfully")
            break
        elif "could not be found" not in svc_output.lower() and "no such" not in svc_output.lower():
            print(f"    {svc_name}: {svc_output[:200]}")
    else:
        # Also try restarting a cloudflared docker container if present
        stdin, stdout, stderr = sandbox_client.exec_command(
            "docker restart mycosoft-tunnel 2>&1 || true"
        )
        stdout.channel.recv_exit_status()
        tunnel_output = stdout.read().decode().strip()
        if tunnel_output and "No such" not in tunnel_output:
            print(f"    Restarted Docker tunnel container: {tunnel_output}")
        else:
            print(f"    No cloudflare tunnel service or container found (tunnel may be external)")

    # Cleanup
    sandbox_client.close()
    if mas_client:
        mas_client.close()
    
    # Step 7: Purge Cloudflare cache (automatic - never ask user to do this)
    print(f"\n>> Purging Cloudflare cache...")
    purge_everything()

    print(f"\n" + "=" * 80)
    print(f">> Deployment complete!")
    print(f"\n>> Next steps:")
    print(f"    1. Verify website: http://192.168.0.187:3000")
    print(f"    2. Test a page or feature at https://sandbox.mycosoft.com")
    
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
