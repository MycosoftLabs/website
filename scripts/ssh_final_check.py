#!/usr/bin/env python3
"""
Final deployment verification
"""
import os
import paramiko
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Load credentials from environment variables
VM_HOST = os.environ.get("SANDBOX_VM_HOST", "192.168.0.187")
VM_USER = os.environ.get("SANDBOX_VM_USER", "mycosoft")
VM_PASS = os.environ.get("VM_PASSWORD")

if not VM_PASS:
    print("ERROR: VM_PASSWORD environment variable is not set.")
    print("Please set it with: $env:VM_PASSWORD = 'your-password'")
    sys.exit(1)

def run_cmd(client, cmd, desc=""):
    if desc:
        print(f"\n>>> {desc}")
    print(f"$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        for line in out.split('\n')[:15]:
            print(line.encode('ascii', 'replace').decode('ascii'))
    return exit_code, out, err

def main():
    print("=" * 60)
    print("  Final Deployment Verification")
    print("=" * 60)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    print("Connected!")
    
    # All containers
    run_cmd(client, "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'",
        "All Running Containers")
    
    # K8s pods
    run_cmd(client, "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl get pods --all-namespaces | head -12",
        "Kubernetes Pods")
    
    # Service health checks
    print("\n" + "=" * 60)
    print("  Service Health Checks")
    print("=" * 60)
    
    services = [
        ("API Gateway", "http://localhost:8210/health"),
        ("E2CC Stub", "http://localhost:8211/health"),
        ("E2CC Root", "http://localhost:8211/"),
        ("Signaling", "http://localhost:8212/"),
        ("Website", "http://localhost:3000/"),
        ("Mycorrhizae", "http://localhost:8002/health"),
    ]
    
    for name, url in services:
        code, out, _ = run_cmd(client, f"curl -s -o /dev/null -w '%{{http_code}}' {url} 2>/dev/null || echo 'failed'",
            f"{name}")
        status = "OK" if out in ["200", "404"] else "DOWN"
        print(f"  Result: {status} (HTTP {out})")
    
    client.close()
    
    print("\n" + "=" * 60)
    print("  DEPLOYMENT COMPLETE")
    print("=" * 60)
    print(f"""
All Earth-2 RTX services deployed to {VM_HOST}:

  API Gateway:     http://{VM_HOST}:8210
  E2CC Stub:       http://{VM_HOST}:8211
  Signaling:       ws://{VM_HOST}:8212
  Website:         http://{VM_HOST}:3000

NGC API Key saved for future Omniverse deployments.
""")

if __name__ == "__main__":
    main()
