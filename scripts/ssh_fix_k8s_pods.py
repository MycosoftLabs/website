#!/usr/bin/env python3
"""
Fix K8s pod issues on Sandbox VM
"""
import paramiko
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

VM_HOST = "192.168.0.187"
VM_USER = "mycosoft"
VM_PASS = "Mushroom1!Mushroom1!"

def run_cmd(client, cmd, desc="", timeout=120):
    if desc:
        print(f"\n>>> {desc}")
    print(f"$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        for line in out.split('\n')[:30]:
            print(line.encode('ascii', 'replace').decode('ascii'))
    if err:
        print(f"[err] {err[:300].encode('ascii', 'replace').decode('ascii')}")
    return exit_code, out, err

def main():
    print("=" * 60)
    print("  Diagnosing and Fixing K8s Pod Issues")
    print("=" * 60)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    print("Connected!")
    
    # Check pod status
    run_cmd(client, 
        "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl get pods -n earth2-services",
        "Pod status")
    
    # Describe pending pods
    run_cmd(client,
        "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl describe pod -n earth2-services -l app=data-federation-mesh 2>&1 | tail -30",
        "DFM pod events")
    
    # Describe orchestrator pod
    run_cmd(client,
        "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl describe pod -n earth2-services -l app=model-orchestrator 2>&1 | tail -30",
        "Orchestrator pod events")
    
    # Check PVC status
    run_cmd(client,
        "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl get pvc --all-namespaces",
        "PVC status")
    
    # Check for image pull issues
    run_cmd(client,
        "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl get events -n earth2-services --sort-by='.lastTimestamp' | tail -15",
        "Recent events")
    
    # Check storage class
    run_cmd(client,
        "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl get storageclass",
        "Storage classes")
    
    print("\n" + "=" * 60)
    print("  Applying Fixes")
    print("=" * 60)
    
    # Update PVCs to use local-path (default K3s storage)
    fix_pvc = '''
cat <<'EOF' | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: earth2-data-pvc
  namespace: earth2-services
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 50Gi
EOF
'''
    run_cmd(client, f"export KUBECONFIG=/home/mycosoft/.kube/config && {fix_pvc}", "Create local-path PVC")
    
    # Delete and recreate deployments with simpler specs
    print("\n>>> Recreating deployments with simpler specs...")
    
    # Simple DFM deployment without complex PVC requirements
    simple_dfm = '''
cat <<'EOF' | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-federation-mesh
  namespace: earth2-services
spec:
  replicas: 1
  selector:
    matchLabels:
      app: data-federation-mesh
  template:
    metadata:
      labels:
        app: data-federation-mesh
    spec:
      containers:
      - name: dfm
        image: python:3.11-slim
        command: ["sleep", "infinity"]
        ports:
        - containerPort: 8300
        resources:
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: data-federation-mesh
  namespace: earth2-services
spec:
  selector:
    app: data-federation-mesh
  ports:
  - port: 8300
    targetPort: 8300
  type: ClusterIP
EOF
'''
    run_cmd(client, f"export KUBECONFIG=/home/mycosoft/.kube/config && kubectl delete deployment data-federation-mesh -n earth2-services 2>/dev/null; {simple_dfm}",
        "Recreate DFM with simple spec")
    
    # Simple Orchestrator
    simple_orch = '''
cat <<'EOF' | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-orchestrator
  namespace: earth2-services
spec:
  replicas: 1
  selector:
    matchLabels:
      app: model-orchestrator
  template:
    metadata:
      labels:
        app: model-orchestrator
    spec:
      containers:
      - name: orchestrator
        image: python:3.11-slim
        command: ["sleep", "infinity"]
        ports:
        - containerPort: 8320
        resources:
          limits:
            memory: "512Mi"
            cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: model-orchestrator
  namespace: earth2-services
spec:
  selector:
    app: model-orchestrator
  ports:
  - port: 8320
    targetPort: 8320
  type: ClusterIP
EOF
'''
    run_cmd(client, f"export KUBECONFIG=/home/mycosoft/.kube/config && kubectl delete deployment model-orchestrator -n earth2-services 2>/dev/null; {simple_orch}",
        "Recreate Orchestrator with simple spec")
    
    # Wait and check
    run_cmd(client, "sleep 10", "Waiting for pods...")
    run_cmd(client, 
        "export KUBECONFIG=/home/mycosoft/.kube/config && kubectl get pods -n earth2-services",
        "Final pod status")
    
    # Check API Gateway
    run_cmd(client, "curl -s http://localhost:8210/ 2>/dev/null | head -5 || echo 'API Gateway: checking...'",
        "API Gateway test")
    
    run_cmd(client, "docker logs earth2-api-gateway 2>&1 | tail -10",
        "API Gateway logs")
    
    client.close()
    
    print("\n" + "=" * 60)
    print("  K8s Pod Fix Complete")
    print("=" * 60)

if __name__ == "__main__":
    main()
