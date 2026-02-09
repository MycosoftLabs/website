#!/bin/bash
# Check IOMMU status on Proxmox host
# Run as root on Proxmox host (192.168.0.202)

set -e

echo "=============================================="
echo "  IOMMU Status Check - Proxmox Host"
echo "=============================================="

# Check if IOMMU is enabled in kernel
echo ""
echo ">>> Checking IOMMU in kernel parameters..."
if grep -q "intel_iommu=on" /proc/cmdline || grep -q "amd_iommu=on" /proc/cmdline; then
    echo "[OK] IOMMU is enabled in kernel parameters"
    grep -oP '(intel|amd)_iommu=\S+' /proc/cmdline || true
else
    echo "[WARNING] IOMMU not found in kernel parameters"
    echo "Current cmdline: $(cat /proc/cmdline)"
    echo ""
    echo "To enable IOMMU, edit /etc/default/grub:"
    echo '  GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on iommu=pt"'
    echo "Then run: update-grub && reboot"
fi

# Check IOMMU groups
echo ""
echo ">>> Checking IOMMU groups..."
if [ -d /sys/kernel/iommu_groups ]; then
    GROUP_COUNT=$(find /sys/kernel/iommu_groups/ -maxdepth 1 -mindepth 1 -type d | wc -l)
    echo "[OK] Found $GROUP_COUNT IOMMU groups"
else
    echo "[ERROR] No IOMMU groups found - IOMMU not enabled"
    exit 1
fi

# Check for NVIDIA GPU
echo ""
echo ">>> Looking for NVIDIA GPU..."
NVIDIA_DEVICES=$(lspci -nn | grep -i nvidia || true)
if [ -z "$NVIDIA_DEVICES" ]; then
    echo "[ERROR] No NVIDIA GPU found on this host"
    echo "The RTX 5090 may be on a different machine"
    exit 1
else
    echo "[OK] Found NVIDIA device(s):"
    echo "$NVIDIA_DEVICES"
fi

# Get GPU PCI address
echo ""
echo ">>> GPU PCI Details..."
GPU_ADDR=$(lspci -nn | grep -i nvidia | head -1 | awk '{print $1}')
if [ -n "$GPU_ADDR" ]; then
    echo "GPU PCI Address: $GPU_ADDR"
    
    # Find IOMMU group
    for group in /sys/kernel/iommu_groups/*/devices/*; do
        if [[ "$group" == *"$GPU_ADDR"* ]]; then
            IOMMU_GROUP=$(echo "$group" | grep -oP 'iommu_groups/\K[0-9]+')
            echo "IOMMU Group: $IOMMU_GROUP"
            
            # List all devices in the group
            echo ""
            echo "Devices in IOMMU group $IOMMU_GROUP:"
            for dev in /sys/kernel/iommu_groups/$IOMMU_GROUP/devices/*; do
                DEV_ADDR=$(basename "$dev")
                DEV_DESC=$(lspci -nns "$DEV_ADDR" 2>/dev/null || echo "Unknown")
                echo "  $DEV_ADDR: $DEV_DESC"
            done
            break
        fi
    done
fi

# Check VFIO modules
echo ""
echo ">>> Checking VFIO modules..."
VFIO_LOADED=$(lsmod | grep vfio || true)
if [ -n "$VFIO_LOADED" ]; then
    echo "[OK] VFIO modules loaded:"
    echo "$VFIO_LOADED"
else
    echo "[INFO] VFIO modules not loaded (will be loaded when GPU is passed through)"
fi

# Check for conflicting drivers
echo ""
echo ">>> Checking for conflicting drivers..."
NVIDIA_DRV=$(lsmod | grep nvidia || true)
NOUVEAU_DRV=$(lsmod | grep nouveau || true)

if [ -n "$NVIDIA_DRV" ]; then
    echo "[WARNING] NVIDIA driver is loaded on host - must be unloaded for passthrough"
fi
if [ -n "$NOUVEAU_DRV" ]; then
    echo "[WARNING] Nouveau driver is loaded - must be blacklisted"
fi
if [ -z "$NVIDIA_DRV" ] && [ -z "$NOUVEAU_DRV" ]; then
    echo "[OK] No conflicting GPU drivers loaded"
fi

echo ""
echo "=============================================="
echo "  IOMMU Check Complete"
echo "=============================================="
echo ""
echo "GPU Address: $GPU_ADDR"
echo "IOMMU Group: ${IOMMU_GROUP:-Not found}"
echo ""
echo "Next step: Run 02_configure_vfio.sh"
