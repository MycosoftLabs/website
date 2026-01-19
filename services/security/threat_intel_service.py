#!/usr/bin/env python3
"""
Mycosoft Threat Intelligence Service

Aggregates threat intelligence from multiple sources:
- AbuseIPDB: IP reputation
- VirusTotal: Hash/URL analysis
- Tor Exit Nodes: Anonymous network detection
- Internal threat database: Custom threat tracking
"""

import asyncio
import json
import os
import sqlite3
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum

import aiohttp
import aiosqlite
import redis.asyncio as redis
import structlog
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import uvicorn

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
)
logger = structlog.get_logger()

app = FastAPI(title="Mycosoft Threat Intelligence", version="1.0.0")


class ThreatLevel(Enum):
    UNKNOWN = "unknown"
    SAFE = "safe"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ThreatType(Enum):
    MALWARE = "malware"
    PHISHING = "phishing"
    SPAM = "spam"
    BOTNET = "botnet"
    SCANNER = "scanner"
    BRUTEFORCE = "bruteforce"
    TOR_EXIT = "tor_exit"
    VPN = "vpn"
    PROXY = "proxy"
    HOSTING = "hosting"
    UNKNOWN = "unknown"


@dataclass
class IPReputation:
    ip: str
    score: int  # 0-100, higher is worse
    threat_level: str
    threat_types: List[str]
    country: str
    isp: str
    is_tor: bool
    is_vpn: bool
    is_proxy: bool
    is_hosting: bool
    last_seen: Optional[str]
    reports_count: int
    source: str
    cached_at: str


class IPLookupRequest(BaseModel):
    ip: str


class ThreatIntelService:
    """Threat Intelligence aggregation service"""
    
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.db_path = os.getenv("THREAT_DB_PATH", "/data/threats.db")
        self.abuseipdb_key = os.getenv("ABUSEIPDB_API_KEY", "")
        self.virustotal_key = os.getenv("VIRUSTOTAL_API_KEY", "")
        self.update_interval = int(os.getenv("UPDATE_INTERVAL", "3600"))
        self.tor_update_interval = int(os.getenv("TOR_EXIT_UPDATE_INTERVAL", "21600"))
        
        self.redis_client: Optional[redis.Redis] = None
        self.db: Optional[aiosqlite.Connection] = None
        self.tor_exits: set = set()
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def initialize(self):
        """Initialize connections and database"""
        # Redis
        self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
        await self.redis_client.ping()
        logger.info("Connected to Redis")
        
        # SQLite database
        self.db = await aiosqlite.connect(self.db_path)
        await self._init_database()
        logger.info("Database initialized")
        
        # HTTP session
        self.session = aiohttp.ClientSession()
        
        # Load Tor exit nodes
        await self.update_tor_exits()
        
    async def _init_database(self):
        """Initialize SQLite database schema"""
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS ip_reputation (
                ip TEXT PRIMARY KEY,
                score INTEGER,
                threat_level TEXT,
                threat_types TEXT,
                country TEXT,
                isp TEXT,
                is_tor INTEGER,
                is_vpn INTEGER,
                is_proxy INTEGER,
                is_hosting INTEGER,
                last_seen TEXT,
                reports_count INTEGER,
                source TEXT,
                cached_at TEXT,
                updated_at TEXT
            )
        """)
        
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS blocked_ips (
                ip TEXT PRIMARY KEY,
                reason TEXT,
                blocked_by TEXT,
                blocked_at TEXT,
                expires_at TEXT,
                is_permanent INTEGER
            )
        """)
        
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS threat_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip TEXT,
                report_type TEXT,
                severity TEXT,
                description TEXT,
                reported_by TEXT,
                reported_at TEXT
            )
        """)
        
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_ip_reputation_cached 
            ON ip_reputation(cached_at)
        """)
        
        await self.db.commit()
        
    async def close(self):
        """Close connections"""
        if self.session:
            await self.session.close()
        if self.redis_client:
            await self.redis_client.close()
        if self.db:
            await self.db.close()
            
    async def update_tor_exits(self):
        """Update Tor exit node list"""
        try:
            url = "https://check.torproject.org/torbulkexitlist"
            async with self.session.get(url, timeout=30) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    self.tor_exits = set(line.strip() for line in text.splitlines() if line.strip())
                    
                    # Cache in Redis
                    if self.redis_client:
                        await self.redis_client.delete("tor_exits")
                        if self.tor_exits:
                            await self.redis_client.sadd("tor_exits", *self.tor_exits)
                        await self.redis_client.expire("tor_exits", self.tor_update_interval * 2)
                    
                    logger.info("Updated Tor exit list", count=len(self.tor_exits))
        except Exception as e:
            logger.error("Failed to update Tor exits", error=str(e))
            
    async def lookup_abuseipdb(self, ip: str) -> Optional[Dict[str, Any]]:
        """Query AbuseIPDB for IP reputation"""
        if not self.abuseipdb_key:
            return None
            
        try:
            url = "https://api.abuseipdb.com/api/v2/check"
            headers = {
                "Key": self.abuseipdb_key,
                "Accept": "application/json"
            }
            params = {
                "ipAddress": ip,
                "maxAgeInDays": 90,
                "verbose": True
            }
            
            async with self.session.get(url, headers=headers, params=params, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("data")
                else:
                    logger.warning("AbuseIPDB lookup failed", ip=ip, status=resp.status)
                    
        except Exception as e:
            logger.error("AbuseIPDB error", ip=ip, error=str(e))
            
        return None
    
    async def lookup_virustotal(self, ip: str) -> Optional[Dict[str, Any]]:
        """Query VirusTotal for IP reputation"""
        if not self.virustotal_key:
            return None
            
        try:
            url = f"https://www.virustotal.com/api/v3/ip_addresses/{ip}"
            headers = {
                "x-apikey": self.virustotal_key
            }
            
            async with self.session.get(url, headers=headers, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("data", {}).get("attributes")
                    
        except Exception as e:
            logger.error("VirusTotal error", ip=ip, error=str(e))
            
        return None
    
    def _calculate_threat_level(self, score: int) -> str:
        """Calculate threat level from score"""
        if score <= 0:
            return ThreatLevel.SAFE.value
        elif score <= 20:
            return ThreatLevel.LOW.value
        elif score <= 50:
            return ThreatLevel.MEDIUM.value
        elif score <= 80:
            return ThreatLevel.HIGH.value
        else:
            return ThreatLevel.CRITICAL.value
    
    async def get_ip_reputation(self, ip: str, force_refresh: bool = False) -> IPReputation:
        """Get comprehensive IP reputation"""
        cache_key = f"threat:ip:{ip}"
        
        # Check cache first
        if not force_refresh and self.redis_client:
            cached = await self.redis_client.get(cache_key)
            if cached:
                data = json.loads(cached)
                return IPReputation(**data)
        
        # Check if Tor exit
        is_tor = ip in self.tor_exits
        
        # Query external sources
        abuse_data = await self.lookup_abuseipdb(ip)
        vt_data = await self.lookup_virustotal(ip)
        
        # Build reputation
        score = 0
        threat_types = []
        country = ""
        isp = ""
        is_vpn = False
        is_proxy = False
        is_hosting = False
        reports_count = 0
        last_seen = None
        
        if abuse_data:
            score = abuse_data.get("abuseConfidenceScore", 0)
            country = abuse_data.get("countryCode", "")
            isp = abuse_data.get("isp", "")
            is_vpn = abuse_data.get("isPublicProxy", False)
            is_hosting = abuse_data.get("usageType", "") in ["Data Center/Web Hosting/Transit", "Commercial"]
            reports_count = abuse_data.get("totalReports", 0)
            
            # Extract threat types from reports
            if abuse_data.get("reports"):
                for report in abuse_data["reports"][:10]:
                    categories = report.get("categories", [])
                    for cat in categories:
                        if cat == 18:
                            threat_types.append(ThreatType.BRUTEFORCE.value)
                        elif cat == 14:
                            threat_types.append(ThreatType.SCANNER.value)
                        elif cat in [3, 4, 5]:
                            threat_types.append(ThreatType.MALWARE.value)
                        elif cat == 9:
                            threat_types.append(ThreatType.PROXY.value)
        
        if vt_data:
            malicious = vt_data.get("last_analysis_stats", {}).get("malicious", 0)
            if malicious > 0:
                score = max(score, min(100, malicious * 10))
                threat_types.append(ThreatType.MALWARE.value)
        
        if is_tor:
            threat_types.append(ThreatType.TOR_EXIT.value)
            score = max(score, 30)
        
        threat_types = list(set(threat_types))
        
        reputation = IPReputation(
            ip=ip,
            score=score,
            threat_level=self._calculate_threat_level(score),
            threat_types=threat_types,
            country=country,
            isp=isp,
            is_tor=is_tor,
            is_vpn=is_vpn,
            is_proxy=is_proxy,
            is_hosting=is_hosting,
            last_seen=last_seen,
            reports_count=reports_count,
            source="abuseipdb+virustotal" if abuse_data and vt_data else "abuseipdb" if abuse_data else "virustotal" if vt_data else "internal",
            cached_at=datetime.utcnow().isoformat()
        )
        
        # Cache result
        if self.redis_client:
            await self.redis_client.set(
                cache_key,
                json.dumps(asdict(reputation)),
                ex=3600  # 1 hour cache
            )
        
        # Store in database
        await self._store_reputation(reputation)
        
        return reputation
    
    async def _store_reputation(self, rep: IPReputation):
        """Store reputation in database"""
        await self.db.execute("""
            INSERT OR REPLACE INTO ip_reputation 
            (ip, score, threat_level, threat_types, country, isp, is_tor, is_vpn, 
             is_proxy, is_hosting, last_seen, reports_count, source, cached_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            rep.ip, rep.score, rep.threat_level, json.dumps(rep.threat_types),
            rep.country, rep.isp, rep.is_tor, rep.is_vpn, rep.is_proxy, rep.is_hosting,
            rep.last_seen, rep.reports_count, rep.source, rep.cached_at,
            datetime.utcnow().isoformat()
        ))
        await self.db.commit()
    
    async def block_ip(self, ip: str, reason: str, blocked_by: str = "system", 
                       expires_in_hours: Optional[int] = None):
        """Add IP to blocklist"""
        expires_at = None
        is_permanent = expires_in_hours is None
        
        if expires_in_hours:
            expires_at = (datetime.utcnow() + timedelta(hours=expires_in_hours)).isoformat()
        
        await self.db.execute("""
            INSERT OR REPLACE INTO blocked_ips 
            (ip, reason, blocked_by, blocked_at, expires_at, is_permanent)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (ip, reason, blocked_by, datetime.utcnow().isoformat(), expires_at, is_permanent))
        await self.db.commit()
        
        # Publish to Redis
        if self.redis_client:
            await self.redis_client.publish("security:blocks", json.dumps({
                "action": "block",
                "ip": ip,
                "reason": reason,
                "blocked_by": blocked_by
            }))
        
        logger.info("IP blocked", ip=ip, reason=reason, blocked_by=blocked_by)
    
    async def unblock_ip(self, ip: str, unblocked_by: str = "system"):
        """Remove IP from blocklist"""
        await self.db.execute("DELETE FROM blocked_ips WHERE ip = ?", (ip,))
        await self.db.commit()
        
        if self.redis_client:
            await self.redis_client.publish("security:blocks", json.dumps({
                "action": "unblock",
                "ip": ip,
                "unblocked_by": unblocked_by
            }))
        
        logger.info("IP unblocked", ip=ip, unblocked_by=unblocked_by)
    
    async def is_blocked(self, ip: str) -> bool:
        """Check if IP is blocked"""
        async with self.db.execute(
            "SELECT expires_at, is_permanent FROM blocked_ips WHERE ip = ?", (ip,)
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                return False
            
            expires_at, is_permanent = row
            if is_permanent:
                return True
            
            if expires_at:
                expiry = datetime.fromisoformat(expires_at)
                return datetime.utcnow() < expiry
            
            return True
    
    async def get_blocked_ips(self) -> List[Dict[str, Any]]:
        """Get all blocked IPs"""
        blocked = []
        async with self.db.execute("SELECT * FROM blocked_ips") as cursor:
            async for row in cursor:
                blocked.append({
                    "ip": row[0],
                    "reason": row[1],
                    "blocked_by": row[2],
                    "blocked_at": row[3],
                    "expires_at": row[4],
                    "is_permanent": bool(row[5])
                })
        return blocked


# Global service instance
threat_service: Optional[ThreatIntelService] = None


@app.on_event("startup")
async def startup():
    global threat_service
    threat_service = ThreatIntelService()
    await threat_service.initialize()


@app.on_event("shutdown")
async def shutdown():
    if threat_service:
        await threat_service.close()


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "threat-intel"}


@app.get("/api/v1/ip/{ip}")
async def lookup_ip(ip: str, force_refresh: bool = False):
    """Lookup IP reputation"""
    if not threat_service:
        raise HTTPException(status_code=503, detail="Service not ready")
    
    reputation = await threat_service.get_ip_reputation(ip, force_refresh)
    return asdict(reputation)


@app.post("/api/v1/ip/{ip}/block")
async def block_ip(ip: str, reason: str = Query(...), expires_hours: Optional[int] = None):
    """Block an IP address"""
    if not threat_service:
        raise HTTPException(status_code=503, detail="Service not ready")
    
    await threat_service.block_ip(ip, reason, "api", expires_hours)
    return {"status": "blocked", "ip": ip}


@app.delete("/api/v1/ip/{ip}/block")
async def unblock_ip(ip: str):
    """Unblock an IP address"""
    if not threat_service:
        raise HTTPException(status_code=503, detail="Service not ready")
    
    await threat_service.unblock_ip(ip, "api")
    return {"status": "unblocked", "ip": ip}


@app.get("/api/v1/blocked")
async def get_blocked():
    """Get all blocked IPs"""
    if not threat_service:
        raise HTTPException(status_code=503, detail="Service not ready")
    
    blocked = await threat_service.get_blocked_ips()
    return {"blocked": blocked, "count": len(blocked)}


@app.get("/api/v1/tor-exits")
async def get_tor_exits():
    """Get Tor exit node count"""
    if not threat_service:
        raise HTTPException(status_code=503, detail="Service not ready")
    
    return {
        "count": len(threat_service.tor_exits),
        "updated_at": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8100)
