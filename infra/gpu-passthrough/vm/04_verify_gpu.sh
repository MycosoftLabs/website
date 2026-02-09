#!/bin/bash
# Verify GPU passthrough is fully working
# Run on Sandbox VM (192.168.0.187)

echo "=============================================="
echo "  GPU Passthrough Verification"
echo "=============================================="

PASSED=0
FAILED=0

# Test 1: PCI device
echo ""
echo ">>> Test 1: PCI Device Detection"
if lspci | grep -i nvidia; then
    echo "[PASS] NVIDIA GPU detected in PCI"
    ((PASSED++))
else
    echo "[FAIL] No NVIDIA GPU in PCI"
    ((FAILED++))
fi

# Test 2: NVIDIA driver loaded
echo ""
echo ">>> Test 2: NVIDIA Driver Module"
if lsmod | grep -q nvidia; then
    echo "[PASS] NVIDIA driver module loaded"
    ((PASSED++))
else
    echo "[FAIL] NVIDIA driver module not loaded"
    ((FAILED++))
fi

# Test 3: nvidia-smi works
echo ""
echo ">>> Test 3: nvidia-smi"
if nvidia-smi &>/dev/null; then
    echo "[PASS] nvidia-smi works"
    nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv
    ((PASSED++))
else
    echo "[FAIL] nvidia-smi failed"
    ((FAILED++))
fi

# Test 4: CUDA available
echo ""
echo ">>> Test 4: CUDA Installation"
if [ -f /usr/local/cuda/version.json ] || [ -d /usr/local/cuda-12.8 ]; then
    echo "[PASS] CUDA installed"
    cat /usr/local/cuda/version.json 2>/dev/null || ls /usr/local/cuda* 2>/dev/null | head -1
    ((PASSED++))
else
    echo "[FAIL] CUDA not found"
    ((FAILED++))
fi

# Test 5: nvcc compiler
echo ""
echo ">>> Test 5: CUDA Compiler (nvcc)"
if command -v nvcc &>/dev/null; then
    echo "[PASS] nvcc available"
    nvcc --version | head -4
    ((PASSED++))
else
    echo "[FAIL] nvcc not in PATH"
    ((FAILED++))
fi

# Test 6: Docker GPU
echo ""
echo ">>> Test 6: Docker GPU Access"
if docker run --rm --gpus all nvidia/cuda:12.8.0-base-ubuntu24.04 nvidia-smi &>/dev/null; then
    echo "[PASS] Docker can access GPU"
    ((PASSED++))
else
    echo "[FAIL] Docker cannot access GPU"
    ((FAILED++))
fi

# Test 7: GPU memory allocation
echo ""
echo ">>> Test 7: GPU Memory Test"
python3 -c "
import subprocess
result = subprocess.run(['nvidia-smi', '--query-gpu=memory.total,memory.free', '--format=csv,noheader,nounits'], capture_output=True, text=True)
if result.returncode == 0:
    total, free = result.stdout.strip().split(', ')
    print(f'Total VRAM: {total} MB')
    print(f'Free VRAM: {free} MB')
    exit(0)
exit(1)
" 2>/dev/null && ((PASSED++)) || ((FAILED++))

# Summary
echo ""
echo "=============================================="
echo "  Verification Summary"
echo "=============================================="
echo ""
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "[SUCCESS] GPU passthrough is fully working!"
    echo ""
    echo "GPU Details:"
    nvidia-smi --query-gpu=name,memory.total,driver_version,compute_cap --format=csv
    exit 0
else
    echo "[WARNING] Some tests failed - check configuration"
    exit 1
fi
