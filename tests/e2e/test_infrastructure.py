"""
Infrastructure Tests - February 5, 2026

Tests for Kubernetes, Docker, storage, and networking infrastructure.
"""

import asyncio
import subprocess
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Tuple

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
        return {"name": self.name, "passed": self.passed, "message": self.message, "details": self.details, "timestamp": self.timestamp}


class InfrastructureTests:
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
        print("  Infrastructure Test Suite")
        print(f"  Target: {'Remote ' + self.host if self.remote else 'Local'}")
        print(f"  Started: {datetime.utcnow().isoformat()}")
        print("=" * 60 + "\n")
        
        print("Docker Tests")
        print("-" * 40)
        self._run_test("Docker Installed", self.test_docker_installed)
        self._run_test("Docker Running", self.test_docker_running)
        self._run_test("Docker Compose", self.test_docker_compose)
        
        print("\nKubernetes Tests")
        print("-" * 40)
        self._run_test("K3s Installed", self.test_k3s_installed)
        self._run_test("K3s Running", self.test_k3s_running)
        self._run_test("Kubectl Access", self.test_kubectl)
        self._run_test("Nodes Ready", self.test_nodes_ready)
        
        print("\nNamespace Tests")
        print("-" * 40)
        self._run_test("earth2-models Namespace", self.test_earth2_models_ns)
        self._run_test("earth2-services Namespace", self.test_earth2_services_ns)
        self._run_test("gpu-operator Namespace", self.test_gpu_operator_ns)
        
        print("\nStorage Tests")
        print("-" * 40)
        self._run_test("Model Weights PVC", self.test_model_weights_pvc)
        self._run_test("Weather Data PVC", self.test_weather_data_pvc)
        self._run_test("Storage Directories", self.test_storage_dirs)
        
        print("\nNetwork Tests")
        print("-" * 40)
        self._run_test("DNS Resolution", self.test_dns)
        self._run_test("Internet Connectivity", self.test_internet)
        self._run_test("Port Availability", self.test_ports)
        
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
    
    # Docker Tests
    def test_docker_installed(self) -> TestResult:
        code, out, err = self._run_cmd("docker --version")
        if code == 0 and "Docker version" in out:
            return TestResult("Docker Installed", True, out.strip())
        return TestResult("Docker Installed", False, f"Docker not installed: {err}")
    
    def test_docker_running(self) -> TestResult:
        code, out, err = self._run_cmd("docker ps")
        if code == 0:
            return TestResult("Docker Running", True, "Docker daemon is running")
        return TestResult("Docker Running", False, f"Docker not running: {err}")
    
    def test_docker_compose(self) -> TestResult:
        code, out, err = self._run_cmd("docker compose version 2>/dev/null || docker-compose --version")
        if code == 0:
            return TestResult("Docker Compose", True, out.strip())
        return TestResult("Docker Compose", False, "Docker Compose not available")
    
    # Kubernetes Tests
    def test_k3s_installed(self) -> TestResult:
        code, out, err = self._run_cmd("k3s --version")
        if code == 0:
            return TestResult("K3s Installed", True, out.strip().split('\n')[0])
        return TestResult("K3s Installed", False, "K3s not installed")
    
    def test_k3s_running(self) -> TestResult:
        code, out, err = self._run_cmd("systemctl is-active k3s")
        if code == 0 and "active" in out:
            return TestResult("K3s Running", True, "K3s service is active")
        return TestResult("K3s Running", False, f"K3s not running: {out}")
    
    def test_kubectl(self) -> TestResult:
        code, out, err = self._run_cmd("kubectl cluster-info")
        if code == 0:
            return TestResult("Kubectl Access", True, "Cluster accessible")
        return TestResult("Kubectl Access", False, f"Cannot access cluster: {err}")
    
    def test_nodes_ready(self) -> TestResult:
        code, out, err = self._run_cmd("kubectl get nodes -o json")
        if code == 0:
            try:
                nodes = json.loads(out)
                ready = 0
                for node in nodes.get("items", []):
                    for cond in node.get("status", {}).get("conditions", []):
                        if cond.get("type") == "Ready" and cond.get("status") == "True":
                            ready += 1
                total = len(nodes.get("items", []))
                if ready == total and total > 0:
                    return TestResult("Nodes Ready", True, f"{ready}/{total} nodes ready")
                return TestResult("Nodes Ready", False, f"Only {ready}/{total} nodes ready")
            except json.JSONDecodeError:
                return TestResult("Nodes Ready", False, "Could not parse node info")
        return TestResult("Nodes Ready", False, f"kubectl failed: {err}")
    
    # Namespace Tests
    def test_earth2_models_ns(self) -> TestResult:
        code, out, err = self._run_cmd("kubectl get namespace earth2-models -o json 2>/dev/null")
        if code == 0:
            try:
                ns = json.loads(out)
                if ns.get("status", {}).get("phase") == "Active":
                    return TestResult("earth2-models NS", True, "Namespace active")
            except json.JSONDecodeError:
                pass
        return TestResult("earth2-models NS", False, "Namespace not found or not active")
    
    def test_earth2_services_ns(self) -> TestResult:
        code, out, err = self._run_cmd("kubectl get namespace earth2-services -o json 2>/dev/null")
        if code == 0:
            try:
                ns = json.loads(out)
                if ns.get("status", {}).get("phase") == "Active":
                    return TestResult("earth2-services NS", True, "Namespace active")
            except json.JSONDecodeError:
                pass
        return TestResult("earth2-services NS", False, "Namespace not found or not active")
    
    def test_gpu_operator_ns(self) -> TestResult:
        code, out, err = self._run_cmd("kubectl get namespace gpu-operator -o json 2>/dev/null")
        if code == 0:
            try:
                ns = json.loads(out)
                if ns.get("status", {}).get("phase") == "Active":
                    return TestResult("gpu-operator NS", True, "Namespace active")
            except json.JSONDecodeError:
                pass
        return TestResult("gpu-operator NS", False, "Namespace not found or not active")
    
    # Storage Tests
    def test_model_weights_pvc(self) -> TestResult:
        code, out, err = self._run_cmd("kubectl get pvc earth2-model-weights -n earth2-models -o json 2>/dev/null")
        if code == 0:
            try:
                pvc = json.loads(out)
                if pvc.get("status", {}).get("phase") == "Bound":
                    return TestResult("Model Weights PVC", True, "PVC bound")
            except json.JSONDecodeError:
                pass
        return TestResult("Model Weights PVC", False, "PVC not found or not bound")
    
    def test_weather_data_pvc(self) -> TestResult:
        code, out, err = self._run_cmd("kubectl get pvc earth2-weather-data -n earth2-models -o json 2>/dev/null")
        if code == 0:
            try:
                pvc = json.loads(out)
                if pvc.get("status", {}).get("phase") == "Bound":
                    return TestResult("Weather Data PVC", True, "PVC bound")
            except json.JSONDecodeError:
                pass
        return TestResult("Weather Data PVC", False, "PVC not found or not bound")
    
    def test_storage_dirs(self) -> TestResult:
        code, out, err = self._run_cmd("ls -la /opt/earth2/ 2>/dev/null | head -10")
        if code == 0 and ("models" in out or "data" in out):
            return TestResult("Storage Directories", True, "/opt/earth2 directories exist")
        return TestResult("Storage Directories", False, "/opt/earth2 directories not found")
    
    # Network Tests
    def test_dns(self) -> TestResult:
        code, out, err = self._run_cmd("nslookup google.com 2>/dev/null | head -5")
        if code == 0 and "Address" in out:
            return TestResult("DNS Resolution", True, "DNS working")
        return TestResult("DNS Resolution", False, "DNS resolution failed")
    
    def test_internet(self) -> TestResult:
        code, out, err = self._run_cmd("curl -s -o /dev/null -w '%{http_code}' https://www.google.com --max-time 10")
        if code == 0 and out.strip() in ["200", "301", "302"]:
            return TestResult("Internet Connectivity", True, "Internet accessible")
        return TestResult("Internet Connectivity", False, f"No internet: {out}")
    
    def test_ports(self) -> TestResult:
        ports_to_check = [8210, 8211, 8212, 8300, 8310, 8320]
        available = []
        in_use = []
        for port in ports_to_check:
            code, out, err = self._run_cmd(f"ss -tuln | grep :{port}")
            if code == 0 and str(port) in out:
                in_use.append(port)
            else:
                available.append(port)
        return TestResult("Port Availability", True, f"Available: {len(available)}, In use: {len(in_use)}", {"available": available, "in_use": in_use})
    
    def _generate_report(self) -> Dict:
        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)
        total = len(self.results)
        
        report = {
            "suite": "Infrastructure Tests",
            "target": self.host if self.remote else "localhost",
            "summary": {"total": total, "passed": passed, "failed": failed, "pass_rate": f"{(passed / total * 100):.1f}%" if total > 0 else "0%"},
            "results": [r.to_dict() for r in self.results],
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        print("\n" + "=" * 60)
        print("  Infrastructure Test Summary")
        print("=" * 60)
        print(f"  Total:  {total}")
        print(f"  Passed: {passed}")
        print(f"  Failed: {failed}")
        print(f"  Rate:   {report['summary']['pass_rate']}")
        print("=" * 60 + "\n")
        
        return report


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Infrastructure Tests")
    parser.add_argument("--remote", action="store_true", help="Run tests on remote host")
    parser.add_argument("--host", default=SANDBOX_VM_IP, help="Remote host IP")
    args = parser.parse_args()
    
    suite = InfrastructureTests(remote=args.remote, host=args.host)
    report = suite.run_all_tests()
    
    report_file = f"tests/infrastructure_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    os.makedirs(os.path.dirname(report_file), exist_ok=True)
    with open(report_file, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Report saved to: {report_file}")
    
    sys.exit(0 if report["summary"]["failed"] == 0 else 1)


if __name__ == "__main__":
    main()
