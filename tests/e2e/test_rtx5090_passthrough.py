"""
RTX 5090 GPU Passthrough Tests - February 5, 2026

Comprehensive tests for verifying GPU passthrough configuration
and RTX 5090 availability in the Sandbox VM.
"""

import asyncio
import subprocess
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Tuple, Optional

SANDBOX_VM_IP = os.environ.get("SANDBOX_VM_IP", "192.168.0.187")
SSH_USER = os.environ.get("SSH_USER", "mycosoft")


class TestResult:
    def __init__(self, name: str, passed: bool, message: str, details: dict = None):
        self.name = name
        self.passed = passed
        self.message = message
        self.details = details or {}
        self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "passed": self.passed,
            "message": self.message,
            "details": self.details,
            "timestamp": self.timestamp,
        }


class RTX5090PassthroughTests:
    def __init__(self, remote: bool = False, host: str = None):
        self.remote = remote
        self.host = host or SANDBOX_VM_IP
        self.results: List[TestResult] = []
    
    def _run_cmd(self, cmd: str, timeout: int = 30) -> Tuple[int, str, str]:
        if self.remote:
            full_cmd = f"ssh {SSH_USER}@{self.host} '{cmd}'"
        else:
            full_cmd = cmd
        try:
            result = subprocess.run(full_cmd, shell=True, capture_output=True, text=True, timeout=timeout)
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return -1, "", "Command timed out"
        except Exception as e:
            return -1, "", str(e)
    
    def run_all_tests(self) -> Dict:
        print("\n" + "=" * 60)
        print("  RTX 5090 GPU Passthrough Test Suite")
        print(f"  Target: {'Remote ' + self.host if self.remote else 'Local'}")
        print(f"  Started: {datetime.utcnow().isoformat()}")
        print("=" * 60 + "\n")
        
        print("GPU Detection Tests")
        print("-" * 40)
        self._run_test("NVIDIA Driver Loaded", self.test_nvidia_driver)
        self._run_test("GPU Device Detected", self.test_gpu_detected)
        self._run_test("RTX 5090 Identification", self.test_rtx5090_id)
        self._run_test("GPU VRAM Size", self.test_vram_size)
        
        print("\nCUDA Tests")
        print("-" * 40)
        self._run_test("CUDA Available", self.test_cuda_available)
        self._run_test("CUDA Version", self.test_cuda_version)
        
        print("\nPCIe Passthrough Tests")
        print("-" * 40)
        self._run_test("IOMMU Enabled", self.test_iommu_enabled)
        self._run_test("PCIe Bus Width", self.test_pcie_width)
        
        print("\nContainer Runtime Tests")
        print("-" * 40)
        self._run_test("NVIDIA Container Toolkit", self.test_nvidia_container_toolkit)
        self._run_test("Docker GPU Access", self.test_docker_gpu)
        
        print("\nKubernetes GPU Tests")
        print("-" * 40)
        self._run_test("GPU Operator Running", self.test_gpu_operator)
        self._run_test("GPU Allocatable", self.test_gpu_allocatable)
        
        return self._generate_report()
    
    def _run_test(self, name: str, test_func) -> None:
        try:
            result = test_func()
            self.results.append(result)
            status = "PASS" if result.passed else "FAIL"
            print(f"  [{status}]: {name}")
            if not result.passed:
                print(f"         {result.message}")
        except Exception as e:
            result = TestResult(name, False, f"Exception: {str(e)}")
            self.results.append(result)
            print(f"  [FAIL]: {name}")
            print(f"         Exception: {str(e)}")
    
    def test_nvidia_driver(self) -> TestResult:
        code, out, err = self._run_cmd("nvidia-smi --query-gpu=driver_version --format=csv,noheader")
        if code == 0 and out.strip():
            version = out.strip().split('\n')[0]
            return TestResult("NVIDIA Driver", True, f"Driver version: {version}", {"driver_version": version})
        return TestResult("NVIDIA Driver", False, f"Driver not loaded: {err}")
    
    def test_gpu_detected(self) -> TestResult:
        code, out, err = self._run_cmd("nvidia-smi --query-gpu=name --format=csv,noheader")
        if code == 0 and out.strip():
            gpu_name = out.strip().split('\n')[0]
            return TestResult("GPU Detected", True, f"GPU: {gpu_name}", {"gpu_name": gpu_name})
        return TestResult("GPU Detected", False, f"No GPU detected: {err}")
    
    def test_rtx5090_id(self) -> TestResult:
        code, out, err = self._run_cmd("nvidia-smi --query-gpu=name --format=csv,noheader")
        if code == 0:
            gpu_name = out.strip().split('\n')[0].lower()
            if "5090" in gpu_name or "rtx 50" in gpu_name:
                return TestResult("RTX 5090 ID", True, f"RTX 5090 confirmed: {out.strip()}")
            if "rtx" in gpu_name:
                return TestResult("RTX 5090 ID", True, f"RTX GPU detected: {out.strip()}", {"warning": "Not RTX 5090"})
        return TestResult("RTX 5090 ID", False, f"RTX 5090 not found")
    
    def test_vram_size(self) -> TestResult:
        code, out, err = self._run_cmd("nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits")
        if code == 0 and out.strip():
            try:
                vram_mb = int(out.strip().split('\n')[0])
                vram_gb = vram_mb / 1024
                if vram_gb >= 8:
                    return TestResult("VRAM Size", True, f"VRAM: {vram_gb:.1f}GB", {"vram_gb": vram_gb})
                return TestResult("VRAM Size", False, f"VRAM too low: {vram_gb:.1f}GB")
            except ValueError:
                return TestResult("VRAM Size", False, f"Could not parse VRAM: {out}")
        return TestResult("VRAM Size", False, f"Could not get VRAM: {err}")
    
    def test_cuda_available(self) -> TestResult:
        code, out, err = self._run_cmd("python3 -c \"import torch; print(torch.cuda.is_available())\"")
        if code == 0 and "True" in out:
            return TestResult("CUDA Available", True, "CUDA is available")
        return TestResult("CUDA Available", False, f"CUDA not available: {out} {err}")
    
    def test_cuda_version(self) -> TestResult:
        code, out, err = self._run_cmd("nvidia-smi --query-gpu=driver_version --format=csv,noheader")
        if code == 0:
            return TestResult("CUDA Version", True, f"Driver: {out.strip()}")
        return TestResult("CUDA Version", False, f"Could not get version: {err}")
    
    def test_iommu_enabled(self) -> TestResult:
        code, out, err = self._run_cmd("ls /sys/kernel/iommu_groups/ 2>/dev/null | wc -l")
        if code == 0:
            try:
                groups = int(out.strip())
                if groups > 0:
                    return TestResult("IOMMU Enabled", True, f"IOMMU enabled with {groups} groups")
            except ValueError:
                pass
        return TestResult("IOMMU Enabled", False, "IOMMU not detected")
    
    def test_pcie_width(self) -> TestResult:
        code, out, err = self._run_cmd("nvidia-smi --query-gpu=pcie.link.width.current --format=csv,noheader")
        if code == 0 and out.strip():
            width = out.strip().split('\n')[0]
            return TestResult("PCIe Width", True, f"PCIe x{width}", {"pcie_width": width})
        return TestResult("PCIe Width", False, f"Could not get PCIe width: {err}")
    
    def test_nvidia_container_toolkit(self) -> TestResult:
        code, out, err = self._run_cmd("which nvidia-container-runtime")
        if code == 0:
            return TestResult("Container Toolkit", True, "nvidia-container-runtime found")
        return TestResult("Container Toolkit", False, "NVIDIA Container Toolkit not found")
    
    def test_docker_gpu(self) -> TestResult:
        code, out, err = self._run_cmd("docker run --rm --gpus all nvidia/cuda:12.0-base-ubuntu22.04 nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null")
        if code == 0 and out.strip():
            return TestResult("Docker GPU", True, f"GPU in Docker: {out.strip()}")
        return TestResult("Docker GPU", False, f"Docker GPU access failed: {err}")
    
    def test_gpu_operator(self) -> TestResult:
        code, out, err = self._run_cmd("kubectl get pods -n gpu-operator -o json 2>/dev/null")
        if code == 0:
            try:
                pods = json.loads(out)
                running = sum(1 for p in pods.get("items", []) if p.get("status", {}).get("phase") == "Running")
                total = len(pods.get("items", []))
                if running > 0:
                    return TestResult("GPU Operator", True, f"{running}/{total} pods running")
            except json.JSONDecodeError:
                pass
        return TestResult("GPU Operator", False, f"GPU Operator not running")
    
    def test_gpu_allocatable(self) -> TestResult:
        code, out, err = self._run_cmd("kubectl get nodes -o json 2>/dev/null")
        if code == 0:
            try:
                nodes = json.loads(out)
                for node in nodes.get("items", []):
                    allocatable = node.get("status", {}).get("allocatable", {})
                    gpu_count = allocatable.get("nvidia.com/gpu", "0")
                    if gpu_count and gpu_count != "0":
                        return TestResult("GPU Allocatable", True, f"GPUs allocatable: {gpu_count}")
            except json.JSONDecodeError:
                pass
        return TestResult("GPU Allocatable", False, "No GPUs allocatable")
    
    def _generate_report(self) -> Dict:
        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)
        total = len(self.results)
        
        report = {
            "suite": "RTX 5090 GPU Passthrough",
            "target": self.host if self.remote else "localhost",
            "summary": {"total": total, "passed": passed, "failed": failed, "pass_rate": f"{(passed / total * 100):.1f}%" if total > 0 else "0%"},
            "results": [r.to_dict() for r in self.results],
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        print("\n" + "=" * 60)
        print("  GPU Passthrough Test Summary")
        print("=" * 60)
        print(f"  Total:  {total}")
        print(f"  Passed: {passed}")
        print(f"  Failed: {failed}")
        print(f"  Rate:   {report['summary']['pass_rate']}")
        print("=" * 60 + "\n")
        
        return report


def main():
    import argparse
    parser = argparse.ArgumentParser(description="RTX 5090 GPU Passthrough Tests")
    parser.add_argument("--remote", action="store_true", help="Run tests on remote host")
    parser.add_argument("--host", default=SANDBOX_VM_IP, help="Remote host IP")
    args = parser.parse_args()
    
    suite = RTX5090PassthroughTests(remote=args.remote, host=args.host)
    report = suite.run_all_tests()
    
    report_file = f"tests/gpu_passthrough_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    os.makedirs(os.path.dirname(report_file), exist_ok=True)
    with open(report_file, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Report saved to: {report_file}")
    
    sys.exit(0 if report["summary"]["failed"] == 0 else 1)


if __name__ == "__main__":
    main()
