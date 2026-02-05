#!/usr/bin/env python3
"""
Redeploy E2CC with stub mode
"""
import paramiko
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

VM_HOST = "192.168.0.187"
VM_USER = "mycosoft"
VM_PASS = "REDACTED_VM_SSH_PASSWORD"
WEBSITE_DIR = "/home/mycosoft/mycosoft/website"

def run_cmd(client, cmd, desc="", timeout=180):
    if desc:
        print(f"\n>>> {desc}")
    print(f"$ {cmd[:80]}..." if len(cmd) > 80 else f"$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        for line in out.split('\n')[:20]:
            print(line.encode('ascii', 'replace').decode('ascii'))
    if err and exit_code != 0:
        print(f"[err] {err[:150].encode('ascii', 'replace').decode('ascii')}")
    return exit_code, out, err

def main():
    print("=" * 60)
    print("  Redeploying E2CC with Stub Mode")
    print("=" * 60)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    print("Connected!")
    
    # Pull latest code
    run_cmd(client, f"cd {WEBSITE_DIR} && git fetch origin && git reset --hard origin/main",
        "Pull latest code")
    run_cmd(client, f"cd {WEBSITE_DIR} && git log -1 --oneline", "Current commit")
    
    # Redeploy E2CC
    run_cmd(client, f"cd {WEBSITE_DIR}/services/e2cc && docker compose down 2>&1",
        "Stop existing E2CC", timeout=60)
    run_cmd(client, f"cd {WEBSITE_DIR}/services/e2cc && docker compose up -d 2>&1",
        "Start E2CC services", timeout=300)
    
    # Wait for startup
    run_cmd(client, "sleep 10", "Waiting for services...")
    
    # Check status
    run_cmd(client, "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}' | grep -E 'e2cc|earth2|signaling'",
        "E2CC containers")
    
    # Test services
    run_cmd(client, "curl -s http://localhost:8210/health 2>/dev/null",
        "API Gateway health")
    run_cmd(client, "curl -s http://localhost:8211/health 2>/dev/null",
        "E2CC stub health")
    run_cmd(client, "curl -s http://localhost:8212/ 2>/dev/null | head -3",
        "Signaling server")
    
    client.close()
    
    print("\n" + "=" * 60)
    print("  E2CC Redeployment Complete")
    print("=" * 60)
    print("\nServices running in stub mode (no GPU).")
    print("For full E2CC, run on Windows Dev PC with RTX 5090.")

if __name__ == "__main__":
    main()
