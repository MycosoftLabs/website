# NVIDIA Earth-2 RTX Full Integration Deployment Guide

**Date**: February 5, 2026  
**Version**: 1.0.0  
**Author**: Mycosoft Engineering

---

## Overview

This document provides complete deployment instructions for the NVIDIA Earth-2 RTX visualization system, integrating:

- **NVIDIA Earth2Studio**: AI weather model inference framework
- **NVIDIA Omniverse Kit**: RTX rendering engine
- **WebRTC Streaming**: Browser delivery of RTX rendered content
- **Kubernetes (K3s)**: Container orchestration with GPU support
- **Data Federation Mesh**: Real-world weather data ingestion

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ Earth2RTXStream │  │ Earth2Controls  │  │  Earth2HybridView   │ │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘ │
└───────────┼─────────────────────┼─────────────────────┼─────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      WebRTC Signaling (Node.js)                       │
│                           Port 8212                                   │
└───────────────────────────────────────────────────────────────────────┘
            │                     │
            ▼                     ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    Earth-2 Command Center (E2CC)                      │
│              NVIDIA Omniverse Kit + RTX Rendering                     │
│                     Ports 8211 (WebRTC), 8111 (API)                   │
└───────────────────────────────────────────────────────────────────────┘
            │                     │
            ▼                     ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster (K3s)                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    earth2-models namespace                       │ │
│  │  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │ │
│  │  │  FCN3   │ │StormScope │ │  Atlas   │ │ CorrDiff │ │ Pangu  │ │ │
│  │  │(always) │ │ (always)  │ │(on-demand│ │(on-demand│ │   ...  │ │ │
│  │  └─────────┘ └───────────┘ └──────────┘ └──────────┘ └────────┘ │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                   earth2-services namespace                      │ │
│  │  ┌─────────────────────┐  ┌─────────────────────────────────┐   │ │
│  │  │ Data Federation Mesh│  │     Model Orchestrator          │   │ │
│  │  │   (ERA5/GFS/HRRR)   │  │  (VRAM-aware auto-scaling)      │   │ │
│  │  └─────────────────────┘  └─────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      Proxmox VM (Sandbox)                             │
│                      GPU: NVIDIA RTX 5090 32GB                        │
│                      IP: 192.168.0.187                                │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| GPU | RTX 4080 (16GB) | RTX 5090 (32GB) |
| CPU | 8 cores | 16+ cores |
| RAM | 32GB | 64GB |
| Storage | 500GB SSD | 1TB NVMe |
| Network | 1 Gbps | 10 Gbps |

### Software Requirements

- **Proxmox VE** 8.0+ (for GPU passthrough)
- **Ubuntu 22.04 LTS** (VM OS)
- **NVIDIA Driver** 550+
- **CUDA Toolkit** 12.4+
- **Docker** 24+
- **K3s** 1.29+

---

## Deployment Steps

### Phase 1: GPU Passthrough Configuration

1. **On Proxmox Host**, run the passthrough setup script:

```bash
cd infra/proxmox
chmod +x gpu-passthrough-setup.sh
./gpu-passthrough-setup.sh
```

2. **Reboot Proxmox host** to apply IOMMU changes

3. **Verify IOMMU** is enabled:

```bash
dmesg | grep -e IOMMU
# Should show: DMAR: IOMMU enabled
```

### Phase 2: VM Setup

1. **Create Ubuntu 22.04 VM** in Proxmox with GPU passthrough

2. **SSH into VM** and run setup:

```bash
cd infra/proxmox
chmod +x vm-setup-ubuntu.sh
./vm-setup-ubuntu.sh --phase 1
# Reboot after phase 1
./vm-setup-ubuntu.sh --phase 2
```

3. **Verify GPU access**:

```bash
nvidia-smi
# Should show RTX 5090
```

### Phase 3: Kubernetes Deployment

1. **Deploy GPU Operator**:

```bash
cd infra/k8s
chmod +x deploy-gpu-operator.sh
./deploy-gpu-operator.sh
```

2. **Deploy Earth-2 Models**:

```bash
chmod +x deploy-all-models.sh
./deploy-all-models.sh
```

3. **Verify deployments**:

```bash
kubectl get pods -n earth2-models
kubectl get pods -n earth2-services
```

### Phase 4: Omniverse E2CC

1. **Build and start E2CC**:

```bash
cd services/e2cc
docker-compose up -d
```

2. **Verify E2CC is running**:

```bash
curl http://localhost:8211/health
curl http://localhost:8212/health  # Signaling
curl http://localhost:8210/health  # API Gateway
```

### Phase 5: Frontend Integration

1. **Import components in your Next.js app**:

```tsx
import { Earth2RTXStream, Earth2Controls, Earth2HybridView } from '@/components/earth2';

// Full RTX view
<Earth2HybridView initialMode="rtx" />

// Hybrid mode (RTX overlay on map)
<Earth2HybridView initialMode="hybrid" />
```

2. **Access the Earth-2 RTX page**:

```
http://localhost:3010/earth-simulator/earth2-rtx
```

---

## Model Configuration

### Always-On Models (GPU Reserved)

| Model | Port | VRAM | Purpose |
|-------|------|------|---------|
| FCN3 | 8300 | 8GB | Global 0.25° forecast |
| StormScope | 8301 | 6GB | 2-hour nowcast |

### On-Demand Models (Auto-Scaled)

| Model | Port | VRAM | Purpose |
|-------|------|------|---------|
| Atlas | 8302 | 12GB | ERA5 ensemble |
| CorrDiff | 8303 | 14GB | 1km downscaling |
| Pangu | 8304 | 16GB | 24h forecast |
| Aurora | 8305 | 20GB | Atmospheric modeling |
| FuXi | 8306 | 14GB | 15-day forecast |
| GraphCast | 8307 | 20GB | GNN weather |
| StormCast | 8308 | 16GB | Regional high-res |
| PrecipitationAFNO | 8309 | 10GB | Precipitation |
| SFNO | 8311 | 12GB | Spherical Fourier |
| TCTracker | 8312 | 8GB | Tropical cyclones |

### Scaling On-Demand Models

```bash
# Via kubectl
kubectl scale deployment/earth2-pangu -n earth2-models --replicas=1

# Via Orchestrator API
curl -X POST http://localhost:8320/scale \
  -H "Content-Type: application/json" \
  -d '{"model": "pangu", "replicas": 1, "timeout_minutes": 30}'
```

---

## Data Sources

The Data Federation Mesh supports:

| Source | Coverage | Resolution | Latency |
|--------|----------|------------|---------|
| ERA5 (ARCO) | Global | 0.25° | 5-7 days |
| GFS | Global | 0.25° | 2-4 hours |
| HRRR | CONUS | 3km | 1 hour |

---

## Omniverse Extensions

Custom extensions for CREP and FUSARIUM integration:

- `mycosoft.earth2.globe` - RTX globe rendering with weather overlays
- `mycosoft.earth2.fusarium` - Fungal species and spore dispersal
- `mycosoft.earth2.crep` - Carbon, aviation, maritime, satellite layers

---

## API Reference

### API Gateway (Port 8210)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/stream/config` | GET | WebRTC configuration |
| `/layers/toggle` | POST | Toggle visualization layer |
| `/time/set` | POST | Set visualization time |
| `/bounds/set` | POST | Set geographic bounds |
| `/model/run` | POST | Run inference model |
| `/data/sources` | GET | List data sources |

### Model Orchestrator (Port 8320)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/models` | GET | List all models |
| `/scale` | POST | Scale model up/down |
| `/heartbeat/{model}` | POST | Update model activity |

---

## Troubleshooting

### GPU Not Detected

```bash
# Check NVIDIA driver
nvidia-smi

# Check GPU operator
kubectl get pods -n gpu-operator

# Check device plugin
kubectl logs -n gpu-operator -l app=nvidia-device-plugin-daemonset
```

### Model OOM Errors

```bash
# Check VRAM usage
nvidia-smi

# Scale down other models
kubectl scale deployment/earth2-pangu -n earth2-models --replicas=0
```

### WebRTC Connection Failed

```bash
# Check signaling server
curl http://localhost:8212/health

# Check E2CC streaming
curl http://localhost:8211/health

# View signaling logs
docker logs e2cc-signaling
```

---

## Running E2E Tests

```bash
cd tests/e2e
chmod +x run_e2e_tests.sh
./run_e2e_tests.sh
```

---

## File Structure

```
website/
├── components/earth2/
│   ├── Earth2RTXStream.tsx      # WebRTC stream component
│   ├── Earth2Controls.tsx       # Layer/model controls
│   ├── Earth2HybridView.tsx     # Hybrid rendering mode
│   └── index.ts
├── services/
│   ├── e2cc/                    # Omniverse Kit config
│   │   ├── docker-compose.yml
│   │   ├── kit-app/
│   │   ├── signaling/
│   │   ├── api-gateway/
│   │   └── extensions/
│   ├── earth2-inference/        # Model inference server
│   ├── data-federation/         # Weather data mesh
│   └── model-orchestrator/      # VRAM-aware scaling
├── infra/
│   ├── proxmox/                 # GPU passthrough scripts
│   └── k8s/
│       ├── earth2-models/       # Model deployments
│       └── earth2-services/     # Service deployments
└── tests/e2e/                   # End-to-end tests
```

---

## Next Steps

1. **Download Model Weights**: Models will auto-download from HuggingFace on first run
2. **Configure Data Sources**: Update DFM with API keys if needed
3. **Customize Extensions**: Modify Omniverse extensions for specific visualization needs
4. **Performance Tuning**: Adjust bitrate, resolution based on network conditions

---

## Support

- **NVIDIA Earth-2 Docs**: https://docs.nvidia.com/earth-2/
- **Earth2Studio GitHub**: https://github.com/NVIDIA/earth2studio
- **Omniverse Docs**: https://docs.omniverse.nvidia.com/

---

*Document generated: February 5, 2026*
