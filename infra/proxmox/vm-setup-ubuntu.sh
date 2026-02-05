#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Ubuntu 22.04 VM Setup for NVIDIA Earth-2 - February 5, 2026
# 
# Run this script INSIDE the Sandbox VM after GPU passthrough is configured
# Installs: NVIDIA Drivers, CUDA, Container Toolkit, K3s, Helm
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════

NVIDIA_DRIVER_VERSION="560"
CUDA_VERSION="12-8"
K3S_VERSION="v1.29.0+k3s1"

# ═══════════════════════════════════════════════════════════════════════════════
# Step 1: System Update
# ═══════════════════════════════════════════════════════════════════════════════

system_update() {
    log_step "Updating system packages..."
    
    apt-get update
    apt-get upgrade -y
    apt-get install -y \
        build-essential \
        dkms \
        linux-headers-$(uname -r) \
        curl \
        wget \
        git \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        software-properties-common \
        jq \
        htop \
        nvtop \
        python3 \
        python3-pip \
        python3-venv
    
    log_info "System updated"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 2: Install NVIDIA Drivers
# ═══════════════════════════════════════════════════════════════════════════════

install_nvidia_drivers() {
    log_step "Installing NVIDIA drivers..."
    
    # Check if GPU is detected
    if ! lspci | grep -i nvidia > /dev/null; then
        log_error "No NVIDIA GPU detected. Check GPU passthrough configuration."
        exit 1
    fi
    
    log_info "NVIDIA GPU detected:"
    lspci | grep -i nvidia
    
    # Remove any existing NVIDIA installations
    apt-get purge -y 'nvidia-*' 'libnvidia-*' 2>/dev/null || true
    apt-get autoremove -y
    
    # Add NVIDIA driver repository
    add-apt-repository -y ppa:graphics-drivers/ppa
    apt-get update
    
    # Install driver
    apt-get install -y nvidia-driver-${NVIDIA_DRIVER_VERSION}
    
    log_info "NVIDIA driver ${NVIDIA_DRIVER_VERSION} installed"
    log_warn "A REBOOT is required before continuing!"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 3: Install CUDA Toolkit
# ═══════════════════════════════════════════════════════════════════════════════

install_cuda() {
    log_step "Installing CUDA ${CUDA_VERSION}..."
    
    # Verify driver is working
    if ! nvidia-smi > /dev/null 2>&1; then
        log_error "nvidia-smi not working. Reboot required or driver issue."
        exit 1
    fi
    
    log_info "GPU Status:"
    nvidia-smi
    
    # Add NVIDIA CUDA repository
    wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
    dpkg -i cuda-keyring_1.1-1_all.deb
    rm cuda-keyring_1.1-1_all.deb
    
    apt-get update
    apt-get install -y cuda-toolkit-${CUDA_VERSION}
    
    # Add CUDA to PATH
    echo 'export PATH=/usr/local/cuda/bin:$PATH' >> /etc/profile.d/cuda.sh
    echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> /etc/profile.d/cuda.sh
    
    source /etc/profile.d/cuda.sh
    
    log_info "CUDA installed"
    nvcc --version || log_warn "nvcc not in path yet, source /etc/profile.d/cuda.sh"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 4: Install NVIDIA Container Toolkit
# ═══════════════════════════════════════════════════════════════════════════════

install_container_toolkit() {
    log_step "Installing NVIDIA Container Toolkit..."
    
    # Add repository
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
        gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    
    curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
        sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
        tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
    
    apt-get update
    apt-get install -y nvidia-container-toolkit
    
    # Configure for containerd (used by K3s)
    nvidia-ctk runtime configure --runtime=containerd
    
    log_info "NVIDIA Container Toolkit installed"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 5: Install K3s
# ═══════════════════════════════════════════════════════════════════════════════

install_k3s() {
    log_step "Installing K3s Kubernetes..."
    
    # Disable swap (required for Kubernetes)
    swapoff -a
    sed -i '/swap/d' /etc/fstab
    
    # Install K3s with containerd
    curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${K3S_VERSION}" sh -s - \
        --write-kubeconfig-mode 644 \
        --disable traefik \
        --disable servicelb
    
    # Wait for K3s to start
    sleep 10
    
    # Configure kubectl for current user
    mkdir -p ~/.kube
    cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
    chmod 600 ~/.kube/config
    
    # Set KUBECONFIG globally
    echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> /etc/profile.d/k3s.sh
    
    log_info "K3s installed"
    kubectl get nodes
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 6: Install Helm
# ═══════════════════════════════════════════════════════════════════════════════

install_helm() {
    log_step "Installing Helm..."
    
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    
    # Add common repos
    helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    
    log_info "Helm installed"
    helm version
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 7: Configure containerd for NVIDIA
# ═══════════════════════════════════════════════════════════════════════════════

configure_containerd() {
    log_step "Configuring containerd for NVIDIA runtime..."
    
    # Create containerd config
    mkdir -p /etc/rancher/k3s/
    cat > /etc/rancher/k3s/registries.yaml << 'EOF'
# Registry configuration for K3s
EOF

    # Configure NVIDIA runtime for containerd
    cat > /var/lib/rancher/k3s/agent/etc/containerd/config.toml.tmpl << 'EOF'
version = 2

[plugins]
  [plugins."io.containerd.grpc.v1.cri"]
    [plugins."io.containerd.grpc.v1.cri".containerd]
      default_runtime_name = "nvidia"
      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.nvidia]
          runtime_type = "io.containerd.runc.v2"
          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.nvidia.options]
            BinaryName = "/usr/bin/nvidia-container-runtime"
EOF

    # Restart K3s to pick up changes
    systemctl restart k3s
    
    log_info "containerd configured for NVIDIA runtime"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 8: Test GPU in Container
# ═══════════════════════════════════════════════════════════════════════════════

test_gpu() {
    log_step "Testing GPU access in container..."
    
    # Wait for node to be ready
    kubectl wait --for=condition=Ready node --all --timeout=60s
    
    # Run NVIDIA SMI test pod
    cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
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

    log_info "Waiting for GPU test pod..."
    kubectl wait --for=condition=Ready pod/gpu-test --timeout=120s || true
    sleep 5
    
    kubectl logs gpu-test
    kubectl delete pod gpu-test
    
    log_info "GPU test complete"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 9: Create Earth-2 Namespace and Storage
# ═══════════════════════════════════════════════════════════════════════════════

setup_earth2_namespace() {
    log_step "Setting up Earth-2 namespaces and storage..."
    
    # Create namespaces
    kubectl create namespace earth2-models --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace earth2-services --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace gpu-operator --dry-run=client -o yaml | kubectl apply -f -
    
    # Label namespaces
    kubectl label namespace earth2-models app.kubernetes.io/part-of=earth2 --overwrite
    kubectl label namespace earth2-services app.kubernetes.io/part-of=earth2 --overwrite
    
    # Create storage directory for Earth-2 model cache
    mkdir -p /opt/earth2/cache
    mkdir -p /opt/earth2/data
    chmod -R 777 /opt/earth2
    
    # Create PersistentVolume for local storage
    cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: PersistentVolume
metadata:
  name: earth2-cache-pv
spec:
  capacity:
    storage: 500Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-storage
  local:
    path: /opt/earth2/cache
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - $(hostname)
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-storage
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
EOF
    
    log_info "Earth-2 namespaces and storage configured"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Main Execution
# ═══════════════════════════════════════════════════════════════════════════════

main() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo " Ubuntu 22.04 Setup for NVIDIA Earth-2"
    echo " Sandbox VM: $(hostname)"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo ""
    
    case "${1:-}" in
        --phase1)
            # Phase 1: Pre-reboot setup
            system_update
            install_nvidia_drivers
            
            echo ""
            log_warn "═══════════════════════════════════════════════════════════════════════"
            log_warn "REBOOT REQUIRED!"
            log_warn "After reboot, run: $0 --phase2"
            log_warn "═══════════════════════════════════════════════════════════════════════"
            ;;
        --phase2)
            # Phase 2: Post-reboot setup
            install_cuda
            install_container_toolkit
            install_k3s
            install_helm
            configure_containerd
            sleep 10
            test_gpu
            setup_earth2_namespace
            
            echo ""
            log_info "═══════════════════════════════════════════════════════════════════════"
            log_info "Setup complete!"
            log_info ""
            log_info "GPU Status:"
            nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv
            log_info ""
            log_info "K3s Status:"
            kubectl get nodes
            log_info ""
            log_info "Next: Deploy NVIDIA GPU Operator and Earth-2 models"
            log_info "═══════════════════════════════════════════════════════════════════════"
            ;;
        --test)
            test_gpu
            ;;
        --help|*)
            echo "Usage: $0 [--phase1|--phase2|--test|--help]"
            echo ""
            echo "Phases:"
            echo "  --phase1   Install NVIDIA drivers (requires reboot after)"
            echo "  --phase2   Post-reboot: CUDA, Container Toolkit, K3s, Helm"
            echo "  --test     Test GPU access in container"
            echo "  --help     Show this help"
            echo ""
            echo "Run phases in order:"
            echo "  1. sudo $0 --phase1"
            echo "  2. sudo reboot"
            echo "  3. sudo $0 --phase2"
            ;;
    esac
}

main "$@"
