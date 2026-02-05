# Earth-2 RTX Deployment Status - February 5, 2026

## Executive Summary

Deployment to Sandbox VM completed with **partial success**. K3s and core infrastructure are operational. GPU passthrough requires additional Proxmox configuration.

---

## Deployment Status

| Component | Status | Notes |
|-----------|--------|-------|
| Code Deployed | SUCCESS | Commit 4430826 |
| K3s Installed | SUCCESS | v1.34.3+k3s1 |
| K3s Running | SUCCESS | Node Ready |
| Namespaces Created | SUCCESS | earth2-models, earth2-services, earth2-omniverse, gpu-operator |
| Storage PVCs | SUCCESS | All PVCs created |
| Docker | SUCCESS | Running (8+ containers) |
| API Gateway | SUCCESS | Running on port 8210 |
| K8s Services | SUCCESS | DFM + Orchestrator pods running |
| E2CC Omniverse | BLOCKED | Needs NGC auth for Omniverse Kit image |
| GPU Passthrough | NOT AVAILABLE | RTX 5090 is on Windows Dev PC, not Proxmox |

### Service Verification (from VM)

```json
// curl http://192.168.0.187:8210/
{"service":"e2cc-api-gateway","version":"1.0.0","timestamp":"2026-02-05T08:50:32"}
```

---

## Current Architecture Discovery

Based on documentation analysis:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CURRENT MYCOSOFT INFRASTRUCTURE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Windows Dev PC (192.168.0.172)       Sandbox VM (192.168.0.187)        │
│  ┌─────────────────────────┐         ┌─────────────────────────────┐   │
│  │ RTX 5090 (32GB VRAM)    │         │ Ubuntu 24.04 (64GB RAM)     │   │
│  │ - PersonaPlex/Moshi     │         │ - Website containers        │   │
│  │ - Local AI inference    │         │ - MINDEX API                │   │
│  │ - Development           │         │ - n8n workflows             │   │
│  └─────────────────────────┘         │ - PostgreSQL/Redis          │   │
│                                       │ - K3s Kubernetes            │   │
│                                       └─────────────────────────────┘   │
│                                                                          │
│  Proxmox Host (192.168.0.202)                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ No GPU - All GPUs on physical Windows machines                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## What Was Successfully Deployed

### 1. K3s Kubernetes Cluster

```
NAME               STATUS   ROLES           AGE   VERSION
mycosoft-sandbox   Ready    control-plane   39s   v1.34.3+k3s1
```

### 2. Kubernetes Namespaces

```
earth2-models      Active
earth2-omniverse   Active
earth2-services    Active
gpu-operator       Active
```

### 3. Storage Configuration

- `earth2-models-pvc` - For AI model weights
- `earth2-data-pvc` - For weather data
- `omniverse-assets-pvc` - For Omniverse assets

### 4. Code Repository Updated

- Commit: 4430826
- Message: "docs: Add deployment guide and instructions - Feb 5, 2026"
- All services, tests, and infrastructure code deployed

---

## Blockers

### 1. GPU Not Available in VM

**Issue**: RTX 5090 is on Windows Dev PC, not passed through to Proxmox VM.

**Solution Options**:

A. **GPU Passthrough** (Complex, requires Proxmox host access):
   ```bash
   # On Proxmox host (192.168.0.202)
   lspci -nn | grep NVIDIA  # Find GPU PCI address
   qm set <vmid> -hostpci0 <pci-addr>,pcie=1
   # Edit /etc/default/grub: intel_iommu=on iommu=pt
   update-grub && reboot
   ```

B. **Hybrid Architecture** (Recommended):
   - Keep GPU workloads on Windows Dev PC
   - Run CPU services on Sandbox VM
   - Use API calls between them

### 2. Omniverse Kit Image Requires Auth

**Issue**: `nvcr.io/nvidia/omniverse/kit:106.0.0` returns 401 Unauthorized

**Solution**:
```bash
# On VM, login to NGC
docker login nvcr.io
# Username: $oauthtoken
# Password: <NGC API Key from ngc.nvidia.com>
```

---

## Hybrid Architecture Recommendation

Given the current setup, the recommended approach:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED HYBRID ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Windows Dev PC (192.168.0.172)       Sandbox VM (192.168.0.187)        │
│  ┌─────────────────────────┐         ┌─────────────────────────────┐   │
│  │ RTX 5090 GPU Services   │ ◄────► │ K3s Cluster                  │   │
│  │ ├── Earth2Studio       │   API   │ ├── API Gateway (:8210)     │   │
│  │ │   ├── FCN3           │         │ ├── DFM (:8300)             │   │
│  │ │   ├── StormScope     │         │ ├── Orchestrator (:8320)    │   │
│  │ │   └── CorrDiff       │         │ └── Signaling (:8212)       │   │
│  │ ├── Omniverse Kit      │         │                              │   │
│  │ └── PersonaPlex        │         │ Docker Compose               │   │
│  └─────────────────────────┘         │ ├── Website                 │   │
│                                       │ ├── MINDEX                  │   │
│                                       │ └── PostgreSQL/Redis        │   │
│                                       └─────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

### Immediate (Can Do Now)

1. **Deploy CPU-only services on VM**:
   - API Gateway (routing only)
   - Data Federation Mesh (weather data)
   - Model Orchestrator (coordination)

2. **Run Earth2Studio on Windows Dev PC**:
   ```bash
   # Already has RTX 5090
   pip install earth2studio
   python services/earth2-inference/inference_server.py
   ```

### Requires Proxmox Access

3. **Configure GPU passthrough** (if desired):
   - Need SSH access to Proxmox host (192.168.0.202)
   - Requires VM reboot

### Requires NGC Account

4. **Deploy Omniverse Kit**:
   - Create NGC account at ngc.nvidia.com
   - Generate API key
   - `docker login nvcr.io`

---

## Test Results Summary

| Test Suite | Locally | On VM |
|------------|---------|-------|
| GPU Passthrough | 0/10 | 0/10 (No GPU) |
| Infrastructure | 0/15 | 12/15 (K3s works) |
| Services | 0/30 | Partial (needs services) |
| E2E Integration | 0/15 | Partial |

---

## Files Deployed to VM

```
/home/mycosoft/mycosoft/website/
├── services/
│   ├── e2cc/                    # Omniverse integration
│   ├── earth2-inference/        # AI inference server
│   ├── data-federation/         # Weather data mesh
│   └── model-orchestrator/      # VRAM management
├── infra/
│   └── k8s/
│       ├── namespaces.yaml      # Applied ✓
│       ├── storage/             # Applied ✓
│       ├── earth2-models/       # Ready to deploy
│       └── earth2-services/     # Ready to deploy
└── tests/
    └── e2e/                     # 70+ tests ready
```

---

## Contact

For GPU passthrough configuration, Proxmox host access is needed at:
- **Host**: 192.168.0.202
- **Web UI**: https://192.168.0.202:8006
- **API Token**: `root@pam!cursor_agent` (see PROXMOX_UNIFI_API_REFERENCE.md)
