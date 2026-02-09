#!/bin/bash
# Configure VFIO for GPU passthrough on Proxmox
# Run as root on Proxmox host (192.168.0.202)

set -e

echo "=============================================="
echo "  VFIO Configuration for GPU Passthrough"
echo "=============================================="

# Get GPU info
GPU_LINE=$(lspci -nn | grep -i nvidia | head -1)
if [ -z "$GPU_LINE" ]; then
    echo "[ERROR] No NVIDIA GPU found"
    exit 1
fi

GPU_ADDR=$(echo "$GPU_LINE" | awk '{print $1}')
# Extract vendor:device IDs (e.g., 10de:2684)
GPU_IDS=$(echo "$GPU_LINE" | grep -oP '\[10de:[0-9a-f]+\]' | tr -d '[]')

echo "GPU Address: $GPU_ADDR"
echo "GPU IDs: $GPU_IDS"

# Also get audio device if present (same IOMMU group)
AUDIO_LINE=$(lspci -nn | grep -i nvidia | grep -i audio | head -1 || true)
if [ -n "$AUDIO_LINE" ]; then
    AUDIO_IDS=$(echo "$AUDIO_LINE" | grep -oP '\[10de:[0-9a-f]+\]' | tr -d '[]')
    echo "Audio IDs: $AUDIO_IDS"
    ALL_IDS="$GPU_IDS,$AUDIO_IDS"
else
    ALL_IDS="$GPU_IDS"
fi

echo ""
echo ">>> Step 1: Update GRUB configuration..."

GRUB_FILE="/etc/default/grub"
GRUB_BACKUP="/etc/default/grub.backup.$(date +%Y%m%d)"

# Backup current config
cp "$GRUB_FILE" "$GRUB_BACKUP"
echo "Backed up to $GRUB_BACKUP"

# Check current GRUB config
CURRENT_CMDLINE=$(grep "^GRUB_CMDLINE_LINUX_DEFAULT" "$GRUB_FILE" || echo "")
echo "Current: $CURRENT_CMDLINE"

# Prepare new cmdline
NEW_PARAMS="quiet intel_iommu=on iommu=pt"

if ! grep -q "intel_iommu=on" "$GRUB_FILE"; then
    # Update GRUB
    sed -i "s/^GRUB_CMDLINE_LINUX_DEFAULT=.*/GRUB_CMDLINE_LINUX_DEFAULT=\"$NEW_PARAMS\"/" "$GRUB_FILE"
    echo "Updated GRUB with IOMMU parameters"
    GRUB_UPDATED=true
else
    echo "IOMMU already in GRUB config"
    GRUB_UPDATED=false
fi

echo ""
echo ">>> Step 2: Configure VFIO module options..."

VFIO_CONF="/etc/modprobe.d/vfio.conf"
cat > "$VFIO_CONF" << EOF
# VFIO configuration for GPU passthrough
# GPU IDs: $ALL_IDS
options vfio-pci ids=$ALL_IDS
options vfio-pci disable_vga=1
EOF
echo "Created $VFIO_CONF"
cat "$VFIO_CONF"

echo ""
echo ">>> Step 3: Blacklist GPU drivers..."

BLACKLIST_CONF="/etc/modprobe.d/blacklist-gpu.conf"
cat > "$BLACKLIST_CONF" << EOF
# Blacklist GPU drivers for passthrough
blacklist nvidia
blacklist nvidia_drm
blacklist nvidia_modeset
blacklist nvidia_uvm
blacklist nouveau
blacklist nvidiafb
EOF
echo "Created $BLACKLIST_CONF"

echo ""
echo ">>> Step 4: Configure modules to load at boot..."

MODULES_FILE="/etc/modules"
VFIO_MODULES="vfio vfio_iommu_type1 vfio_pci"

for mod in $VFIO_MODULES; do
    if ! grep -q "^$mod" "$MODULES_FILE"; then
        echo "$mod" >> "$MODULES_FILE"
        echo "Added $mod to $MODULES_FILE"
    fi
done

echo ""
echo ">>> Step 5: Update initramfs..."
update-initramfs -u -k all

echo ""
echo ">>> Step 6: Update GRUB..."
update-grub

echo ""
echo "=============================================="
echo "  VFIO Configuration Complete"
echo "=============================================="
echo ""
echo "GPU IDs configured: $ALL_IDS"
echo ""
echo "[IMPORTANT] You must REBOOT the Proxmox host for changes to take effect!"
echo ""
echo "After reboot, run: 03_attach_gpu_to_vm.sh"
echo ""
if [ "$GRUB_UPDATED" = true ]; then
    echo "GRUB was updated - reboot required"
fi
