#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# NVIDIA RTX 5090 GPU Passthrough Setup for Proxmox
# February 5, 2026
# 
# This script configures GPU passthrough from Proxmox host to VM
# Target: Sandbox VM (192.168.0.187) for NVIDIA Earth-2 / Omniverse
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════

# RTX 5090 PCI IDs (update with actual values from lspci)
# Run: lspci -nn | grep -i nvidia
GPU_VENDOR_ID="10de"  # NVIDIA
GPU_DEVICE_ID="2684"  # RTX 5090 (verify this ID)
GPU_AUDIO_ID="2685"   # RTX 5090 Audio (verify this ID)

# VM Configuration
VM_ID="100"  # Update with your Sandbox VM ID

# ═══════════════════════════════════════════════════════════════════════════════
# Step 1: Check Prerequisites
# ═══════════════════════════════════════════════════════════════════════════════

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
    
    # Check if Proxmox
    if ! command -v pveversion &> /dev/null; then
        log_error "This script is designed for Proxmox VE"
        exit 1
    fi
    
    log_info "Proxmox version: $(pveversion)"
    
    # Check CPU virtualization support
    if grep -E 'vmx|svm' /proc/cpuinfo > /dev/null; then
        log_info "CPU virtualization support detected"
    else
        log_error "CPU virtualization not supported or not enabled in BIOS"
        exit 1
    fi
    
    # Check IOMMU support
    if dmesg | grep -i iommu > /dev/null; then
        log_info "IOMMU appears to be available"
    else
        log_warn "IOMMU may not be enabled - check BIOS settings"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 2: Configure GRUB for IOMMU
# ═══════════════════════════════════════════════════════════════════════════════

configure_grub() {
    log_info "Configuring GRUB for IOMMU..."
    
    GRUB_FILE="/etc/default/grub"
    BACKUP_FILE="/etc/default/grub.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Backup current config
    cp "$GRUB_FILE" "$BACKUP_FILE"
    log_info "Backed up GRUB config to $BACKUP_FILE"
    
    # Detect CPU vendor
    if grep -q "Intel" /proc/cpuinfo; then
        IOMMU_PARAM="intel_iommu=on iommu=pt"
        log_info "Intel CPU detected"
    elif grep -q "AMD" /proc/cpuinfo; then
        IOMMU_PARAM="amd_iommu=on iommu=pt"
        log_info "AMD CPU detected"
    else
        log_error "Unknown CPU vendor"
        exit 1
    fi
    
    # Check if IOMMU already configured
    if grep -q "iommu=on\|intel_iommu=on\|amd_iommu=on" "$GRUB_FILE"; then
        log_warn "IOMMU appears to be already configured in GRUB"
    else
        # Add IOMMU parameters
        sed -i "s/GRUB_CMDLINE_LINUX_DEFAULT=\"/GRUB_CMDLINE_LINUX_DEFAULT=\"$IOMMU_PARAM /" "$GRUB_FILE"
        log_info "Added IOMMU parameters to GRUB"
    fi
    
    # Update GRUB
    update-grub
    log_info "GRUB configuration updated"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 3: Configure VFIO Modules
# ═══════════════════════════════════════════════════════════════════════════════

configure_vfio() {
    log_info "Configuring VFIO modules..."
    
    # Add VFIO modules
    MODULES_FILE="/etc/modules"
    MODULES_TO_ADD=(
        "vfio"
        "vfio_iommu_type1"
        "vfio_pci"
        "vfio_virqfd"
    )
    
    for module in "${MODULES_TO_ADD[@]}"; do
        if ! grep -q "^$module$" "$MODULES_FILE"; then
            echo "$module" >> "$MODULES_FILE"
            log_info "Added module: $module"
        else
            log_info "Module already present: $module"
        fi
    done
    
    # Configure VFIO PCI IDs
    VFIO_CONF="/etc/modprobe.d/vfio.conf"
    cat > "$VFIO_CONF" << EOF
# NVIDIA RTX 5090 GPU Passthrough Configuration
# Generated: $(date)
# GPU Vendor:Device IDs for VFIO binding

options vfio-pci ids=${GPU_VENDOR_ID}:${GPU_DEVICE_ID},${GPU_VENDOR_ID}:${GPU_AUDIO_ID}
options vfio-pci disable_vga=1
EOF
    
    log_info "Created VFIO configuration: $VFIO_CONF"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 4: Blacklist NVIDIA Drivers on Host
# ═══════════════════════════════════════════════════════════════════════════════

blacklist_nvidia() {
    log_info "Blacklisting NVIDIA drivers on host..."
    
    BLACKLIST_FILE="/etc/modprobe.d/blacklist-nvidia.conf"
    cat > "$BLACKLIST_FILE" << EOF
# Blacklist NVIDIA drivers for GPU passthrough
# Generated: $(date)

blacklist nouveau
blacklist nvidia
blacklist nvidia_drm
blacklist nvidia_modeset
blacklist nvidiafb
blacklist nvidia_uvm

# Prevent loading at boot
options nouveau modeset=0
EOF
    
    log_info "Created blacklist configuration: $BLACKLIST_FILE"
    
    # Update initramfs
    update-initramfs -u -k all
    log_info "Updated initramfs"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 5: Find GPU PCI Addresses
# ═══════════════════════════════════════════════════════════════════════════════

find_gpu_addresses() {
    log_info "Finding NVIDIA GPU PCI addresses..."
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════"
    echo "NVIDIA GPU Devices Found:"
    echo "═══════════════════════════════════════════════════════════════════════"
    lspci -nn | grep -i nvidia
    echo "═══════════════════════════════════════════════════════════════════════"
    echo ""
    
    # Get the PCI address of the GPU
    GPU_PCI_ADDR=$(lspci -nn | grep -i "NVIDIA.*VGA\|NVIDIA.*3D" | head -1 | awk '{print $1}')
    
    if [[ -n "$GPU_PCI_ADDR" ]]; then
        log_info "Primary GPU PCI Address: $GPU_PCI_ADDR"
        
        # Check IOMMU group
        IOMMU_GROUP=$(find /sys/kernel/iommu_groups/ -type l | xargs -I{} sh -c 'ls -la {} | grep -q "'$GPU_PCI_ADDR'" && dirname {}' 2>/dev/null | head -1)
        
        if [[ -n "$IOMMU_GROUP" ]]; then
            log_info "IOMMU Group: $(basename $IOMMU_GROUP)"
            echo ""
            echo "Devices in this IOMMU group:"
            ls -la "$IOMMU_GROUP/devices/"
        fi
    else
        log_warn "Could not automatically detect GPU PCI address"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 6: Generate VM Configuration
# ═══════════════════════════════════════════════════════════════════════════════

generate_vm_config() {
    log_info "Generating VM configuration snippet..."
    
    # Get GPU PCI addresses
    GPU_PCI=$(lspci -nn | grep -i "NVIDIA.*VGA\|NVIDIA.*3D" | head -1 | awk '{print $1}')
    AUDIO_PCI=$(lspci -nn | grep -i "NVIDIA.*Audio" | head -1 | awk '{print $1}')
    
    CONFIG_FILE="/root/earth2-vm-gpu-config.txt"
    cat > "$CONFIG_FILE" << EOF
# ═══════════════════════════════════════════════════════════════════════════════
# Proxmox VM Configuration for GPU Passthrough
# Add these lines to your VM configuration: /etc/pve/qemu-server/${VM_ID}.conf
# Generated: $(date)
# ═══════════════════════════════════════════════════════════════════════════════

# GPU Passthrough - RTX 5090
hostpci0: ${GPU_PCI},pcie=1,x-vga=1

# GPU Audio (optional, for HDMI audio)
hostpci1: ${AUDIO_PCI},pcie=1

# Machine type (required for GPU passthrough)
machine: q35

# BIOS (OVMF/UEFI required)
bios: ovmf
efidisk0: local-lvm:vm-${VM_ID}-disk-0,size=4M

# CPU configuration
cpu: host
args: -cpu 'host,+kvm_pv_unhalt,+kvm_pv_eoi,hv_vendor_id=NV43FIX,kvm=off'

# Memory (for Earth-2 models)
memory: 65536
balloon: 0

# Additional recommended settings
numa: 1
vcpus: 16
sockets: 1
cores: 16

# ═══════════════════════════════════════════════════════════════════════════════
# After adding to VM config, update with:
# qm set ${VM_ID} --hostpci0 ${GPU_PCI},pcie=1,x-vga=1
# ═══════════════════════════════════════════════════════════════════════════════
EOF
    
    log_info "VM configuration saved to: $CONFIG_FILE"
    cat "$CONFIG_FILE"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 7: Create VM GPU Attachment Script
# ═══════════════════════════════════════════════════════════════════════════════

create_attach_script() {
    log_info "Creating GPU attachment script..."
    
    ATTACH_SCRIPT="/root/attach-gpu-to-vm.sh"
    cat > "$ATTACH_SCRIPT" << 'EOF'
#!/bin/bash
# Attach RTX 5090 to Sandbox VM
# Usage: ./attach-gpu-to-vm.sh <VM_ID>

VM_ID=${1:-100}

# Get GPU PCI address
GPU_PCI=$(lspci -nn | grep -i "NVIDIA.*VGA\|NVIDIA.*3D" | head -1 | awk '{print $1}')

if [[ -z "$GPU_PCI" ]]; then
    echo "Error: No NVIDIA GPU found"
    exit 1
fi

echo "Attaching GPU $GPU_PCI to VM $VM_ID..."

# Stop VM if running
qm status $VM_ID | grep -q running && qm stop $VM_ID

# Add GPU passthrough
qm set $VM_ID --hostpci0 "$GPU_PCI,pcie=1,x-vga=1"

# Set machine type to q35
qm set $VM_ID --machine q35

# Set BIOS to OVMF
qm set $VM_ID --bios ovmf

# Set CPU to host
qm set $VM_ID --cpu host

echo "GPU attached successfully!"
echo "Start VM with: qm start $VM_ID"
EOF
    
    chmod +x "$ATTACH_SCRIPT"
    log_info "Created attachment script: $ATTACH_SCRIPT"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Main Execution
# ═══════════════════════════════════════════════════════════════════════════════

main() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo " NVIDIA RTX 5090 GPU Passthrough Setup for Proxmox"
    echo " Target: Earth-2 / Omniverse Deployment"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo ""
    
    case "${1:-}" in
        --check)
            check_prerequisites
            find_gpu_addresses
            ;;
        --configure)
            check_prerequisites
            configure_grub
            configure_vfio
            blacklist_nvidia
            find_gpu_addresses
            generate_vm_config
            create_attach_script
            
            echo ""
            log_info "═══════════════════════════════════════════════════════════════════════════════"
            log_info "Configuration complete!"
            log_info ""
            log_info "NEXT STEPS:"
            log_info "1. REBOOT the Proxmox host: reboot"
            log_info "2. Verify IOMMU is enabled: dmesg | grep -e DMAR -e IOMMU"
            log_info "3. Verify GPU is bound to VFIO: lspci -nnk | grep -A3 nvidia"
            log_info "4. Attach GPU to VM: /root/attach-gpu-to-vm.sh $VM_ID"
            log_info "5. Start VM and install NVIDIA drivers inside"
            log_info "═══════════════════════════════════════════════════════════════════════════════"
            ;;
        --help|*)
            echo "Usage: $0 [--check|--configure|--help]"
            echo ""
            echo "Options:"
            echo "  --check      Check prerequisites and find GPU"
            echo "  --configure  Full configuration (requires reboot)"
            echo "  --help       Show this help message"
            echo ""
            echo "Before running --configure:"
            echo "  1. Enable VT-d/AMD-Vi in BIOS"
            echo "  2. Update GPU_DEVICE_ID and GPU_AUDIO_ID variables if needed"
            echo "  3. Update VM_ID variable with your Sandbox VM ID"
            ;;
    esac
}

main "$@"
