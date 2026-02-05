#!/usr/bin/env python3
"""
Login to NVIDIA NGC on Sandbox VM and deploy Omniverse services
"""
import paramiko
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

VM_HOST = "192.168.0.187"
VM_USER = "mycosoft"
VM_PASS = "REDACTED_VM_SSH_PASSWORD"
NGC_API_KEY = "REDACTED_NGC_API_KEY"
WEBSITE_DIR = "/home/mycosoft/mycosoft/website"

def run_cmd(client, cmd, desc="", timeout=180):
    if desc:
        print(f"\n>>> {desc}")
    print(f"$ {cmd[:100]}..." if len(cmd) > 100 else f"$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        for line in out.split('\n')[:25]:
            print(line.encode('ascii', 'replace').decode('ascii'))
    if err and exit_code != 0:
        print(f"[err] {err[:200].encode('ascii', 'replace').decode('ascii')}")
    return exit_code, out, err

def main():
    print("=" * 60)
    print("  NVIDIA NGC Login and Omniverse Deployment")
    print("=" * 60)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    print("Connected!")
    
    # Login to NGC
    print("\n" + "=" * 60)
    print("  Logging into NVIDIA NGC Container Registry")
    print("=" * 60)
    
    # Docker login to nvcr.io
    login_cmd = f'echo "{NGC_API_KEY}" | docker login nvcr.io -u \'$oauthtoken\' --password-stdin'
    run_cmd(client, login_cmd, "Docker login to nvcr.io")
    
    # Verify login
    run_cmd(client, "cat ~/.docker/config.json | grep nvcr.io", "Verify NGC login")
    
    # Pull Omniverse Kit image
    print("\n" + "=" * 60)
    print("  Pulling NVIDIA Omniverse Kit Image")
    print("=" * 60)
    
    # Try pulling the image
    run_cmd(client, 
        "docker pull nvcr.io/nvidia/omniverse/kit:106.0.0 2>&1 | tail -15",
        "Pulling Omniverse Kit image", timeout=600)
    
    # Deploy E2CC services
    print("\n" + "=" * 60)
    print("  Deploying E2CC Services")
    print("=" * 60)
    
    run_cmd(client, 
        f"cd {WEBSITE_DIR}/services/e2cc && docker compose down 2>&1",
        "Stop existing E2CC", timeout=60)
    
    run_cmd(client,
        f"cd {WEBSITE_DIR}/services/e2cc && docker compose up -d 2>&1 | tail -20",
        "Start E2CC services", timeout=300)
    
    # Final status
    print("\n" + "=" * 60)
    print("  Deployment Status")
    print("=" * 60)
    
    run_cmd(client, 
        "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}' | head -15",
        "Running containers")
    
    run_cmd(client, "curl -s http://localhost:8210/health 2>/dev/null || echo 'API Gateway: not ready'",
        "API Gateway")
    run_cmd(client, "curl -s http://localhost:8211/health 2>/dev/null || echo 'E2CC: not ready'",
        "E2CC Kit App")
    run_cmd(client, "curl -s http://localhost:8212/ 2>/dev/null | head -3 || echo 'Signaling: not ready'",
        "Signaling Server")
    
    client.close()
    
    print("\n" + "=" * 60)
    print("  NGC Login and Deployment Complete")
    print("=" * 60)

if __name__ == "__main__":
    main()
