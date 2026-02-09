#!/bin/bash
# Install NVIDIA driver on Ubuntu VM after GPU passthrough
# Run as root on Sandbox VM (192.168.0.187)

set -e

echo "=============================================="
echo "  NVIDIA Driver Installation"
echo "=============================================="

# Check if GPU is visible
echo ""
echo ">>> Checking for NVIDIA GPU..."
GPU_INFO=$(lspci | grep -i nvidia || true)
if [ -z "$GPU_INFO" ]; then
    echo "[ERROR] No NVIDIA GPU detected"
    echo "GPU passthrough may not be configured correctly on Proxmox"
    exit 1
fi
echo "[OK] Found NVIDIA GPU:"
echo "$GPU_INFO"

# Update system
echo ""
echo ">>> Updating system packages..."
apt-get update
apt-get upgrade -y

# Install prerequisites
echo ""
echo ">>> Installing prerequisites..."
apt-get install -y \
    build-essential \
    dkms \
    linux-headers-$(uname -r) \
    pkg-config \
    libglvnd-dev \
    libglvnd0 \
    libgl1 \
    libegl1 \
    libgles2

# Remove any existing NVIDIA packages
echo ""
echo ">>> Removing existing NVIDIA packages..."
apt-get remove -y --purge nvidia-* libnvidia-* 2>/dev/null || true
apt-get autoremove -y

# Blacklist nouveau
echo ""
echo ">>> Blacklisting nouveau driver..."
cat > /etc/modprobe.d/blacklist-nouveau.conf << 'EOF'
blacklist nouveau
options nouveau modeset=0
EOF
update-initramfs -u

# Add NVIDIA repository
echo ""
echo ">>> Adding NVIDIA driver repository..."
apt-get install -y software-properties-common
add-apt-repository -y ppa:graphics-drivers/ppa
apt-get update

# Find recommended driver
echo ""
echo ">>> Finding recommended driver..."
RECOMMENDED=$(ubuntu-drivers devices 2>/dev/null | grep recommended | awk '{print $3}' || echo "nvidia-driver-565")
echo "Recommended driver: $RECOMMENDED"

# Install driver
echo ""
echo ">>> Installing NVIDIA driver ($RECOMMENDED)..."
apt-get install -y "$RECOMMENDED" nvidia-utils-565

# Install nvidia-smi
apt-get install -y nvidia-utils-565

echo ""
echo "=============================================="
echo "  NVIDIA Driver Installation Complete"
echo "=============================================="
echo ""
echo "[IMPORTANT] You must REBOOT the VM for the driver to load!"
echo ""
echo "After reboot, verify with: nvidia-smi"
echo ""
echo "Then run: 02_install_cuda.sh"
