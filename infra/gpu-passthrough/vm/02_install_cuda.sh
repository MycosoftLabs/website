#!/bin/bash
# Install CUDA Toolkit on Ubuntu VM
# Run as root on Sandbox VM (192.168.0.187)

set -e

echo "=============================================="
echo "  CUDA Toolkit Installation"
echo "=============================================="

# Verify NVIDIA driver is working
echo ""
echo ">>> Verifying NVIDIA driver..."
if ! nvidia-smi &>/dev/null; then
    echo "[ERROR] nvidia-smi failed - driver not working"
    echo "Please run 01_install_nvidia_driver.sh and reboot first"
    exit 1
fi
nvidia-smi --query-gpu=name,driver_version --format=csv

# Get driver version
DRIVER_VER=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader)
echo "Driver version: $DRIVER_VER"

# Install CUDA keyring
echo ""
echo ">>> Installing CUDA repository..."
wget -q https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb
dpkg -i cuda-keyring_1.1-1_all.deb
rm cuda-keyring_1.1-1_all.deb
apt-get update

# Install CUDA toolkit
echo ""
echo ">>> Installing CUDA Toolkit 12.8..."
apt-get install -y cuda-toolkit-12-8

# Set up environment variables
echo ""
echo ">>> Configuring environment..."
cat >> /etc/profile.d/cuda.sh << 'EOF'
export PATH=/usr/local/cuda-12.8/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda-12.8/lib64:$LD_LIBRARY_PATH
EOF

# Also add to bashrc for current user
if [ -f /home/mycosoft/.bashrc ]; then
    if ! grep -q "cuda" /home/mycosoft/.bashrc; then
        cat >> /home/mycosoft/.bashrc << 'EOF'

# CUDA
export PATH=/usr/local/cuda-12.8/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda-12.8/lib64:$LD_LIBRARY_PATH
EOF
    fi
fi

# Install cuDNN
echo ""
echo ">>> Installing cuDNN..."
apt-get install -y libcudnn9-cuda-12 libcudnn9-dev-cuda-12

echo ""
echo "=============================================="
echo "  CUDA Installation Complete"
echo "=============================================="
echo ""
echo "CUDA 12.8 installed"
echo ""
echo "Verify with: nvcc --version"
echo ""
echo "Next: Run 03_install_container_toolkit.sh"
