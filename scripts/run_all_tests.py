"""
Master Test Runner - February 5, 2026

Runs all Earth-2 RTX test suites and generates a comprehensive report.
"""

import asyncio
import json
import os
import sys
import subprocess
from datetime import datetime
from typing import Dict, List

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class MasterTestRunner:
    def __init__(self, remote: bool = False, host: str = "192.168.0.187"):
        self.remote = remote
        self.host = host
        self.all_reports = []
        self.start_time = datetime.utcnow()
    
    def run_all_tests(self) -> Dict:
        print("\n" + "=" * 70)
        print("  EARTH-2 RTX MASTER TEST SUITE")
        print(f"  Mode: {'Remote (' + self.host + ')' if self.remote else 'Local'}")
        print(f"  Started: {self.start_time.isoformat()}")
        print("=" * 70 + "\n")
        
        # Test Suite 1: GPU Passthrough
        print("\n>>> Running GPU Passthrough Tests...")
        self._run_test_suite("test_rtx5090_passthrough")
        
        # Test Suite 2: Infrastructure
        print("\n>>> Running Infrastructure Tests...")
        self._run_test_suite("test_infrastructure")
        
        # Test Suite 3: Comprehensive Services
        print("\n>>> Running Service Tests...")
        self._run_async_test_suite("test_services_comprehensive")
        
        # Test Suite 4: E2E Integration
        print("\n>>> Running E2E Integration Tests...")
        self._run_async_test_suite("earth2_rtx_e2e_test")
        
        return self._generate_master_report()
    
    def _run_test_suite(self, module_name: str) -> None:
        """Run a synchronous test suite"""
        args = []
        if self.remote:
            args.extend(["--remote", "--host", self.host])
        
        cmd = [sys.executable, "-m", f"tests.e2e.{module_name}"] + args
        
        try:
            result = subprocess.run(
                cmd,
                cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                capture_output=True,
                text=True,
                timeout=300
            )
            print(result.stdout)
            if result.stderr:
                print(result.stderr)
            
            # Try to load the latest report
            self._load_latest_report(module_name)
            
        except subprocess.TimeoutExpired:
            print(f"  ERROR: {module_name} timed out")
            self.all_reports.append({
                "suite": module_name,
                "error": "Timeout",
                "summary": {"total": 0, "passed": 0, "failed": 1}
            })
        except Exception as e:
            print(f"  ERROR: {module_name} failed: {e}")
            self.all_reports.append({
                "suite": module_name,
                "error": str(e),
                "summary": {"total": 0, "passed": 0, "failed": 1}
            })
    
    def _run_async_test_suite(self, module_name: str) -> None:
        """Run an async test suite"""
        args = []
        if self.remote:
            args.extend(["--host", self.host])
        
        cmd = [sys.executable, "-m", f"tests.e2e.{module_name}"] + args
        
        try:
            result = subprocess.run(
                cmd,
                cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                capture_output=True,
                text=True,
                timeout=600
            )
            print(result.stdout)
            if result.stderr:
                print(result.stderr)
            
            self._load_latest_report(module_name)
            
        except subprocess.TimeoutExpired:
            print(f"  ERROR: {module_name} timed out")
            self.all_reports.append({
                "suite": module_name,
                "error": "Timeout",
                "summary": {"total": 0, "passed": 0, "failed": 1}
            })
        except Exception as e:
            print(f"  ERROR: {module_name} failed: {e}")
            self.all_reports.append({
                "suite": module_name,
                "error": str(e),
                "summary": {"total": 0, "passed": 0, "failed": 1}
            })
    
    def _load_latest_report(self, module_name: str) -> None:
        """Load the most recent report for a test suite"""
        tests_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "tests"
        )
        
        # Find latest report file
        report_prefix = module_name.replace("test_", "").replace("earth2_rtx_e2e_test", "e2e")
        
        try:
            report_files = [
                f for f in os.listdir(tests_dir)
                if f.endswith(".json") and (report_prefix in f.lower() or "report" in f.lower())
            ]
            if report_files:
                report_files.sort(reverse=True)
                latest = os.path.join(tests_dir, report_files[0])
                with open(latest, "r") as f:
                    report = json.load(f)
                    self.all_reports.append(report)
        except Exception as e:
            print(f"  Could not load report for {module_name}: {e}")
    
    def _generate_master_report(self) -> Dict:
        """Generate master report combining all test suites"""
        total_tests = 0
        total_passed = 0
        total_failed = 0
        
        for report in self.all_reports:
            summary = report.get("summary", {})
            total_tests += summary.get("total", 0)
            total_passed += summary.get("passed", 0)
            total_failed += summary.get("failed", 0)
        
        end_time = datetime.utcnow()
        duration = (end_time - self.start_time).total_seconds()
        
        master_report = {
            "title": "Earth-2 RTX Master Test Report",
            "target": self.host if self.remote else "localhost",
            "start_time": self.start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "duration_seconds": duration,
            "summary": {
                "total_suites": len(self.all_reports),
                "total_tests": total_tests,
                "total_passed": total_passed,
                "total_failed": total_failed,
                "pass_rate": f"{(total_passed / total_tests * 100):.1f}%" if total_tests > 0 else "0%",
            },
            "suites": self.all_reports,
        }
        
        print("\n" + "=" * 70)
        print("  MASTER TEST SUMMARY")
        print("=" * 70)
        print(f"  Duration:     {duration:.1f} seconds")
        print(f"  Test Suites:  {len(self.all_reports)}")
        print(f"  Total Tests:  {total_tests}")
        print(f"  Passed:       {total_passed}")
        print(f"  Failed:       {total_failed}")
        print(f"  Pass Rate:    {master_report['summary']['pass_rate']}")
        print("=" * 70 + "\n")
        
        # Save master report
        report_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "tests"
        )
        os.makedirs(report_dir, exist_ok=True)
        report_file = os.path.join(
            report_dir,
            f"master_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(report_file, "w") as f:
            json.dump(master_report, f, indent=2)
        print(f"Master report saved to: {report_file}")
        
        return master_report


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Earth-2 RTX Master Test Runner")
    parser.add_argument("--remote", action="store_true", help="Run tests on remote host")
    parser.add_argument("--host", default="192.168.0.187", help="Remote host IP")
    args = parser.parse_args()
    
    runner = MasterTestRunner(remote=args.remote, host=args.host)
    report = runner.run_all_tests()
    
    # Exit with appropriate code
    if report["summary"]["total_failed"] > 0:
        print(f"\n>>> {report['summary']['total_failed']} TESTS FAILED <<<")
        sys.exit(1)
    else:
        print("\n>>> ALL TESTS PASSED <<<")
        sys.exit(0)


if __name__ == "__main__":
    main()
