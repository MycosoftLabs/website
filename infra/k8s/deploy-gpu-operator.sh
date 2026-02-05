#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Deploy NVIDIA GPU Operator to K3s - February 5, 2026
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_info() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
log_step() { echo -e "\033[0;34m[STEP]\033[0m $1"; }

# Check prerequisites
check_prereqs() {
    log_step "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        echo "kubectl not found. Is K3s installed?"
        exit 1
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        echo "helm not found. Installing..."
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    fi
    
    # Check node is ready
    kubectl get nodes
    
    # Check if NVIDIA GPU is visible
    if lspci | grep -i nvidia > /dev/null; then
        log_info "NVIDIA GPU detected"
    else
        echo "No NVIDIA GPU detected"
        exit 1
    fi
    
    # Check nvidia-smi
    if nvidia-smi > /dev/null 2>&1; then
        log_info "NVIDIA driver working"
        nvidia-smi --query-gpu=name,memory.total --format=csv
    else
        echo "nvidia-smi not working - driver not installed or GPU issue"
        exit 1
    fi
}

# Create namespaces
create_namespaces() {
    log_step "Creating namespaces..."
    kubectl apply -f "${SCRIPT_DIR}/namespaces.yaml"
}

# Create storage
create_storage() {
    log_step "Creating storage resources..."
    
    # Create directories on host
    sudo mkdir -p /opt/earth2/{models,data,omniverse,cache}
    sudo chmod -R 777 /opt/earth2
    
    kubectl apply -f "${SCRIPT_DIR}/storage/earth2-pvc.yaml"
}

# Add NVIDIA Helm repo
add_helm_repo() {
    log_step "Adding NVIDIA Helm repository..."
    helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
    helm repo update
}

# Install GPU Operator
install_gpu_operator() {
    log_step "Installing NVIDIA GPU Operator..."
    
    # Check if already installed
    if helm status gpu-operator -n gpu-operator > /dev/null 2>&1; then
        log_info "GPU Operator already installed, upgrading..."
        helm upgrade gpu-operator nvidia/gpu-operator \
            --namespace gpu-operator \
            -f "${SCRIPT_DIR}/gpu-operator-values.yaml" \
            --wait
    else
        helm install gpu-operator nvidia/gpu-operator \
            --namespace gpu-operator \
            --create-namespace \
            -f "${SCRIPT_DIR}/gpu-operator-values.yaml" \
            --wait --timeout 10m
    fi
}

# Wait for operator pods
wait_for_operator() {
    log_step "Waiting for GPU Operator pods..."
    
    kubectl wait --for=condition=Ready pods -l app=gpu-operator -n gpu-operator --timeout=300s || true
    
    # Wait for device plugin
    echo "Waiting for device plugin daemonset..."
    sleep 30
    
    kubectl get pods -n gpu-operator
}

# Verify GPU resources
verify_gpu() {
    log_step "Verifying GPU resources..."
    
    # Check for nvidia.com/gpu resources
    echo ""
    echo "Node GPU Resources:"
    kubectl get nodes -o=custom-columns='NODE:.metadata.name,GPU:.status.capacity.nvidia\.com/gpu'
    
    echo ""
    echo "GPU Operator Pods:"
    kubectl get pods -n gpu-operator
    
    # Run test pod
    echo ""
    echo "Running GPU test pod..."
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: gpu-verify
  namespace: earth2-models
spec:
  restartPolicy: Never
  containers:
  - name: cuda
    image: nvidia/cuda:12.4.0-base-ubuntu22.04
    command: ["nvidia-smi"]
    resources:
      limits:
        nvidia.com/gpu: 1
EOF

    kubectl wait --for=condition=Ready pod/gpu-verify -n earth2-models --timeout=120s || true
    sleep 5
    
    echo ""
    echo "GPU Test Output:"
    kubectl logs gpu-verify -n earth2-models || echo "Pod may still be starting..."
    
    kubectl delete pod gpu-verify -n earth2-models --ignore-not-found
}

# Main
main() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo " NVIDIA GPU Operator Deployment for Earth-2"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo ""
    
    check_prereqs
    create_namespaces
    create_storage
    add_helm_repo
    install_gpu_operator
    wait_for_operator
    verify_gpu
    
    echo ""
    log_info "═══════════════════════════════════════════════════════════════════════════════"
    log_info "GPU Operator deployment complete!"
    log_info ""
    log_info "Next: Deploy Earth-2 inference services"
    log_info "  kubectl apply -f earth2-models/"
    log_info "═══════════════════════════════════════════════════════════════════════════════"
}

main "$@"
