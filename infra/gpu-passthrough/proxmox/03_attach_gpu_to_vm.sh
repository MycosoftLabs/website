#!/bin/bash
# Attach GPU to VM on Proxmox
# Run as root on Proxmox host (192.168.0.202)

set -e

VMID="${1:-103}"  # Default to Sandbox VM (103)

echo "=============================================="
echo "  Attach GPU to VM $VMID"
echo "=============================================="

# Verify VM exists
if ! qm status "$VMID" &>/dev/null; then
    echo "[ERROR] VM $VMID does not exist"
    qm list
    exit 1
fi

echo "VM $VMID found: $(qm status $VMID)"

# Get GPU PCI address
GPU_LINE=$(lspci -nn | grep -i nvidia | grep -v Audio | head -1)
if [ -z "$GPU_LINE" ]; then
    echo "[ERROR] No NVIDIA GPU found"
    exit 1
fi

GPU_ADDR=$(echo "$GPU_LINE" | awk '{print $1}')
echo "GPU Address: $GPU_ADDR"

# Check if GPU is bound to VFIO
echo ""
echo ">>> Checking VFIO binding..."
GPU_DRIVER=$(lspci -k -s "$GPU_ADDR" | grep "Kernel driver" || echo "none")
echo "Current driver: $GPU_DRIVER"

if [[ "$GPU_DRIVER" != *"vfio-pci"* ]]; then
    echo "[WARNING] GPU not bound to vfio-pci"
    echo "Attempting to bind..."
    
    # Unbind from current driver
    CURRENT_DRV=$(echo "$GPU_DRIVER" | awk '{print $NF}')
    if [ "$CURRENT_DRV" != "none" ] && [ -n "$CURRENT_DRV" ]; then
        echo "$GPU_ADDR" > "/sys/bus/pci/drivers/$CURRENT_DRV/unbind" 2>/dev/null || true
    fi
    
    # Bind to vfio-pci
    GPU_VENDOR=$(cat /sys/bus/pci/devices/0000:$GPU_ADDR/vendor)
    GPU_DEVICE=$(cat /sys/bus/pci/devices/0000:$GPU_ADDR/device)
    echo "$GPU_VENDOR $GPU_DEVICE" > /sys/bus/pci/drivers/vfio-pci/new_id 2>/dev/null || true
    echo "0000:$GPU_ADDR" > /sys/bus/pci/drivers/vfio-pci/bind 2>/dev/null || true
fi

# Stop VM if running
VM_STATUS=$(qm status "$VMID" | awk '{print $2}')
if [ "$VM_STATUS" = "running" ]; then
    echo ""
    echo ">>> Stopping VM $VMID..."
    qm stop "$VMID"
    sleep 5
fi

# Get current config
echo ""
echo ">>> Current VM $VMID configuration:"
grep -E "hostpci|machine|cpu|bios" /etc/pve/qemu-server/$VMID.conf || true

# Configure GPU passthrough
echo ""
echo ">>> Configuring GPU passthrough..."

# Set machine type to q35 if not already
qm set "$VMID" -machine q35

# Set CPU type
qm set "$VMID" -cpu host,hidden=1

# Add GPU (hostpci0)
qm set "$VMID" -hostpci0 "$GPU_ADDR,pcie=1,x-vga=0"

# Check for audio device
AUDIO_ADDR=$(lspci -nn | grep -i nvidia | grep -i audio | head -1 | awk '{print $1}' || true)
if [ -n "$AUDIO_ADDR" ]; then
    echo "Adding audio device: $AUDIO_ADDR"
    qm set "$VMID" -hostpci1 "$AUDIO_ADDR,pcie=1"
fi

# Enable OVMF (UEFI) if not already - required for GPU passthrough
if ! grep -q "bios: ovmf" /etc/pve/qemu-server/$VMID.conf; then
    echo "[INFO] Consider enabling OVMF (UEFI) for better GPU compatibility"
fi

# Show updated config
echo ""
echo ">>> Updated VM $VMID configuration:"
grep -E "hostpci|machine|cpu|bios" /etc/pve/qemu-server/$VMID.conf

echo ""
echo "=============================================="
echo "  GPU Attached to VM $VMID"
echo "=============================================="
echo ""
echo "GPU $GPU_ADDR attached to VM $VMID"
echo ""
echo "Start the VM with: qm start $VMID"
echo ""
echo "After VM starts, SSH in and run the driver installation scripts."
