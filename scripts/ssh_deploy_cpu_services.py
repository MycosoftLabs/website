#!/usr/bin/env python3
"""
Deploy CPU-only services to Sandbox VM
These services work without GPU
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

def run_cmd(client, cmd, desc="", timeout=120):
    if desc:
        print(f"\n>>> {desc}")
    print(f"$ {cmd}")
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
    print("  Deploy CPU-Only Services")
    print("=" * 60)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    print("Connected!")
    
    # Check kubectl
    run_cmd(client, "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl get nodes", "K8s status")
    
    # Deploy DFM (Data Federation Mesh) - CPU only
    print("\n" + "=" * 60)
    print("  Deploying Data Federation Mesh (CPU)")
    print("=" * 60)
    
    run_cmd(client, 
        f"export KUBECONFIG=/home/mycosoft/.kube/config && kubectl apply -f {WEBSITE_DIR}/infra/k8s/earth2-services/dfm-deployment.yaml 2>&1 || echo 'DFM deployment skipped'",
        "Deploy DFM")
    
    # Deploy Model Orchestrator - CPU only (coordinates GPU on Windows)
    run_cmd(client,
        f"export KUBECONFIG=/home/mycosoft/.kube/config && kubectl apply -f {WEBSITE_DIR}/infra/k8s/earth2-services/model-orchestrator-deployment.yaml 2>&1 || echo 'Orchestrator deployment skipped'",
        "Deploy Orchestrator")
    
    # Check deployments
    run_cmd(client,
        "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl get pods -n earth2-services 2>&1",
        "Earth2 Services Pods")
    
    # Deploy simple API Gateway via Docker (since E2CC needs GPU)
    print("\n" + "=" * 60)
    print("  Deploying API Gateway (Docker)")
    print("=" * 60)
    
    # Create a simple API gateway Dockerfile
    api_gateway_setup = '''
cd /home/mycosoft/mycosoft/website/services/e2cc/api-gateway && \\
docker build -t earth2-api-gateway:latest . 2>&1 && \\
docker run -d --name earth2-api-gateway -p 8210:8210 --restart unless-stopped earth2-api-gateway:latest 2>&1 || \\
docker start earth2-api-gateway 2>&1
'''
    run_cmd(client, api_gateway_setup, "Build and run API Gateway", timeout=180)
    
    # Final status
    print("\n" + "=" * 60)
    print("  Deployment Status")
    print("=" * 60)
    
    run_cmd(client, "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}' | head -12", "Docker containers")
    run_cmd(client, "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl get pods --all-namespaces | head -15", "K8s pods")
    
    # Test services
    print("\n" + "=" * 60)
    print("  Testing Services")
    print("=" * 60)
    
    run_cmd(client, "curl -s http://localhost:8210/health 2>/dev/null || echo 'API Gateway: not responding'", "API Gateway health")
    run_cmd(client, "curl -s http://localhost:8300/health 2>/dev/null || echo 'DFM: not responding'", "DFM health")
    
    client.close()
    
    print("\n" + "=" * 60)
    print("  CPU Services Deployment Complete")
    print("=" * 60)
    print("\nFor GPU services (Earth2Studio inference), run on Windows Dev PC:")
    print("  cd C:\\Users\\admin2\\Desktop\\MYCOSOFT\\CODE\\WEBSITE\\website\\services\\earth2-inference")
    print("  pip install -r requirements.txt")
    print("  python inference_server.py")

if __name__ == "__main__":
    main()
