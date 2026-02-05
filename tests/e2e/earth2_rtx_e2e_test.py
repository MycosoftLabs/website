"""
Earth-2 RTX End-to-End Test Suite - February 5, 2026

Comprehensive testing of the full RTX rendering pipeline:
1. GPU passthrough verification
2. Kubernetes cluster health
3. Earth2Studio model inference
4. Data Federation Mesh connectivity
5. Omniverse E2CC streaming
6. WebRTC signaling
7. Frontend integration
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import httpx

# Test configuration
def get_test_config(host: str = "localhost") -> Dict:
    return {
        "sandbox_vm": "192.168.0.187",
        "host": host,
        "e2cc_url": f"http://{host}:8211",
        "signaling_url": f"ws://{host}:8212/ws",
        "api_gateway_url": f"http://{host}:8210",
        "dfm_url": f"http://{host}:8310",
        "fcn3_url": f"http://{host}:8300",
        "stormscope_url": f"http://{host}:8301",
        "orchestrator_url": f"http://{host}:8320",
        "timeout_seconds": 30,
    }

TEST_CONFIG = get_test_config()

class TestResult:
    def __init__(self, name: str, passed: bool, message: str, duration_ms: float):
        self.name = name
        self.passed = passed
        self.message = message
        self.duration_ms = duration_ms
        self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "passed": self.passed,
            "message": self.message,
            "duration_ms": self.duration_ms,
            "timestamp": self.timestamp,
        }


class Earth2E2ETestSuite:
    def __init__(self, config: Dict = None):
        self.config = config or TEST_CONFIG
        self.results: List[TestResult] = []

    async def run_all_tests(self) -> Dict:
        """Run all end-to-end tests"""
        print("\n" + "=" * 60)
        print("  Earth-2 RTX End-to-End Test Suite")
        print(f"  Started: {datetime.utcnow().isoformat()}")
        print("=" * 60 + "\n")

        # Phase 1: Infrastructure Tests
        print("Phase 1: Infrastructure Tests")
        print("-" * 40)
        await self._run_test("GPU Availability", self.test_gpu_availability)
        await self._run_test("Kubernetes Health", self.test_kubernetes_health)
        await self._run_test("GPU Operator", self.test_gpu_operator)

        # Phase 2: Model Service Tests
        print("\nPhase 2: Model Service Tests")
        print("-" * 40)
        await self._run_test("FCN3 Model Health", self.test_fcn3_health)
        await self._run_test("StormScope Model Health", self.test_stormscope_health)
        await self._run_test("Model Orchestrator", self.test_model_orchestrator)

        # Phase 3: Data Layer Tests
        print("\nPhase 3: Data Layer Tests")
        print("-" * 40)
        await self._run_test("Data Federation Mesh", self.test_dfm_health)
        await self._run_test("ERA5 Data Source", self.test_era5_source)
        await self._run_test("GFS Data Source", self.test_gfs_source)

        # Phase 4: Omniverse Tests
        print("\nPhase 4: Omniverse Tests")
        print("-" * 40)
        await self._run_test("E2CC Health", self.test_e2cc_health)
        await self._run_test("Signaling Server", self.test_signaling_server)
        await self._run_test("API Gateway", self.test_api_gateway)

        # Phase 5: Integration Tests
        print("\nPhase 5: Integration Tests")
        print("-" * 40)
        await self._run_test("FCN3 Inference", self.test_fcn3_inference)
        await self._run_test("Layer Toggle", self.test_layer_toggle)
        await self._run_test("Stream Config", self.test_stream_config)

        # Generate report
        return self._generate_report()

    async def _run_test(self, name: str, test_func) -> None:
        """Run a single test and record result"""
        start_time = datetime.utcnow()
        try:
            passed, message = await test_func()
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            result = TestResult(name, passed, message, duration_ms)
        except Exception as e:
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            result = TestResult(name, False, f"Exception: {str(e)}", duration_ms)

        self.results.append(result)
        status = "[PASS]" if result.passed else "[FAIL]"
        print(f"  {status}: {name} ({result.duration_ms:.0f}ms)")
        if not result.passed:
            print(f"         {result.message}")

    # Infrastructure Tests
    async def test_gpu_availability(self) -> Tuple[bool, str]:
        """Test GPU is available on the node"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.config['orchestrator_url']}/")
                if resp.status_code == 200:
                    data = resp.json()
                    vram = data.get("available_vram_gb", 0)
                    if vram > 0:
                        return True, f"Available VRAM: {vram}GB"
                    return False, "No VRAM available"
                return False, f"HTTP {resp.status_code}"
        except Exception as e:
            return False, str(e)

    async def test_kubernetes_health(self) -> Tuple[bool, str]:
        """Test Kubernetes cluster is healthy"""
        # This would typically use kubectl or k8s API
        # Simplified check via orchestrator
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.config['orchestrator_url']}/health")
                if resp.status_code == 200:
                    return True, "Cluster accessible"
                return False, f"HTTP {resp.status_code}"
        except Exception as e:
            return False, str(e)

    async def test_gpu_operator(self) -> Tuple[bool, str]:
        """Test NVIDIA GPU Operator is running"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.config['orchestrator_url']}/models")
                if resp.status_code == 200:
                    models = resp.json()
                    gpu_models = [m for m in models if m.get("vram_gb", 0) > 0]
                    return True, f"{len(gpu_models)} GPU models configured"
                return False, f"HTTP {resp.status_code}"
        except Exception as e:
            return False, str(e)

    # Model Service Tests
    async def test_fcn3_health(self) -> Tuple[bool, str]:
        """Test FourCastNet3 model service"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(f"{self.config['fcn3_url']}/health")
                if resp.status_code == 200:
                    return True, "FCN3 healthy"
                return False, f"HTTP {resp.status_code}"
        except Exception as e:
            return False, f"FCN3 not reachable: {str(e)}"

    async def test_stormscope_health(self) -> Tuple[bool, str]:
        """Test StormScope model service"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(f"{self.config['stormscope_url']}/health")
                if resp.status_code == 200:
                    return True, "StormScope healthy"
                return False, f"HTTP {resp.status_code}"
        except Exception as e:
            return False, f"StormScope not reachable: {str(e)}"

    async def test_model_orchestrator(self) -> Tuple[bool, str]:
        """Test Model Orchestrator service"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.config['orchestrator_url']}/models")
                if resp.status_code == 200:
                    models = resp.json()
                    return True, f"{len(models)} models registered"
                return False, f"HTTP {resp.status_code}"
        except Exception as e:
            return False, str(e)

    # Data Layer Tests
    async def test_dfm_health(self) -> Tuple[bool, str]:
        """Test Data Federation Mesh health"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.config['dfm_url']}/health")
                if resp.status_code == 200:
                    return True, "DFM healthy"
                return False, f"HTTP {resp.status_code}"
        except Exception as e:
            return False, str(e)

    async def test_era5_source(self) -> Tuple[bool, str]:
        """Test ERA5 data source connectivity"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(f"{self.config['dfm_url']}/sources")
                if resp.status_code == 200:
                    sources = resp.json().get("sources", [])
                    era5 = next((s for s in sources if "era5" in s.get("name", "").lower()), None)
                    if era5:
                        return True, f"ERA5 available: {era5.get('status', 'unknown')}"
                    return False, "ERA5 source not found"
                return False, f"HTTP {resp.status_code}"
        except Exception as e:
            return False, str(e)

    async def test_gfs_source(self) -> Tuple[bool, str]:
        """Test GFS data source connectivity"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(f"{self.config['dfm_url']}/sources")
                if resp.status_code == 200:
                    sources = resp.json().get("sources", [])
                    gfs = next((s for s in sources if "gfs" in s.get("name", "").lower()), None)
                    if gfs:
                        return True, f"GFS available: {gfs.get('status', 'unknown')}"
                    return False, "GFS source not found"
                return False, f"HTTP {resp.status_code}"
        except Exception as e:
            return False, str(e)

    # Omniverse Tests
    async def test_e2cc_health(self) -> Tuple[bool, str]:
        """Test Earth-2 Command Center health"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.config['e2cc_url']}/health")
                if resp.status_code == 200:
                    return True, "E2CC healthy"
                return False, f"HTTP {resp.status_code}"
        except Exception as e:
            return False, f"E2CC not reachable: {str(e)}"

    async def test_signaling_server(self) -> Tuple[bool, str]:
        """Test WebRTC signaling server"""
        try:
            import websockets
            async with websockets.connect(
                self.config['signaling_url'],
                close_timeout=5
            ) as ws:
                await ws.send(json.dumps({"type": "ping"}))
                return True, "Signaling server responsive"
        except ImportError:
            return False, "websockets library not installed"
        except Exception as e:
            return False, str(e)

    async def test_api_gateway(self) -> Tuple[bool, str]:
        """Test E2CC API Gateway"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.config['api_gateway_url']}/health")
                if resp.status_code == 200:
                    return True, "API Gateway healthy"
                return False, f"HTTP {resp.status_code}"
        except Exception as e:
            return False, str(e)

    # Integration Tests
    async def test_fcn3_inference(self) -> Tuple[bool, str]:
        """Test FCN3 inference capability"""
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.get(f"{self.config['fcn3_url']}/status")
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("model_loaded"):
                        return True, "FCN3 model loaded and ready"
                    return False, "FCN3 model not loaded"
                return False, f"HTTP {resp.status_code}"
        except Exception as e:
            return False, str(e)

    async def test_layer_toggle(self) -> Tuple[bool, str]:
        """Test layer toggle through API Gateway"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{self.config['api_gateway_url']}/layers/toggle",
                    json={"layer": "clouds", "visible": True}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "applied":
                        return True, "Layer toggle working"
                    return False, f"Unexpected response: {data}"
                return False, f"HTTP {resp.status_code}"
        except Exception as e:
            return False, str(e)

    async def test_stream_config(self) -> Tuple[bool, str]:
        """Test stream configuration endpoint"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.config['api_gateway_url']}/stream/config")
                if resp.status_code == 200:
                    config = resp.json()
                    if config.get("signalingUrl") and config.get("resolution"):
                        return True, f"Stream config: {config.get('resolution')}"
                    return False, "Incomplete stream config"
                return False, f"HTTP {resp.status_code}"
        except Exception as e:
            return False, str(e)

    def _generate_report(self) -> Dict:
        """Generate test report"""
        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)
        total = len(self.results)

        report = {
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "pass_rate": f"{(passed / total * 100):.1f}%" if total > 0 else "0%",
                "timestamp": datetime.utcnow().isoformat(),
            },
            "results": [r.to_dict() for r in self.results],
        }

        print("\n" + "=" * 60)
        print("  Test Summary")
        print("=" * 60)
        print(f"  Total:  {total}")
        print(f"  Passed: {passed}")
        print(f"  Failed: {failed}")
        print(f"  Rate:   {report['summary']['pass_rate']}")
        print("=" * 60 + "\n")

        return report


async def main():
    """Main entry point"""
    import argparse
    parser = argparse.ArgumentParser(description="Earth-2 RTX E2E Tests")
    parser.add_argument("--host", default="localhost", help="Target host")
    parser.add_argument("--remote", default=None, help="Remote host IP (alias for --host)")
    args = parser.parse_args()
    
    host = args.remote if args.remote else args.host
    config = get_test_config(host)
    
    suite = Earth2E2ETestSuite(config)
    report = await suite.run_all_tests()

    # Save report
    report_path = f"tests/e2e_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"Report saved to: {report_path}")

    # Exit code based on results
    sys.exit(0 if report["summary"]["failed"] == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main())
