#!/bin/bash
# Install NVIDIA Container Toolkit on Ubuntu VM
# Run as root on Sandbox VM (192.168.0.187)

set -e

echo "=============================================="
echo "  NVIDIA Container Toolkit Installation"
echo "=============================================="

# Verify NVIDIA driver
echo ""
echo ">>> Verifying NVIDIA driver..."
nvidia-smi --query-gpu=name,driver_version --format=csv

# Install NVIDIA Container Toolkit repository
echo ""
echo ">>> Adding NVIDIA Container Toolkit repository..."
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
    gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

apt-get update

# Install toolkit
echo ""
echo ">>> Installing NVIDIA Container Toolkit..."
apt-get install -y nvidia-container-toolkit

# Configure Docker
echo ""
echo ">>> Configuring Docker for NVIDIA..."
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker

# Configure containerd (for K8s)
echo ""
echo ">>> Configuring containerd for NVIDIA..."
nvidia-ctk runtime configure --runtime=containerd
systemctl restart containerd || true

# Test Docker GPU access
echo ""
echo ">>> Testing Docker GPU access..."
docker run --rm --gpus all nvidia/cuda:12.8.0-base-ubuntu24.04 nvidia-smi || {
    echo "[WARNING] Docker GPU test failed - may need to restart Docker"
}

echo ""
echo "=============================================="
echo "  Container Toolkit Installation Complete"
echo "=============================================="
echo ""
echo "Docker is now configured to use NVIDIA GPUs"
echo ""
echo "Test with: docker run --rm --gpus all nvidia/cuda:12.8.0-base-ubuntu24.04 nvidia-smi"
echo ""
echo "Next: Run 04_verify_gpu.sh"
