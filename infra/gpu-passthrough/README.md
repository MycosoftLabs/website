# GPU Passthrough Configuration - February 5, 2026

Complete solution for configuring RTX 5090 GPU passthrough from Proxmox to Sandbox VM.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GPU PASSTHROUGH SETUP                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Proxmox Host (192.168.0.202)                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Physical Hardware                                                │   │
│  │ ├── RTX 5090 GPU (PCI address TBD)                              │   │
│  │ ├── IOMMU Groups configured                                      │   │
│  │ └── VFIO drivers bound                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼ PCIe Passthrough                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Sandbox VM (VMID 103)                                           │   │
│  │ ├── Ubuntu 24.04                                                 │   │
│  │ ├── NVIDIA Driver 565+                                          │   │
│  │ ├── CUDA Toolkit 12.8                                           │   │
│  │ └── nvidia-container-toolkit                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Scripts

| Script | Purpose | Run On |
|--------|---------|--------|
| `proxmox/01_check_iommu.sh` | Verify IOMMU is enabled | Proxmox Host |
| `proxmox/02_configure_vfio.sh` | Configure VFIO for GPU | Proxmox Host |
| `proxmox/03_attach_gpu_to_vm.sh` | Attach GPU to VM 103 | Proxmox Host |
| `vm/01_install_nvidia_driver.sh` | Install NVIDIA drivers | Sandbox VM |
| `vm/02_install_cuda.sh` | Install CUDA toolkit | Sandbox VM |
| `vm/03_install_container_toolkit.sh` | Install container toolkit | Sandbox VM |
| `vm/04_verify_gpu.sh` | Verify GPU is working | Sandbox VM |
| `windows/deploy_gpu_passthrough.py` | Remote deployment from Windows | Windows Dev |

## Prerequisites

1. **Proxmox Host Access**
   - SSH access to 192.168.0.202
   - Root privileges

2. **GPU Requirements**
   - GPU must be in its own IOMMU group
   - GPU not in use by Proxmox host

3. **BIOS Settings**
   - VT-d (Intel) or AMD-Vi enabled
   - IOMMU enabled

## Quick Start

```powershell
# From Windows Dev PC
python infra/gpu-passthrough/windows/deploy_gpu_passthrough.py --full
```
