"""
Comprehensive Service Tests - February 5, 2026

Tests all Earth-2 RTX services for health, functionality, and integration.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import httpx

# Service endpoints configuration
SERVICES = {
    "api_gateway": {
        "url": "http://localhost:8210",
        "health": "/health",
        "endpoints": ["/", "/services", "/stream/config"],
    },
    "e2cc": {
        "url": "http://localhost:8211",
        "health": "/health",
        "endpoints": [],
    },
    "signaling": {
        "url": "http://localhost:8212",
        "health": "/health",
        "endpoints": [],
    },
    "dfm": {
        "url": "http://localhost:8310",
        "health": "/health",
        "endpoints": ["/sources"],
    },
    "fcn3": {
        "url": "http://localhost:8300",
        "health": "/health",
        "endpoints": ["/status", "/metrics"],
    },
    "stormscope": {
        "url": "http://localhost:8301",
        "health": "/health",
        "endpoints": ["/status"],
    },
    "orchestrator": {
        "url": "http://localhost:8320",
        "health": "/health",
        "endpoints": ["/", "/models"],
    },
}


class TestResult:
    def __init__(self, name: str, passed: bool, message: str, response_time_ms: float = 0, details: dict = None):
        self.name = name
        self.passed = passed
        self.message = message
        self.response_time_ms = response_time_ms
        self.details = details or {}
        self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "passed": self.passed,
            "message": self.message,
            "response_time_ms": self.response_time_ms,
            "details": self.details,
            "timestamp": self.timestamp,
        }


class ComprehensiveServiceTests:
    """Comprehensive tests for all Earth-2 services"""
    
    def __init__(self, base_host: str = "localhost"):
        self.base_host = base_host
        self.results: List[TestResult] = []
        self.services = self._configure_services()
    
    def _configure_services(self) -> Dict:
        """Configure service URLs based on host"""
        configured = {}
        for name, config in SERVICES.items():
            url = config["url"].replace("localhost", self.base_host)
            configured[name] = {**config, "url": url}
        return configured
    
    async def run_all_tests(self) -> Dict:
        """Run all service tests"""
        print("\n" + "=" * 60)
        print("  Comprehensive Service Test Suite")
        print(f"  Host: {self.base_host}")
        print(f"  Started: {datetime.utcnow().isoformat()}")
        print("=" * 60 + "\n")
        
        # Service Health Tests
        print("Service Health Tests")
        print("-" * 40)
        for service_name in self.services:
            await self._run_test(
                f"{service_name.upper()} Health",
                lambda s=service_name: self.test_service_health(s)
            )
        
        # Service Endpoint Tests
        print("\nService Endpoint Tests")
        print("-" * 40)
        for service_name, config in self.services.items():
            for endpoint in config.get("endpoints", []):
                await self._run_test(
                    f"{service_name.upper()} {endpoint}",
                    lambda s=service_name, e=endpoint: self.test_endpoint(s, e)
                )
        
        # API Gateway Specific Tests
        print("\nAPI Gateway Functionality Tests")
        print("-" * 40)
        await self._run_test("Layer Toggle API", self.test_layer_toggle)
        await self._run_test("Time Control API", self.test_time_control)
        await self._run_test("Bounds Control API", self.test_bounds_control)
        await self._run_test("Stream Config API", self.test_stream_config)
        
        # Data Federation Tests
        print("\nData Federation Tests")
        print("-" * 40)
        await self._run_test("DFM Sources List", self.test_dfm_sources)
        await self._run_test("ERA5 Source Available", self.test_era5_source)
        await self._run_test("GFS Source Available", self.test_gfs_source)
        await self._run_test("HRRR Source Available", self.test_hrrr_source)
        
        # Model Orchestrator Tests
        print("\nModel Orchestrator Tests")
        print("-" * 40)
        await self._run_test("Orchestrator Models List", self.test_orchestrator_models)
        await self._run_test("VRAM Availability", self.test_vram_availability)
        await self._run_test("Model Status Check", self.test_model_status)
        
        # Inference Server Tests
        print("\nInference Server Tests")
        print("-" * 40)
        await self._run_test("FCN3 Status", self.test_fcn3_status)
        await self._run_test("FCN3 Metrics", self.test_fcn3_metrics)
        await self._run_test("StormScope Status", self.test_stormscope_status)
        
        return self._generate_report()
    
    async def _run_test(self, name: str, test_func) -> None:
        """Run a single test and record result"""
        try:
            result = await test_func()
            self.results.append(result)
            status = "[PASS]" if result.passed else "[FAIL]"
            time_str = f" ({result.response_time_ms:.0f}ms)" if result.response_time_ms > 0 else ""
            print(f"  {status}: {name}{time_str}")
            if not result.passed:
                print(f"         {result.message}")
        except Exception as e:
            result = TestResult(name, False, f"Exception: {str(e)}")
            self.results.append(result)
            print(f"  [FAIL]: {name}")
            print(f"         Exception: {str(e)}")
    
    async def test_service_health(self, service_name: str) -> TestResult:
        """Test service health endpoint"""
        config = self.services.get(service_name)
        if not config:
            return TestResult(f"{service_name} Health", False, "Service not configured")
        
        url = f"{config['url']}{config['health']}"
        start = datetime.utcnow()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                elapsed = (datetime.utcnow() - start).total_seconds() * 1000
                if resp.status_code == 200:
                    return TestResult(
                        f"{service_name} Health", True, "Healthy",
                        response_time_ms=elapsed,
                        details={"status_code": resp.status_code}
                    )
                return TestResult(
                    f"{service_name} Health", False, f"HTTP {resp.status_code}",
                    response_time_ms=elapsed
                )
        except Exception as e:
            elapsed = (datetime.utcnow() - start).total_seconds() * 1000
            return TestResult(f"{service_name} Health", False, str(e), response_time_ms=elapsed)
    
    async def test_endpoint(self, service_name: str, endpoint: str) -> TestResult:
        """Test a specific service endpoint"""
        config = self.services.get(service_name)
        if not config:
            return TestResult(f"{service_name} {endpoint}", False, "Service not configured")
        
        url = f"{config['url']}{endpoint}"
        start = datetime.utcnow()
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                elapsed = (datetime.utcnow() - start).total_seconds() * 1000
                if resp.status_code == 200:
                    return TestResult(
                        f"{service_name} {endpoint}", True, "OK",
                        response_time_ms=elapsed
                    )
                return TestResult(
                    f"{service_name} {endpoint}", False, f"HTTP {resp.status_code}",
                    response_time_ms=elapsed
                )
        except Exception as e:
            elapsed = (datetime.utcnow() - start).total_seconds() * 1000
            return TestResult(f"{service_name} {endpoint}", False, str(e), response_time_ms=elapsed)
    
    async def test_layer_toggle(self) -> TestResult:
        """Test layer toggle functionality"""
        url = f"{self.services['api_gateway']['url']}/layers/toggle"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json={"layer": "clouds", "visible": True})
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "applied":
                        return TestResult("Layer Toggle", True, "Layer toggle working")
                return TestResult("Layer Toggle", False, f"HTTP {resp.status_code}")
        except Exception as e:
            return TestResult("Layer Toggle", False, str(e))
    
    async def test_time_control(self) -> TestResult:
        """Test time control functionality"""
        url = f"{self.services['api_gateway']['url']}/time/set"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json={
                    "time": datetime.utcnow().isoformat(),
                    "animate": False
                })
                if resp.status_code == 200:
                    return TestResult("Time Control", True, "Time control working")
                return TestResult("Time Control", False, f"HTTP {resp.status_code}")
        except Exception as e:
            return TestResult("Time Control", False, str(e))
    
    async def test_bounds_control(self) -> TestResult:
        """Test bounds control functionality"""
        url = f"{self.services['api_gateway']['url']}/bounds/set"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json={
                    "north": 60, "south": 20, "east": -60, "west": -130
                })
                if resp.status_code == 200:
                    return TestResult("Bounds Control", True, "Bounds control working")
                return TestResult("Bounds Control", False, f"HTTP {resp.status_code}")
        except Exception as e:
            return TestResult("Bounds Control", False, str(e))
    
    async def test_stream_config(self) -> TestResult:
        """Test stream configuration"""
        url = f"{self.services['api_gateway']['url']}/stream/config"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    config = resp.json()
                    if config.get("signalingUrl") and config.get("resolution"):
                        return TestResult("Stream Config", True, f"Resolution: {config.get('resolution')}")
                return TestResult("Stream Config", False, f"HTTP {resp.status_code}")
        except Exception as e:
            return TestResult("Stream Config", False, str(e))
    
    async def test_dfm_sources(self) -> TestResult:
        """Test DFM sources endpoint"""
        url = f"{self.services['dfm']['url']}/sources"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    sources = data.get("sources", [])
                    return TestResult("DFM Sources", True, f"{len(sources)} sources available")
                return TestResult("DFM Sources", False, f"HTTP {resp.status_code}")
        except Exception as e:
            return TestResult("DFM Sources", False, str(e))
    
    async def _test_data_source(self, source_name: str) -> TestResult:
        """Test a specific data source"""
        url = f"{self.services['dfm']['url']}/sources"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    sources = data.get("sources", [])
                    source = next((s for s in sources if source_name.lower() in s.get("name", "").lower()), None)
                    if source:
                        status = source.get("status", "unknown")
                        return TestResult(f"{source_name} Source", True, f"Status: {status}")
                    return TestResult(f"{source_name} Source", False, f"{source_name} not found in sources")
                return TestResult(f"{source_name} Source", False, f"HTTP {resp.status_code}")
        except Exception as e:
            return TestResult(f"{source_name} Source", False, str(e))
    
    async def test_era5_source(self) -> TestResult:
        return await self._test_data_source("ERA5")
    
    async def test_gfs_source(self) -> TestResult:
        return await self._test_data_source("GFS")
    
    async def test_hrrr_source(self) -> TestResult:
        return await self._test_data_source("HRRR")
    
    async def test_orchestrator_models(self) -> TestResult:
        """Test orchestrator models list"""
        url = f"{self.services['orchestrator']['url']}/models"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    models = resp.json()
                    return TestResult("Orchestrator Models", True, f"{len(models)} models registered")
                return TestResult("Orchestrator Models", False, f"HTTP {resp.status_code}")
        except Exception as e:
            return TestResult("Orchestrator Models", False, str(e))
    
    async def test_vram_availability(self) -> TestResult:
        """Test VRAM availability"""
        url = f"{self.services['orchestrator']['url']}/"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    vram = data.get("available_vram_gb", 0)
                    max_vram = data.get("max_vram_gb", 32)
                    if vram > 0:
                        return TestResult("VRAM Availability", True, f"{vram}/{max_vram}GB available")
                    return TestResult("VRAM Availability", False, "No VRAM available")
                return TestResult("VRAM Availability", False, f"HTTP {resp.status_code}")
        except Exception as e:
            return TestResult("VRAM Availability", False, str(e))
    
    async def test_model_status(self) -> TestResult:
        """Test model status endpoint"""
        url = f"{self.services['orchestrator']['url']}/models"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    models = resp.json()
                    ready = sum(1 for m in models if m.get("ready"))
                    return TestResult("Model Status", True, f"{ready}/{len(models)} models ready")
                return TestResult("Model Status", False, f"HTTP {resp.status_code}")
        except Exception as e:
            return TestResult("Model Status", False, str(e))
    
    async def test_fcn3_status(self) -> TestResult:
        """Test FCN3 model status"""
        url = f"{self.services['fcn3']['url']}/status"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    loaded = data.get("model_loaded", False)
                    return TestResult("FCN3 Status", True, f"Model loaded: {loaded}")
                return TestResult("FCN3 Status", False, f"HTTP {resp.status_code}")
        except Exception as e:
            return TestResult("FCN3 Status", False, str(e))
    
    async def test_fcn3_metrics(self) -> TestResult:
        """Test FCN3 metrics endpoint"""
        url = f"{self.services['fcn3']['url']}/metrics"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return TestResult("FCN3 Metrics", True, "Metrics available")
                return TestResult("FCN3 Metrics", False, f"HTTP {resp.status_code}")
        except Exception as e:
            return TestResult("FCN3 Metrics", False, str(e))
    
    async def test_stormscope_status(self) -> TestResult:
        """Test StormScope model status"""
        url = f"{self.services['stormscope']['url']}/status"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    loaded = data.get("model_loaded", False)
                    return TestResult("StormScope Status", True, f"Model loaded: {loaded}")
                return TestResult("StormScope Status", False, f"HTTP {resp.status_code}")
        except Exception as e:
            return TestResult("StormScope Status", False, str(e))
    
    def _generate_report(self) -> Dict:
        """Generate test report"""
        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)
        total = len(self.results)
        avg_response = sum(r.response_time_ms for r in self.results if r.response_time_ms > 0) / max(1, sum(1 for r in self.results if r.response_time_ms > 0))
        
        report = {
            "suite": "Comprehensive Service Tests",
            "host": self.base_host,
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "pass_rate": f"{(passed / total * 100):.1f}%" if total > 0 else "0%",
                "avg_response_ms": f"{avg_response:.0f}",
            },
            "results": [r.to_dict() for r in self.results],
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        print("\n" + "=" * 60)
        print("  Service Test Summary")
        print("=" * 60)
        print(f"  Total:      {total}")
        print(f"  Passed:     {passed}")
        print(f"  Failed:     {failed}")
        print(f"  Pass Rate:  {report['summary']['pass_rate']}")
        print(f"  Avg Time:   {report['summary']['avg_response_ms']}ms")
        print("=" * 60 + "\n")
        
        return report


async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Comprehensive Service Tests")
    parser.add_argument("--host", default="localhost", help="Target host")
    args = parser.parse_args()
    
    suite = ComprehensiveServiceTests(base_host=args.host)
    report = await suite.run_all_tests()
    
    # Save report
    report_file = f"tests/service_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    os.makedirs(os.path.dirname(report_file), exist_ok=True)
    with open(report_file, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Report saved to: {report_file}")
    
    sys.exit(0 if report["summary"]["failed"] == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main())
