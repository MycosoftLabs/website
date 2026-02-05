#!/usr/bin/env python3
"""
Verify deployment and deploy Docker services
"""
import paramiko
import sys
import os

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

VM_HOST = "192.168.0.187"
VM_USER = "mycosoft"
VM_PASS = "REDACTED_VM_SSH_PASSWORD"
WEBSITE_DIR = "/home/mycosoft/mycosoft/website"

def run_cmd(client, cmd, desc="", timeout=120):
    if desc:
        print(f"\n>>> {desc}")
    print(f"$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        # Filter out non-ASCII for display
        safe_out = out.encode('ascii', 'replace').decode('ascii')
        for line in safe_out.split('\n')[:30]:
            print(line)
    if err and exit_code != 0:
        safe_err = err.encode('ascii', 'replace').decode('ascii')[:200]
        print(f"[err] {safe_err}")
    return exit_code, out, err

def run_sudo(client, cmd, desc=""):
    return run_cmd(client, f"echo '{VM_PASS}' | sudo -S bash -c '{cmd}'", desc)

def main():
    print("=" * 60)
    print("  Verifying and Completing Deployment")
    print("=" * 60)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    print("Connected!")
    
    # 1. Verify code version
    run_cmd(client, f"cd {WEBSITE_DIR} && git log -1 --oneline", "Current commit")
    
    # 2. Check K3s status
    print("\n" + "=" * 60)
    print("  K3s STATUS")
    print("=" * 60)
    
    run_sudo(client, "systemctl status k3s --no-pager | head -10", "K3s service status")
    run_cmd(client, "kubectl get nodes 2>/dev/null || echo 'kubectl not ready'", "K3s nodes")
    
    # Setup kubeconfig if needed
    run_sudo(client, "mkdir -p /home/mycosoft/.kube", "Ensure .kube dir")
    run_sudo(client, "cp /etc/rancher/k3s/k3s.yaml /home/mycosoft/.kube/config 2>/dev/null || echo 'No kubeconfig yet'", "Copy kubeconfig")
    run_sudo(client, "chown -R mycosoft:mycosoft /home/mycosoft/.kube", "Fix ownership")
    
    # Check again
    run_cmd(client, "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl get nodes", "Verify kubectl")
    
    # 3. Deploy K8s namespaces
    print("\n" + "=" * 60)
    print("  KUBERNETES RESOURCES")
    print("=" * 60)
    
    run_cmd(client, f"export KUBECONFIG=/home/mycosoft/.kube/config && kubectl apply -f {WEBSITE_DIR}/infra/k8s/namespaces.yaml 2>&1 || echo 'Could not apply'",
        "Apply namespaces")
    run_cmd(client, f"export KUBECONFIG=/home/mycosoft/.kube/config && kubectl apply -f {WEBSITE_DIR}/infra/k8s/storage/ 2>&1 || echo 'Could not apply storage'",
        "Apply storage")
    run_cmd(client, "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl get namespaces | grep earth2 || echo 'No earth2 namespaces'",
        "Check earth2 namespaces")
    
    # 4. Deploy Docker services
    print("\n" + "=" * 60)
    print("  DOCKER SERVICES")
    print("=" * 60)
    
    run_cmd(client, f"cd {WEBSITE_DIR}/services/e2cc && docker compose down 2>/dev/null || echo 'Nothing to stop'",
        "Stop existing E2CC", timeout=60)
    run_cmd(client, f"cd {WEBSITE_DIR}/services/e2cc && docker compose build 2>&1 | tail -15",
        "Build E2CC services", timeout=300)
    run_cmd(client, f"cd {WEBSITE_DIR}/services/e2cc && docker compose up -d 2>&1",
        "Start E2CC services", timeout=60)
    
    # 5. Final status
    print("\n" + "=" * 60)
    print("  FINAL STATUS")
    print("=" * 60)
    
    run_cmd(client, "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'", "Docker containers")
    run_cmd(client, "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl get pods --all-namespaces 2>/dev/null | head -15",
        "K8s pods")
    run_cmd(client, "lspci | grep -i nvidia || echo 'No NVIDIA GPU'", "GPU status")
    
    # 6. Check service health
    print("\n" + "=" * 60)
    print("  SERVICE HEALTH")
    print("=" * 60)
    
    run_cmd(client, "curl -s http://localhost:8210/health 2>/dev/null || echo 'API Gateway not responding'", "API Gateway")
    run_cmd(client, "curl -s http://localhost:8211/health 2>/dev/null || echo 'E2CC not responding'", "E2CC")
    run_cmd(client, "curl -s http://localhost:8212/ 2>/dev/null || echo 'Signaling not responding'", "Signaling")
    
    client.close()
    
    print("\n" + "=" * 60)
    print("  DEPLOYMENT VERIFICATION COMPLETE")
    print("=" * 60)
    print("\nNext: Run remote tests")
    print(f"  python tests/e2e/test_services_comprehensive.py --host {VM_HOST}")

if __name__ == "__main__":
    main()
