#!/bin/bash
# Deploy Earth-2 RTX to Sandbox VM - February 5, 2026
# Automated deployment script for 192.168.0.187

set -e

SANDBOX_VM="192.168.0.187"
SSH_USER="mycosoft"
WEBSITE_DIR="/opt/mycosoft/website"

echo "============================================="
echo "  Earth-2 RTX Deployment to Sandbox VM"
echo "  Target: ${SSH_USER}@${SANDBOX_VM}"
echo "  Date: $(date)"
echo "============================================="

# Check SSH connectivity
echo ""
echo "[1/8] Checking SSH connectivity..."
ssh -o ConnectTimeout=10 ${SSH_USER}@${SANDBOX_VM} "echo 'SSH connection successful'" || {
    echo "ERROR: Cannot connect to ${SANDBOX_VM}"
    exit 1
}

# Pull latest code
echo ""
echo "[2/8] Pulling latest code..."
ssh ${SSH_USER}@${SANDBOX_VM} "cd ${WEBSITE_DIR} && git fetch origin && git reset --hard origin/main"

# Check GPU availability
echo ""
echo "[3/8] Checking GPU availability..."
ssh ${SSH_USER}@${SANDBOX_VM} "nvidia-smi --query-gpu=name,memory.total --format=csv" || {
    echo "WARNING: GPU not detected. Passthrough may need configuration."
}

# Deploy Kubernetes namespaces and storage
echo ""
echo "[4/8] Deploying Kubernetes resources..."
ssh ${SSH_USER}@${SANDBOX_VM} "cd ${WEBSITE_DIR} && kubectl apply -f infra/k8s/namespaces.yaml" || {
    echo "WARNING: Namespace deployment had issues"
}
ssh ${SSH_USER}@${SANDBOX_VM} "cd ${WEBSITE_DIR} && kubectl apply -f infra/k8s/storage/earth2-pvc.yaml" || {
    echo "WARNING: PVC deployment had issues"
}

# Deploy GPU Operator (if not already deployed)
echo ""
echo "[5/8] Checking GPU Operator..."
ssh ${SSH_USER}@${SANDBOX_VM} "kubectl get pods -n gpu-operator 2>/dev/null | head -5" || {
    echo "GPU Operator not found, deploying..."
    ssh ${SSH_USER}@${SANDBOX_VM} "cd ${WEBSITE_DIR} && chmod +x infra/k8s/deploy-gpu-operator.sh && ./infra/k8s/deploy-gpu-operator.sh" || {
        echo "WARNING: GPU Operator deployment had issues"
    }
}

# Deploy Earth-2 Models
echo ""
echo "[6/8] Deploying Earth-2 Models..."
ssh ${SSH_USER}@${SANDBOX_VM} "cd ${WEBSITE_DIR} && chmod +x infra/k8s/deploy-all-models.sh && ./infra/k8s/deploy-all-models.sh" || {
    echo "WARNING: Model deployment had issues"
}

# Deploy E2CC (Omniverse)
echo ""
echo "[7/8] Deploying E2CC (Omniverse Kit)..."
ssh ${SSH_USER}@${SANDBOX_VM} "cd ${WEBSITE_DIR}/services/e2cc && docker compose down 2>/dev/null; docker compose up -d --build" || {
    echo "WARNING: E2CC deployment had issues"
}

# Wait for services to start
echo ""
echo "[8/8] Waiting for services to initialize..."
sleep 30

# Health checks
echo ""
echo "============================================="
echo "  Deployment Health Checks"
echo "============================================="

# Check K8s pods
echo ""
echo "Kubernetes Pods (earth2-models):"
ssh ${SSH_USER}@${SANDBOX_VM} "kubectl get pods -n earth2-models 2>/dev/null" || echo "Could not get pods"

echo ""
echo "Kubernetes Pods (earth2-services):"
ssh ${SSH_USER}@${SANDBOX_VM} "kubectl get pods -n earth2-services 2>/dev/null" || echo "Could not get pods"

echo ""
echo "Docker Containers:"
ssh ${SSH_USER}@${SANDBOX_VM} "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" || echo "Could not get containers"

# GPU Status
echo ""
echo "GPU Status:"
ssh ${SSH_USER}@${SANDBOX_VM} "nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu --format=csv" || echo "GPU not available"

echo ""
echo "============================================="
echo "  Deployment Complete!"
echo "============================================="
echo ""
echo "Next steps:"
echo "  1. Run remote tests: python scripts/run_all_tests.py --remote --host ${SANDBOX_VM}"
echo "  2. Check service health: curl http://${SANDBOX_VM}:8210/health"
echo "  3. View E2CC stream: http://${SANDBOX_VM}:8211"
echo ""
