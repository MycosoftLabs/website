#!/bin/bash
# Deploy All Earth-2 Models - February 5, 2026
# Deploys all Earth-2 AI weather models to Kubernetes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="${SCRIPT_DIR}/earth2-models"
SERVICES_DIR="${SCRIPT_DIR}/earth2-services"

echo "============================================="
echo "  Earth-2 Models Deployment"
echo "  Date: $(date)"
echo "============================================="

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo "ERROR: kubectl not found"
    exit 1
fi

# Check cluster connection
echo "[1/4] Verifying cluster connection..."
kubectl cluster-info || { echo "ERROR: Cannot connect to cluster"; exit 1; }

# Apply namespaces if not exists
echo "[2/4] Ensuring namespaces exist..."
kubectl apply -f "${SCRIPT_DIR}/namespaces.yaml"

# Deploy always-on models (FCN3, StormScope)
echo "[3/4] Deploying always-on models..."
kubectl apply -f "${MODELS_DIR}/base-deployment.yaml"
kubectl apply -f "${MODELS_DIR}/fcn3-deployment.yaml"
kubectl apply -f "${MODELS_DIR}/stormscope-deployment.yaml"

# Deploy on-demand models (replicas=0)
echo "[4/4] Deploying on-demand models..."
kubectl apply -f "${MODELS_DIR}/atlas-deployment.yaml"
kubectl apply -f "${MODELS_DIR}/corrdiff-deployment.yaml"
kubectl apply -f "${MODELS_DIR}/pangu-deployment.yaml"
kubectl apply -f "${MODELS_DIR}/aurora-deployment.yaml"
kubectl apply -f "${MODELS_DIR}/fuxi-deployment.yaml"
kubectl apply -f "${MODELS_DIR}/graphcast-deployment.yaml"
kubectl apply -f "${MODELS_DIR}/stormcast-deployment.yaml"
kubectl apply -f "${MODELS_DIR}/precipitation-afno-deployment.yaml"
kubectl apply -f "${MODELS_DIR}/sfno-deployment.yaml"
kubectl apply -f "${MODELS_DIR}/tc-tracker-deployment.yaml"

# Deploy services
echo "[5/5] Deploying services..."
kubectl apply -f "${SERVICES_DIR}/dfm-deployment.yaml"
kubectl apply -f "${SERVICES_DIR}/model-orchestrator-deployment.yaml"

# Wait for always-on models
echo ""
echo "Waiting for always-on models to be ready..."
kubectl wait --for=condition=available --timeout=300s \
    deployment/earth2-fcn3 -n earth2-models || echo "FCN3 not ready (may need GPU)"
kubectl wait --for=condition=available --timeout=300s \
    deployment/earth2-stormscope -n earth2-models || echo "StormScope not ready (may need GPU)"

# Summary
echo ""
echo "============================================="
echo "  Deployment Summary"
echo "============================================="
echo ""
echo "Always-on models (GPU required):"
kubectl get deployments -n earth2-models -l tier=always-on -o wide 2>/dev/null || echo "  (none deployed)"
echo ""
echo "On-demand models (scaled to 0):"
kubectl get deployments -n earth2-models -l tier=on-demand -o wide 2>/dev/null || echo "  (none deployed)"
echo ""
echo "Services:"
kubectl get deployments -n earth2-services -o wide 2>/dev/null || echo "  (none deployed)"
echo ""
echo "============================================="
echo "  Deployment Complete!"
echo "============================================="
echo ""
echo "To scale up an on-demand model:"
echo "  kubectl scale deployment/earth2-pangu -n earth2-models --replicas=1"
echo ""
echo "Or use the orchestrator API:"
echo "  curl -X POST http://model-orchestrator:8320/scale -d '{\"model\":\"pangu\",\"replicas\":1}'"
echo ""
