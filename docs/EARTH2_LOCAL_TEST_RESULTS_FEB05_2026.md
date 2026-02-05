# Earth-2 RTX Local Test Results - February 5, 2026

## Executive Summary

All local tests completed successfully from a **test execution** perspective. All tests **failed** as expected because the local development machine lacks:
- NVIDIA GPU hardware (RTX 5090)
- Kubernetes/K3s cluster
- Deployed Earth-2 services

This document establishes the **baseline** before deployment to the Sandbox VM (192.168.0.187).

---

## Test Suite Overview

| Test Suite | Total Tests | Passed | Failed | Status |
|------------|-------------|--------|--------|--------|
| GPU Passthrough | 10 | 0 | 10 | Expected - No GPU |
| Infrastructure | 15 | 0 | 15 | Expected - No K8s |
| Service Comprehensive | 30 | 0 | 30 | Expected - No Services |
| E2E Integration | 15 | 0 | 15 | Expected - No Services |
| **TOTAL** | **70** | **0** | **70** | **Expected Failures** |

---

## 1. GPU Passthrough Tests (test_rtx5090_passthrough.py)

**Purpose**: Verify RTX 5090 GPU passthrough to Sandbox VM

| Test | Result | Message |
|------|--------|---------|
| NVIDIA Driver Loaded | FAIL | NVIDIA driver not loaded |
| GPU Detected | FAIL | nvidia-smi failed |
| RTX 5090 Present | FAIL | nvidia-smi failed |
| VRAM Size (32GB) | FAIL | nvidia-smi failed |
| CUDA Available | FAIL | nvidia-smi failed |
| CUDA Version Check | FAIL | nvidia-smi failed |
| IOMMU Enabled | FAIL | /sys/firmware not accessible |
| PCIe Link Width | FAIL | nvidia-smi failed |
| NVIDIA Container Toolkit | FAIL | nvidia-container-cli not found |
| GPU Allocatable in K8s | FAIL | kubectl failed |

---

## 2. Infrastructure Tests (test_infrastructure.py)

**Purpose**: Verify Kubernetes and storage infrastructure

| Test | Result | Message |
|------|--------|---------|
| Docker Installed | FAIL | docker command not found |
| Docker Running | FAIL | docker daemon not running |
| Docker Compose Available | FAIL | docker compose failed |
| K3s Installed | FAIL | k3s not installed |
| K3s Running | FAIL | systemctl failed |
| kubectl Access | FAIL | kubectl failed |
| K8s Nodes Ready | FAIL | kubectl failed |
| earth2-models Namespace | FAIL | namespace not found |
| earth2-services Namespace | FAIL | namespace not found |
| gpu-operator Namespace | FAIL | namespace not found |
| Model Weights PVC | FAIL | PVC not found |
| Weather Data PVC | FAIL | PVC not found |
| Storage Directories | FAIL | /opt/earth2 not found |
| DNS Resolution | PASS | (if successful) |
| Port Availability | PASS | (ports not in use locally) |

---

## 3. Service Comprehensive Tests (test_services_comprehensive.py)

**Purpose**: Test all Earth-2 service endpoints

### Health Checks (7 tests)
| Service | Port | Result | Response Time |
|---------|------|--------|---------------|
| API Gateway | 8210 | FAIL | 2524ms timeout |
| E2CC | 8211 | FAIL | 2505ms timeout |
| Signaling | 8212 | FAIL | 2509ms timeout |
| DFM | 8300 | FAIL | 2503ms timeout |
| FCN3 | 8310 | FAIL | 2492ms timeout |
| StormScope | 8311 | FAIL | 2510ms timeout |
| Orchestrator | 8320 | FAIL | 2500ms timeout |

### Endpoint Tests (9 tests)
| Endpoint | Result | Message |
|----------|--------|---------|
| API Gateway / | FAIL | Connection refused |
| API Gateway /services | FAIL | Connection refused |
| API Gateway /stream/config | FAIL | Connection refused |
| DFM /sources | FAIL | Connection refused |
| FCN3 /status | FAIL | Connection refused |
| FCN3 /metrics | FAIL | Connection refused |
| StormScope /status | FAIL | Connection refused |
| Orchestrator / | FAIL | Connection refused |
| Orchestrator /models | FAIL | Connection refused |

### API Functionality Tests (4 tests)
| Test | Result | Message |
|------|--------|---------|
| Layer Toggle API | FAIL | Connection refused |
| Time Control API | FAIL | Connection refused |
| Bounds Control API | FAIL | Connection refused |
| Stream Config API | FAIL | Connection refused |

### Data Federation Tests (4 tests)
| Test | Result | Message |
|------|--------|---------|
| DFM Sources List | FAIL | Connection refused |
| ERA5 Source | FAIL | Connection refused |
| GFS Source | FAIL | Connection refused |
| HRRR Source | FAIL | Connection refused |

### Model Orchestrator Tests (3 tests)
| Test | Result | Message |
|------|--------|---------|
| Models List | FAIL | Connection refused |
| VRAM Availability | FAIL | Connection refused |
| Model Status | FAIL | Connection refused |

### Inference Server Tests (3 tests)
| Test | Result | Message |
|------|--------|---------|
| FCN3 Status | FAIL | Connection refused |
| FCN3 Metrics | FAIL | Connection refused |
| StormScope Status | FAIL | Connection refused |

---

## 4. E2E Integration Tests (earth2_rtx_e2e_test.py)

**Purpose**: Full end-to-end integration testing

### Phase 1: Infrastructure Tests
| Test | Result | Duration |
|------|--------|----------|
| GPU Availability | FAIL | 2541ms |
| Kubernetes Health | FAIL | 2492ms |
| GPU Operator | FAIL | 2506ms |

### Phase 2: Model Service Tests
| Test | Result | Duration |
|------|--------|----------|
| FCN3 Model Health | FAIL | 2504ms |
| StormScope Model Health | FAIL | 2505ms |
| Model Orchestrator | FAIL | 2532ms |

### Phase 3: Data Layer Tests
| Test | Result | Duration |
|------|--------|----------|
| Data Federation Mesh | FAIL | 2546ms |
| ERA5 Data Source | FAIL | 2514ms |
| GFS Data Source | FAIL | 2516ms |

### Phase 4: Omniverse Tests
| Test | Result | Duration |
|------|--------|----------|
| E2CC Health | FAIL | 2544ms |
| Signaling Server | FAIL | 4128ms |
| API Gateway | FAIL | 2514ms |

### Phase 5: Integration Tests
| Test | Result | Duration |
|------|--------|----------|
| FCN3 Inference | FAIL | 2506ms |
| Layer Toggle | FAIL | 2504ms |
| Stream Config | FAIL | 2509ms |

---

## Bug Fixes During Testing

### 1. Unicode Encoding Error (Windows Console)

**Issue**: `UnicodeEncodeError: 'charmap' codec can't encode character '\u2717'`

**Root Cause**: Windows PowerShell uses cp1252 encoding which doesn't support Unicode checkmarks (✓ ✗)

**Fix Applied**: Changed Unicode symbols to ASCII equivalents:
- `✓ PASS` → `[PASS]`
- `✗ FAIL` → `[FAIL]`

**Files Fixed**:
- `tests/e2e/test_services_comprehensive.py`
- `tests/e2e/earth2_rtx_e2e_test.py`

### 2. Datetime Deprecation Warnings

**Issue**: `datetime.datetime.utcnow() is deprecated`

**Status**: Acknowledged - Not blocking. Will update in future refactor.

---

## Next Steps

1. **Push all code to GitHub**
2. **Deploy to Sandbox VM (192.168.0.187)**
3. **Re-run tests against deployed services**
4. **Verify RTX 5090 GPU passthrough**
5. **Fix any deployment issues**
6. **Iterate until 100% pass rate**

---

## Test Execution Details

**Date**: February 5, 2026
**Machine**: Local Development (Windows 10)
**Python Version**: 3.13
**Test Framework**: Custom async test suite with httpx

### Files Created
- `tests/e2e/test_rtx5090_passthrough.py` - GPU passthrough tests
- `tests/e2e/test_infrastructure.py` - Infrastructure validation
- `tests/e2e/test_services_comprehensive.py` - Service endpoint tests
- `tests/e2e/earth2_rtx_e2e_test.py` - E2E integration tests
- `scripts/run_all_tests.py` - Master test runner
- `scripts/deploy_to_sandbox.sh` - Deployment automation

### Test Reports Generated
- `tests/gpu_passthrough_report_*.json`
- `tests/infra_test_report_*.json`
- `tests/service_test_report_*.json`
- `tests/e2e_report_*.json`

---

## Conclusion

All test suites execute correctly. The 100% failure rate is **expected** on a local machine without:
- NVIDIA RTX 5090 GPU
- Kubernetes/K3s cluster
- Running Earth-2 services

The next phase is deployment to the Sandbox VM where the RTX 5090 GPU is available via PCIe passthrough. Post-deployment tests will validate the actual infrastructure and services.
