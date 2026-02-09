#!/bin/bash
# Install NVIDIA GPU Operator for Kubernetes
# Run as root on Sandbox VM (192.168.0.187)

set -e

echo "=============================================="
echo "  NVIDIA GPU Operator Installation for K8s"
echo "=============================================="

# Check kubectl
if ! command -v kubectl &>/dev/null; then
    echo "[ERROR] kubectl not found"
    exit 1
fi

# Check GPU
if ! nvidia-smi &>/dev/null; then
    echo "[ERROR] nvidia-smi failed - GPU not working"
    exit 1
fi

# Install Helm if not present
echo ""
echo ">>> Checking Helm..."
if ! command -v helm &>/dev/null; then
    echo "Installing Helm..."
    curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi
helm version

# Add NVIDIA Helm repo
echo ""
echo ">>> Adding NVIDIA Helm repository..."
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update

# Create namespace
echo ""
echo ">>> Creating gpu-operator namespace..."
kubectl create namespace gpu-operator --dry-run=client -o yaml | kubectl apply -f -

# Install GPU Operator
echo ""
echo ">>> Installing NVIDIA GPU Operator..."
helm upgrade --install gpu-operator nvidia/gpu-operator \
    --namespace gpu-operator \
    --set driver.enabled=false \
    --set toolkit.enabled=true \
    --set devicePlugin.enabled=true \
    --set migManager.enabled=false \
    --set dcgm.enabled=false \
    --set dcgmExporter.enabled=false \
    --set gfd.enabled=true \
    --wait --timeout 10m

# Wait for pods
echo ""
echo ">>> Waiting for GPU Operator pods..."
kubectl wait --for=condition=ready pod -l app=nvidia-device-plugin-daemonset \
    -n gpu-operator --timeout=300s || true

# Check pods
echo ""
echo ">>> GPU Operator pods:"
kubectl get pods -n gpu-operator

# Verify GPU resources
echo ""
echo ">>> Checking GPU resources on nodes..."
kubectl get nodes -o=custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\\.com/gpu

# Create test pod
echo ""
echo ">>> Creating GPU test pod..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
  namespace: default
spec:
  restartPolicy: Never
  containers:
  - name: cuda-test
    image: nvidia/cuda:12.8.0-base-ubuntu24.04
    command: ["nvidia-smi"]
    resources:
      limits:
        nvidia.com/gpu: 1
EOF

echo "Waiting for test pod..."
kubectl wait --for=condition=ready pod/gpu-test --timeout=120s || true
kubectl logs gpu-test 2>/dev/null || echo "Test pod not ready yet"
kubectl delete pod gpu-test --ignore-not-found

echo ""
echo "=============================================="
echo "  GPU Operator Installation Complete"
echo "=============================================="
echo ""
echo "GPU is now available for Kubernetes workloads"
echo ""
echo "To use GPU in a pod, add to container spec:"
echo "  resources:"
echo "    limits:"
echo "      nvidia.com/gpu: 1"
