#!/usr/bin/env python3
"""
SSH Deployment Script for Earth-2 RTX
Connects to Sandbox VM and deploys all services
"""

import paramiko
import sys
import time

# Configuration
VM_HOST = "192.168.0.187"
VM_USER = "mycosoft"
VM_PASS = "Mushroom1!Mushroom1!"
WEBSITE_DIR = "/home/mycosoft/website"

def create_ssh_client():
    """Create and return SSH client connected to VM"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {VM_USER}@{VM_HOST}...")
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    print("Connected successfully!")
    return client

def run_command(client, cmd, description="", check_exit=True):
    """Run command on remote host and return output"""
    if description:
        print(f"\n>>> {description}")
    print(f"$ {cmd}")
    
    stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
    exit_code = stdout.channel.recv_exit_status()
    
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    
    if out:
        print(out)
    if err and exit_code != 0:
        print(f"STDERR: {err}")
    
    if check_exit and exit_code != 0:
        print(f"[WARNING] Command exited with code {exit_code}")
    
    return exit_code, out, err

def main():
    print("=" * 60)
    print("  Earth-2 RTX Deployment to Sandbox VM")
    print("=" * 60)
    
    try:
        client = create_ssh_client()
        
        # 1. Check hostname
        run_command(client, "hostname", "Checking hostname")
        
        # 2. Check GPU
        print("\n" + "=" * 60)
        print("  GPU STATUS")
        print("=" * 60)
        code, out, _ = run_command(client, 
            "nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv 2>/dev/null || echo 'GPU not available'",
            "Checking NVIDIA GPU")
        
        if "not available" in out:
            print("[WARNING] GPU not detected - continuing anyway")
        
        # 3. Pull latest code
        print("\n" + "=" * 60)
        print("  PULLING LATEST CODE")
        print("=" * 60)
        run_command(client, f"cd {WEBSITE_DIR} && git fetch origin", "Fetching from origin")
        run_command(client, f"cd {WEBSITE_DIR} && git reset --hard origin/main", "Resetting to origin/main")
        run_command(client, f"cd {WEBSITE_DIR} && git log -1 --oneline", "Latest commit")
        
        # 4. Check K8s
        print("\n" + "=" * 60)
        print("  KUBERNETES STATUS")
        print("=" * 60)
        code, out, _ = run_command(client, "kubectl get nodes 2>/dev/null || echo 'K8s not available'", 
            "Checking K8s nodes", check_exit=False)
        
        k8s_available = "not available" not in out
        
        if k8s_available:
            # Deploy K8s resources
            run_command(client, f"cd {WEBSITE_DIR} && kubectl apply -f infra/k8s/namespaces.yaml 2>/dev/null",
                "Applying namespaces", check_exit=False)
            run_command(client, f"cd {WEBSITE_DIR} && kubectl apply -f infra/k8s/storage/earth2-pvc.yaml 2>/dev/null",
                "Applying storage PVCs", check_exit=False)
            
            # Check GPU operator
            code, out, _ = run_command(client, "kubectl get pods -n gpu-operator 2>/dev/null | head -5",
                "Checking GPU Operator", check_exit=False)
            
            # Deploy models
            run_command(client, f"cd {WEBSITE_DIR} && chmod +x infra/k8s/deploy-all-models.sh 2>/dev/null",
                "Making deploy script executable", check_exit=False)
            run_command(client, f"cd {WEBSITE_DIR}/infra/k8s && ./deploy-all-models.sh 2>/dev/null || echo 'Model deployment skipped'",
                "Deploying Earth-2 models", check_exit=False)
        else:
            print("[INFO] Kubernetes not available - skipping K8s deployments")
        
        # 5. Deploy Docker services
        print("\n" + "=" * 60)
        print("  DOCKER SERVICES")
        print("=" * 60)
        
        code, out, _ = run_command(client, "docker --version 2>/dev/null || echo 'Docker not available'",
            "Checking Docker", check_exit=False)
        
        docker_available = "not available" not in out
        
        if docker_available:
            run_command(client, f"cd {WEBSITE_DIR}/services/e2cc && docker compose down 2>/dev/null",
                "Stopping existing E2CC containers", check_exit=False)
            run_command(client, f"cd {WEBSITE_DIR}/services/e2cc && docker compose up -d --build 2>/dev/null || echo 'E2CC deployment skipped'",
                "Starting E2CC services", check_exit=False)
            
            # Check containers
            run_command(client, "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}' 2>/dev/null",
                "Running containers")
        else:
            print("[INFO] Docker not available - skipping container deployments")
        
        # 6. Final status
        print("\n" + "=" * 60)
        print("  DEPLOYMENT SUMMARY")
        print("=" * 60)
        
        if k8s_available:
            run_command(client, "kubectl get pods -n earth2-models 2>/dev/null || echo 'No pods'",
                "Earth-2 Model Pods", check_exit=False)
            run_command(client, "kubectl get pods -n earth2-services 2>/dev/null || echo 'No pods'",
                "Earth-2 Service Pods", check_exit=False)
        
        run_command(client, "nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu --format=csv 2>/dev/null || echo 'GPU status unavailable'",
            "GPU Status")
        
        client.close()
        
        print("\n" + "=" * 60)
        print("  DEPLOYMENT COMPLETE")
        print("=" * 60)
        print(f"\nServices should be available at:")
        print(f"  - API Gateway:    http://{VM_HOST}:8210")
        print(f"  - E2CC:           http://{VM_HOST}:8211")
        print(f"  - Signaling:      ws://{VM_HOST}:8212")
        print(f"  - DFM:            http://{VM_HOST}:8300")
        print(f"  - Orchestrator:   http://{VM_HOST}:8320")
        
        return 0
        
    except paramiko.AuthenticationException:
        print("[ERROR] Authentication failed - check credentials")
        return 1
    except paramiko.SSHException as e:
        print(f"[ERROR] SSH error: {e}")
        return 1
    except Exception as e:
        print(f"[ERROR] {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
