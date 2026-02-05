#!/usr/bin/env python3
"""
Fix permissions and complete deployment
"""

import paramiko
import sys

VM_HOST = "192.168.0.187"
VM_USER = "mycosoft"
VM_PASS = "REDACTED_VM_SSH_PASSWORD"
WEBSITE_DIR = "/home/mycosoft/mycosoft/website"

def run_cmd(client, cmd, desc="", timeout=120):
    """Run command on remote host"""
    if desc:
        print(f"\n>>> {desc}")
    print(f"$ {cmd}")
    
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    
    if out:
        for line in out.split('\n')[:30]:
            print(line)
    if err:
        print(f"[stderr] {err[:300]}")
    
    return exit_code, out, err

def run_sudo(client, cmd, desc=""):
    """Run command with sudo using password from stdin"""
    full_cmd = f"echo '{VM_PASS}' | sudo -S bash -c '{cmd}'"
    return run_cmd(client, full_cmd, desc)

def main():
    print("=" * 70)
    print("  Fixing Permissions and Completing Deployment")
    print("=" * 70)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    print("Connected!")
    
    # Fix ownership of entire website directory
    print("\n" + "=" * 70)
    print("  FIXING PERMISSIONS")
    print("=" * 70)
    
    run_sudo(client, f"chown -R mycosoft:mycosoft {WEBSITE_DIR}", "Fixing website directory ownership")
    run_sudo(client, f"chmod -R 755 {WEBSITE_DIR}", "Setting permissions")
    
    # Now pull the code
    print("\n" + "=" * 70)
    print("  PULLING LATEST CODE")
    print("=" * 70)
    
    run_cmd(client, f"cd {WEBSITE_DIR} && git status", "Git status")
    run_cmd(client, f"cd {WEBSITE_DIR} && git fetch origin", "Fetch origin")
    run_cmd(client, f"cd {WEBSITE_DIR} && git reset --hard origin/main", "Reset to main")
    run_cmd(client, f"cd {WEBSITE_DIR} && git log -1 --oneline", "Current commit")
    
    # Verify E2CC directory now exists
    print("\n" + "=" * 70)
    print("  VERIFYING NEW FILES")
    print("=" * 70)
    
    run_cmd(client, f"ls -la {WEBSITE_DIR}/services/ 2>/dev/null || echo 'No services dir'", "Services directory")
    run_cmd(client, f"ls -la {WEBSITE_DIR}/services/e2cc/ 2>/dev/null || echo 'No E2CC'", "E2CC directory")
    run_cmd(client, f"ls -la {WEBSITE_DIR}/infra/k8s/ 2>/dev/null || echo 'No K8s infra'", "K8s infrastructure")
    run_cmd(client, f"ls -la {WEBSITE_DIR}/tests/e2e/ 2>/dev/null || echo 'No tests'", "Test suites")
    
    # Install K3s properly
    print("\n" + "=" * 70)
    print("  INSTALLING K3s")
    print("=" * 70)
    
    code, out, _ = run_cmd(client, "which k3s 2>/dev/null || echo 'not found'", "Check K3s")
    
    if "not found" in out:
        print("Installing K3s with proper sudo handling...")
        # Use a different approach - download and run with sudo
        run_sudo(client, "curl -sfL https://get.k3s.io -o /tmp/k3s-install.sh", "Download K3s installer")
        run_sudo(client, "chmod +x /tmp/k3s-install.sh && /tmp/k3s-install.sh", "Run K3s installer")
        run_sudo(client, "systemctl enable k3s", "Enable K3s service")
        run_sudo(client, "systemctl start k3s", "Start K3s")
        
        # Setup kubectl for user
        run_sudo(client, "mkdir -p /home/mycosoft/.kube", "Create .kube dir")
        run_cmd(client, "sleep 5", "Wait for K3s to initialize")  # Wait for k3s.yaml to be created
        run_sudo(client, "cp /etc/rancher/k3s/k3s.yaml /home/mycosoft/.kube/config 2>/dev/null || echo 'Kubeconfig not ready'", "Copy kubeconfig")
        run_sudo(client, "chown -R mycosoft:mycosoft /home/mycosoft/.kube", "Fix ownership")
        run_cmd(client, "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl get nodes 2>/dev/null || echo 'K3s not ready yet'", 
            "Verify kubectl")
    else:
        # K3s exists but may not be running
        run_sudo(client, "systemctl start k3s 2>/dev/null || echo 'Could not start'", "Start K3s")
        run_cmd(client, "kubectl get nodes 2>/dev/null || echo 'kubectl not ready'", "Check nodes")
    
    # Deploy Docker services (E2CC)
    print("\n" + "=" * 70)
    print("  DEPLOYING DOCKER SERVICES")
    print("=" * 70)
    
    code, out, _ = run_cmd(client, f"ls {WEBSITE_DIR}/services/e2cc/docker-compose.yml 2>/dev/null || echo 'No compose file'",
        "Check docker-compose.yml")
    
    if "No compose file" not in out:
        run_cmd(client, f"cd {WEBSITE_DIR}/services/e2cc && docker compose down 2>/dev/null", 
            "Stop existing E2CC", timeout=60)
        run_cmd(client, f"cd {WEBSITE_DIR}/services/e2cc && docker compose up -d --build 2>&1 | tail -20",
            "Build and start E2CC", timeout=300)
    else:
        print("[WARNING] E2CC docker-compose.yml not found after git pull")
    
    # Final status
    print("\n" + "=" * 70)
    print("  FINAL STATUS")
    print("=" * 70)
    
    run_cmd(client, "docker ps --format 'table {{.Names}}\\t{{.Status}}' | head -15", "Docker containers")
    run_cmd(client, "lspci | grep -i nvidia || echo 'No NVIDIA GPU in PCI'", "GPU status")
    run_cmd(client, f"cd {WEBSITE_DIR} && git log -1 --format='%h - %s (%ci)'", "Deployed commit")
    
    client.close()
    
    print("\n" + "=" * 70)
    print("  NEXT STEPS")
    print("=" * 70)
    print("\n1. GPU Passthrough: RTX 5090 needs to be passed through from Proxmox")
    print("2. Once GPU is available, run tests: python tests/e2e/test_rtx5090_passthrough.py --remote 192.168.0.187")
    print("3. Deploy K8s models: kubectl apply -f infra/k8s/earth2-models/")

if __name__ == "__main__":
    main()
