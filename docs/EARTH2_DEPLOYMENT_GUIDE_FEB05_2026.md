# Earth-2 RTX Deployment Guide - February 5, 2026

## Quick Start

### Prerequisites
- SSH access to Sandbox VM (192.168.0.187)
- RTX 5090 GPU with PCIe passthrough configured
- K3s Kubernetes installed on VM

---

## Step 1: Set Up SSH Access (One-time Setup)

Run in PowerShell/Terminal:

```bash
# From Windows (run in Git Bash or WSL)
ssh-copy-id mycosoft@192.168.0.187

# Or manually:
type %USERPROFILE%\.ssh\id_rsa.pub | ssh mycosoft@192.168.0.187 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

---

## Step 2: Deploy to Sandbox VM

### Option A: Automated Script

```bash
# SSH to VM
ssh mycosoft@192.168.0.187

# Pull latest code
cd /home/mycosoft/website
git fetch origin && git reset --hard origin/main

# Run deployment
chmod +x scripts/deploy_to_sandbox.sh
./scripts/deploy_to_sandbox.sh
```

### Option B: Manual Deployment

```bash
# SSH to VM
ssh mycosoft@192.168.0.187

# 1. Pull latest code
cd /home/mycosoft/website
git fetch origin && git reset --hard origin/main

# 2. Verify GPU
nvidia-smi

# 3. Deploy K8s namespaces
kubectl apply -f infra/k8s/namespaces.yaml
kubectl apply -f infra/k8s/storage/earth2-pvc.yaml

# 4. Deploy GPU Operator (if not installed)
kubectl get pods -n gpu-operator || ./infra/k8s/deploy-gpu-operator.sh

# 5. Deploy Earth-2 Models
chmod +x infra/k8s/deploy-all-models.sh
./infra/k8s/deploy-all-models.sh

# 6. Deploy E2CC (Omniverse Kit)
cd services/e2cc
docker compose up -d --build

# 7. Verify deployment
kubectl get pods -n earth2-models
kubectl get pods -n earth2-services
docker ps
nvidia-smi
```

---

## Step 3: Run Tests Against Deployed Services

```bash
# From local machine (after SSH is configured)
python tests/e2e/test_rtx5090_passthrough.py --remote 192.168.0.187
python tests/e2e/test_infrastructure.py --remote 192.168.0.187
python tests/e2e/test_services_comprehensive.py --host 192.168.0.187
python tests/e2e/earth2_rtx_e2e_test.py --host 192.168.0.187
```

---

## Step 4: Verify RTX 5090 Passthrough

On the VM, run:

```bash
# Check GPU is detected
nvidia-smi

# Expected output:
# NVIDIA GeForce RTX 5090, 32768 MB

# Check CUDA version
nvidia-smi --query-gpu=cuda_version --format=csv

# Check driver
cat /proc/driver/nvidia/version

# Check IOMMU
dmesg | grep -i iommu

# Check PCIe passthrough
lspci -v -s $(lspci | grep NVIDIA | awk '{print $1}')
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Sandbox VM (192.168.0.187)                  │
│                        RTX 5090 (32GB VRAM)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Kubernetes (K3s)                      │   │
│  │                                                          │   │
│  │  Namespace: earth2-models                                │   │
│  │  ├── FCN3 (FourCastNet)                                  │   │
│  │  ├── StormScope                                          │   │
│  │  ├── CorrDiff                                            │   │
│  │  ├── Pangu                                               │   │
│  │  ├── Aurora                                              │   │
│  │  ├── GraphCast                                           │   │
│  │  ├── StormCast                                           │   │
│  │  └── SFNO                                                │   │
│  │                                                          │   │
│  │  Namespace: earth2-services                              │   │
│  │  ├── Data Federation Mesh (:8300)                        │   │
│  │  └── Model Orchestrator (:8320)                          │   │
│  │                                                          │   │
│  │  Namespace: gpu-operator                                 │   │
│  │  └── NVIDIA GPU Operator                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Docker Compose (E2CC)                    │   │
│  │  ├── API Gateway (:8210)                                 │   │
│  │  ├── Omniverse Kit (:8211)                               │   │
│  │  └── WebRTC Signaling (:8212)                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 8210 | Earth-2 API routing |
| E2CC (Omniverse Kit) | 8211 | RTX rendering |
| WebRTC Signaling | 8212 | Video streaming |
| Data Federation Mesh | 8300 | Weather data |
| FCN3 Inference | 8310 | FourCastNet |
| StormScope Inference | 8311 | Nowcasting |
| Model Orchestrator | 8320 | VRAM management |

---

## Troubleshooting

### GPU Not Detected

```bash
# Check IOMMU
cat /sys/class/iommu/*/devices/*/uevent

# Check VM config in Proxmox
qm config <vmid> | grep hostpci

# Check driver
modinfo nvidia
```

### K3s Not Running

```bash
# Check status
sudo systemctl status k3s

# View logs
sudo journalctl -u k3s -f

# Restart
sudo systemctl restart k3s
```

### Pods Not Starting

```bash
# Check events
kubectl get events -n earth2-models --sort-by='.lastTimestamp'

# Check pod logs
kubectl logs -n earth2-models <pod-name>

# Describe pod
kubectl describe pod -n earth2-models <pod-name>
```

---

## Expected Test Results After Deployment

| Test Suite | Expected Pass Rate |
|------------|-------------------|
| GPU Passthrough | 100% (10/10) |
| Infrastructure | 100% (15/15) |
| Services | 100% (30/30) |
| E2E Integration | 100% (15/15) |
| **TOTAL** | **70/70 (100%)** |
