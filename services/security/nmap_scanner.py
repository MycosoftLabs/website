#!/usr/bin/env python3
"""
Mycosoft Nmap Scanner Service

Provides automated network discovery and vulnerability scanning capabilities.
Results are published to Redis for consumption by the security processor.
"""

import asyncio
import json
import os
import re
import subprocess
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum

import redis.asyncio as redis
import structlog

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)
logger = structlog.get_logger()


class ScanType(Enum):
    PING = "ping"
    SYN = "syn"
    VERSION = "version"
    VULN = "vuln"
    FULL = "full"


@dataclass
class ScanResult:
    scan_id: str
    scan_type: str
    target: str
    started_at: str
    completed_at: str
    duration_seconds: float
    hosts_up: int
    hosts_down: int
    hosts: List[Dict[str, Any]]
    vulnerabilities: List[Dict[str, Any]]
    raw_output: str


class NmapScanner:
    """Nmap scanner wrapper with async support"""
    
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.target_networks = os.getenv("TARGET_NETWORKS", "192.168.0.0/24").split(",")
        self.scan_interval = int(os.getenv("SCAN_INTERVAL", "3600"))
        self.max_concurrent = int(os.getenv("MAX_CONCURRENT_SCANS", "2"))
        self.results_dir = "/app/results"
        self.redis_client: Optional[redis.Redis] = None
        self.allowed_scan_types = os.getenv("ALLOWED_SCAN_TYPES", "ping,syn,version,vuln").split(",")
        
    async def connect_redis(self):
        """Connect to Redis"""
        self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
        await self.redis_client.ping()
        logger.info("Connected to Redis", url=self.redis_url)
        
    async def close(self):
        """Close connections"""
        if self.redis_client:
            await self.redis_client.close()
            
    def _generate_scan_id(self) -> str:
        """Generate unique scan ID"""
        return f"scan_{int(time.time() * 1000)}"
    
    def _build_nmap_args(self, scan_type: ScanType, target: str) -> List[str]:
        """Build nmap command arguments based on scan type"""
        base_args = ["nmap", "-oX", "-"]
        
        if scan_type == ScanType.PING:
            return base_args + ["-sn", "-PE", target]
        elif scan_type == ScanType.SYN:
            return base_args + ["-sS", "-T4", "-F", target]
        elif scan_type == ScanType.VERSION:
            return base_args + ["-sV", "-T4", "--top-ports", "100", target]
        elif scan_type == ScanType.VULN:
            return base_args + ["-sV", "--script", "vulners,vulscan", "-T4", "--top-ports", "1000", target]
        elif scan_type == ScanType.FULL:
            return base_args + ["-sS", "-sV", "-O", "-A", "-T4", target]
        else:
            return base_args + ["-sn", target]
    
    def _parse_nmap_xml(self, xml_output: str) -> Dict[str, Any]:
        """Parse nmap XML output to structured data"""
        import xml.etree.ElementTree as ET
        
        result = {
            "hosts": [],
            "hosts_up": 0,
            "hosts_down": 0,
            "vulnerabilities": []
        }
        
        try:
            root = ET.fromstring(xml_output)
            
            for host in root.findall(".//host"):
                host_data = {
                    "ip": "",
                    "hostname": "",
                    "status": "unknown",
                    "mac": "",
                    "vendor": "",
                    "os": "",
                    "ports": [],
                    "scripts": []
                }
                
                # Get status
                status = host.find("status")
                if status is not None:
                    host_data["status"] = status.get("state", "unknown")
                    if host_data["status"] == "up":
                        result["hosts_up"] += 1
                    else:
                        result["hosts_down"] += 1
                
                # Get addresses
                for addr in host.findall("address"):
                    addr_type = addr.get("addrtype")
                    if addr_type == "ipv4":
                        host_data["ip"] = addr.get("addr", "")
                    elif addr_type == "mac":
                        host_data["mac"] = addr.get("addr", "")
                        host_data["vendor"] = addr.get("vendor", "")
                
                # Get hostname
                hostnames = host.find("hostnames")
                if hostnames is not None:
                    hostname = hostnames.find("hostname")
                    if hostname is not None:
                        host_data["hostname"] = hostname.get("name", "")
                
                # Get OS
                os_elem = host.find(".//osmatch")
                if os_elem is not None:
                    host_data["os"] = os_elem.get("name", "")
                
                # Get ports
                for port in host.findall(".//port"):
                    port_data = {
                        "port": int(port.get("portid", 0)),
                        "protocol": port.get("protocol", "tcp"),
                        "state": "unknown",
                        "service": "",
                        "version": "",
                        "scripts": []
                    }
                    
                    state = port.find("state")
                    if state is not None:
                        port_data["state"] = state.get("state", "unknown")
                    
                    service = port.find("service")
                    if service is not None:
                        port_data["service"] = service.get("name", "")
                        port_data["version"] = f"{service.get('product', '')} {service.get('version', '')}".strip()
                    
                    # Get script results (vulnerabilities)
                    for script in port.findall("script"):
                        script_id = script.get("id", "")
                        script_output = script.get("output", "")
                        port_data["scripts"].append({
                            "id": script_id,
                            "output": script_output
                        })
                        
                        # Check for vulnerabilities
                        if "vulners" in script_id or "vulscan" in script_id:
                            vulns = self._extract_vulnerabilities(script_output, host_data["ip"], port_data["port"])
                            result["vulnerabilities"].extend(vulns)
                    
                    if port_data["state"] == "open":
                        host_data["ports"].append(port_data)
                
                result["hosts"].append(host_data)
                
        except ET.ParseError as e:
            logger.error("Failed to parse nmap XML", error=str(e))
            
        return result
    
    def _extract_vulnerabilities(self, script_output: str, host: str, port: int) -> List[Dict[str, Any]]:
        """Extract vulnerability information from script output"""
        vulns = []
        
        # Parse CVE references
        cve_pattern = r'(CVE-\d{4}-\d+)'
        for match in re.finditer(cve_pattern, script_output):
            vulns.append({
                "cve": match.group(1),
                "host": host,
                "port": port,
                "severity": self._estimate_severity(match.group(1)),
                "discovered_at": datetime.utcnow().isoformat()
            })
        
        return vulns
    
    def _estimate_severity(self, cve: str) -> str:
        """Estimate severity based on CVE (placeholder - should use NVD API)"""
        # In production, query NVD API for CVSS score
        return "medium"
    
    async def run_scan(self, scan_type: ScanType, target: str) -> ScanResult:
        """Execute an nmap scan"""
        scan_id = self._generate_scan_id()
        started_at = datetime.utcnow()
        
        logger.info("Starting scan", scan_id=scan_id, type=scan_type.value, target=target)
        
        args = self._build_nmap_args(scan_type, target)
        
        try:
            proc = await asyncio.create_subprocess_exec(
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            
            completed_at = datetime.utcnow()
            duration = (completed_at - started_at).total_seconds()
            
            if proc.returncode != 0:
                logger.error("Scan failed", scan_id=scan_id, error=stderr.decode())
                raise RuntimeError(f"Nmap failed: {stderr.decode()}")
            
            xml_output = stdout.decode()
            parsed = self._parse_nmap_xml(xml_output)
            
            result = ScanResult(
                scan_id=scan_id,
                scan_type=scan_type.value,
                target=target,
                started_at=started_at.isoformat(),
                completed_at=completed_at.isoformat(),
                duration_seconds=duration,
                hosts_up=parsed["hosts_up"],
                hosts_down=parsed["hosts_down"],
                hosts=parsed["hosts"],
                vulnerabilities=parsed["vulnerabilities"],
                raw_output=xml_output
            )
            
            # Save result
            await self._save_result(result)
            
            logger.info(
                "Scan completed",
                scan_id=scan_id,
                duration=duration,
                hosts_up=result.hosts_up,
                vulnerabilities=len(result.vulnerabilities)
            )
            
            return result
            
        except Exception as e:
            logger.error("Scan error", scan_id=scan_id, error=str(e))
            raise
    
    async def _save_result(self, result: ScanResult):
        """Save scan result to Redis and filesystem"""
        result_dict = asdict(result)
        result_json = json.dumps(result_dict)
        
        # Save to Redis
        if self.redis_client:
            # Store result
            await self.redis_client.set(
                f"scan:{result.scan_id}",
                result_json,
                ex=86400 * 7  # Keep for 7 days
            )
            
            # Add to scan history
            await self.redis_client.lpush("scan:history", result.scan_id)
            await self.redis_client.ltrim("scan:history", 0, 999)  # Keep last 1000
            
            # Publish vulnerabilities
            for vuln in result.vulnerabilities:
                await self.redis_client.publish("security:vulnerabilities", json.dumps(vuln))
            
            # Publish scan completion event
            await self.redis_client.publish("security:scans", json.dumps({
                "event": "scan_complete",
                "scan_id": result.scan_id,
                "type": result.scan_type,
                "hosts_up": result.hosts_up,
                "vulnerabilities": len(result.vulnerabilities)
            }))
        
        # Save to filesystem
        filepath = os.path.join(self.results_dir, f"{result.scan_id}.json")
        with open(filepath, 'w') as f:
            json.dump(result_dict, f, indent=2)
    
    async def get_scan_result(self, scan_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve scan result by ID"""
        if self.redis_client:
            data = await self.redis_client.get(f"scan:{scan_id}")
            if data:
                return json.loads(data)
        return None
    
    async def get_scan_history(self, limit: int = 50) -> List[str]:
        """Get recent scan IDs"""
        if self.redis_client:
            return await self.redis_client.lrange("scan:history", 0, limit - 1)
        return []
    
    async def scheduled_scan_loop(self):
        """Run scheduled scans"""
        while True:
            try:
                for target in self.target_networks:
                    # Run a quick ping scan
                    if "ping" in self.allowed_scan_types:
                        await self.run_scan(ScanType.PING, target.strip())
                    
                    # Run a SYN scan
                    if "syn" in self.allowed_scan_types:
                        await self.run_scan(ScanType.SYN, target.strip())
                    
                await asyncio.sleep(self.scan_interval)
                
            except Exception as e:
                logger.error("Scheduled scan error", error=str(e))
                await asyncio.sleep(60)  # Wait before retry
    
    async def listen_for_requests(self):
        """Listen for scan requests via Redis"""
        if not self.redis_client:
            return
            
        pubsub = self.redis_client.pubsub()
        await pubsub.subscribe("security:scan_requests")
        
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
                
            try:
                request = json.loads(message["data"])
                scan_type = ScanType(request.get("type", "ping"))
                target = request.get("target", "192.168.0.0/24")
                
                if scan_type.value in self.allowed_scan_types:
                    await self.run_scan(scan_type, target)
                else:
                    logger.warning("Scan type not allowed", type=scan_type.value)
                    
            except Exception as e:
                logger.error("Request handling error", error=str(e))


async def main():
    """Main entry point"""
    scanner = NmapScanner()
    
    try:
        await scanner.connect_redis()
        
        # Run scheduled scans and listen for requests
        await asyncio.gather(
            scanner.scheduled_scan_loop(),
            scanner.listen_for_requests()
        )
        
    except KeyboardInterrupt:
        logger.info("Shutting down scanner")
    finally:
        await scanner.close()


if __name__ == "__main__":
    asyncio.run(main())
