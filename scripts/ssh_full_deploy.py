#!/usr/bin/env python3
"""
Full SSH Deployment Script for Earth-2 RTX
Handles correct paths and full deployment
"""

import os
import paramiko
import sys
import time

# Load credentials from environment variables
VM_HOST = os.environ.get("SANDBOX_VM_HOST", "192.168.0.187")
VM_USER = os.environ.get("SANDBOX_VM_USER", "mycosoft")
VM_PASS = os.environ.get("VM_PASSWORD")
WEBSITE_DIR = "/home/mycosoft/mycosoft/website"  # Correct path

if not VM_PASS:
    print("ERROR: VM_PASSWORD environment variable is not set.")
    print("Please set it with: $env:VM_PASSWORD = 'your-password'")
    sys.exit(1)

def run_cmd(client, cmd, desc="", check_exit=True, timeout=120):
    """Run command on remote host"""
    if desc:
        print(f"\n>>> {desc}")
    print(f"$ {cmd}")
    
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    
    if out:
        for line in out.split('\n')[:50]:  # Limit output
            print(line)
        if len(out.split('\n')) > 50:
            print(f"... ({len(out.split(chr(10)))} lines total)")
    if err and exit_code != 0:
        print(f"[stderr] {err[:500]}")
    
    return exit_code, out, err

def run_sudo(client, cmd, desc=""):
    """Run command with sudo"""
    full_cmd = f"echo '{VM_PASS}' | sudo -S {cmd}"
    return run_cmd(client, full_cmd, desc)

def main():
    print("=" * 70)
    print("  Earth-2 RTX Full Deployment to Sandbox VM")
    print("=" * 70)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {VM_USER}@{VM_HOST}...")
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    print("Connected!")
    
    # ========================================
    # PHASE 1: Pull Latest Code
    # ========================================
    print("\n" + "=" * 70)
    print("  PHASE 1: PULLING LATEST CODE")
    print("=" * 70)
    
    run_cmd(client, f"cd {WEBSITE_DIR} && pwd", "Checking website directory")
    run_cmd(client, f"cd {WEBSITE_DIR} && git fetch origin", "Fetching from origin")
    run_cmd(client, f"cd {WEBSITE_DIR} && git reset --hard origin/main", "Resetting to origin/main")
    run_cmd(client, f"cd {WEBSITE_DIR} && git log -1 --oneline", "Latest commit")
    
    # ========================================
    # PHASE 2: Check GPU Status
    # ========================================
    print("\n" + "=" * 70)
    print("  PHASE 2: GPU STATUS CHECK")
    print("=" * 70)
    
    code, out, _ = run_cmd(client, "lspci | grep -i nvidia", "Checking for NVIDIA PCI devices")
    
    gpu_available = bool(out.strip())
    
    if not gpu_available:
        print("\n[CRITICAL] No NVIDIA GPU detected in PCI devices!")
        print("GPU passthrough needs to be configured in Proxmox.")
        print("\nTo enable GPU passthrough on Proxmox host:")
        print("  1. Edit VM config: qm set <vmid> -hostpci0 <pci-addr>")
        print("  2. Ensure IOMMU is enabled in BIOS and GRUB")
        print("  3. Blacklist nouveau driver")
        print("\nContinuing with deployment (GPU features will be unavailable)...")
    else:
        print("[OK] NVIDIA GPU detected!")
        run_cmd(client, "nvidia-smi", "GPU Info")
    
    # ========================================
    # PHASE 3: Install/Check K3s
    # ========================================
    print("\n" + "=" * 70)
    print("  PHASE 3: KUBERNETES (K3s) STATUS")
    print("=" * 70)
    
    code, out, _ = run_cmd(client, "which k3s 2>/dev/null || echo 'not found'", "Checking K3s installation")
    
    k3s_installed = "not found" not in out
    
    if not k3s_installed:
        print("\n[INFO] K3s not installed. Installing K3s...")
        # Install K3s
        run_sudo(client, "curl -sfL https://get.k3s.io | sh -", "Installing K3s")
        run_sudo(client, "systemctl enable k3s", "Enabling K3s service")
        run_sudo(client, "mkdir -p /home/mycosoft/.kube", "Creating .kube directory")
        run_sudo(client, "cp /etc/rancher/k3s/k3s.yaml /home/mycosoft/.kube/config", "Copying kubeconfig")
        run_sudo(client, "chown -R mycosoft:mycosoft /home/mycosoft/.kube", "Setting permissions")
        run_cmd(client, "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl get nodes", "Verifying K3s")
    else:
        code, out, _ = run_cmd(client, "systemctl is-active k3s", "K3s service status")
        if "active" not in out:
            run_sudo(client, "systemctl start k3s", "Starting K3s")
        run_cmd(client, "kubectl get nodes 2>/dev/null || echo 'kubectl not configured'", "K3s nodes")
    
    # ========================================
    # PHASE 4: Deploy K8s Resources
    # ========================================
    print("\n" + "=" * 70)
    print("  PHASE 4: KUBERNETES RESOURCES")
    print("=" * 70)
    
    code, out, _ = run_cmd(client, "kubectl get nodes 2>/dev/null", "Checking kubectl access", check_exit=False)
    
    if "Ready" in out or "NotReady" in out:
        run_cmd(client, f"kubectl apply -f {WEBSITE_DIR}/infra/k8s/namespaces.yaml 2>/dev/null || echo 'Namespaces skipped'",
            "Applying namespaces")
        run_cmd(client, f"ls -la {WEBSITE_DIR}/infra/k8s/storage/ 2>/dev/null || echo 'No storage dir'",
            "Checking storage manifests")
        run_cmd(client, f"kubectl apply -f {WEBSITE_DIR}/infra/k8s/storage/ 2>/dev/null || echo 'Storage skipped'",
            "Applying storage PVCs")
    else:
        print("[INFO] Kubectl not available - skipping K8s deployments")
    
    # ========================================
    # PHASE 5: Deploy Docker Services
    # ========================================
    print("\n" + "=" * 70)
    print("  PHASE 5: DOCKER SERVICES")
    print("=" * 70)
    
    # Check if E2CC directory exists
    code, out, _ = run_cmd(client, f"ls -la {WEBSITE_DIR}/services/e2cc/ 2>/dev/null || echo 'No E2CC dir'",
        "Checking E2CC directory")
    
    if "No E2CC dir" not in out:
        run_cmd(client, f"cd {WEBSITE_DIR}/services/e2cc && docker compose down 2>/dev/null || echo 'No running containers'",
            "Stopping existing E2CC containers")
        
        # Build and start
        code, out, _ = run_cmd(client, 
            f"cd {WEBSITE_DIR}/services/e2cc && docker compose up -d --build 2>&1",
            "Building and starting E2CC services", timeout=300)
    else:
        print("[INFO] E2CC directory not found in repo")
    
    # Check running containers
    run_cmd(client, "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'", "Running containers")
    
    # ========================================
    # PHASE 6: Final Status
    # ========================================
    print("\n" + "=" * 70)
    print("  DEPLOYMENT SUMMARY")
    print("=" * 70)
    
    run_cmd(client, f"cd {WEBSITE_DIR} && git log -1 --format='Commit: %h%nDate: %ci%nMessage: %s'", 
        "Deployed Version")
    
    # Check services
    run_cmd(client, "curl -s http://localhost:8210/health 2>/dev/null || echo 'API Gateway: Not running'",
        "API Gateway Health")
    run_cmd(client, "curl -s http://localhost:8300/health 2>/dev/null || echo 'DFM: Not running'",
        "DFM Health")
    
    client.close()
    
    print("\n" + "=" * 70)
    print("  DEPLOYMENT COMPLETE")
    print("=" * 70)
    
    if not gpu_available:
        print("\n[ACTION REQUIRED] GPU Passthrough")
        print("-" * 50)
        print("The RTX 5090 GPU is NOT passed through to this VM.")
        print("To enable GPU passthrough:")
        print("  1. SSH to Proxmox host")
        print("  2. Find GPU PCI address: lspci | grep NVIDIA")
        print("  3. Add to VM: qm set <vmid> -hostpci0 <addr>,pcie=1")
        print("  4. Reboot VM")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
