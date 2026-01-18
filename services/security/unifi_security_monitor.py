#!/usr/bin/env python3
"""
Mycosoft Security Operations Center - UniFi Security Monitor

This service provides 24/7 security monitoring by integrating with the UniFi 
Dream Machine API to detect and respond to security threats.

Features:
- Real-time client monitoring
- Geo-IP location verification
- Threat detection and alerting
- Automatic blocking of malicious IPs
- Integration with MYCA security agents

Author: Mycosoft Security Team
Date: 2026-01-17
"""

import os
import sys
import json
import asyncio
import logging
import hashlib
import ipaddress
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum
from pathlib import Path

import aiohttp
import requests
import urllib3
urllib3.disable_warnings()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/var/log/mycosoft/security/unifi-monitor.log', mode='a')
    ] if os.path.exists('/var/log/mycosoft/security') else [logging.StreamHandler()]
)
logger = logging.getLogger('UniFiSecurityMonitor')


class ThreatSeverity(Enum):
    """Security threat severity levels"""
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ThreatAction(Enum):
    """Actions to take on threat detection"""
    LOG = "log"
    ALERT = "alert"
    BLOCK = "block"
    BLOCK_AND_ALERT = "block_and_alert"


@dataclass
class GeoLocation:
    """Geographic location information"""
    ip: str
    country: str = ""
    country_code: str = ""
    region: str = ""
    city: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    isp: str = ""
    org: str = ""
    is_vpn: bool = False
    is_tor: bool = False
    is_proxy: bool = False
    is_hosting: bool = False


@dataclass
class SecurityEvent:
    """Security event record"""
    id: str
    timestamp: datetime
    event_type: str
    severity: ThreatSeverity
    source_ip: str
    source_mac: Optional[str] = None
    destination_ip: Optional[str] = None
    destination_port: Optional[int] = None
    protocol: Optional[str] = None
    geo_location: Optional[GeoLocation] = None
    user_agent: Optional[str] = None
    rule_matched: Optional[str] = None
    action_taken: Optional[ThreatAction] = None
    description: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['severity'] = self.severity.value
        if self.action_taken:
            data['action_taken'] = self.action_taken.value
        return data


@dataclass
class AuthorizedUser:
    """Authorized user with known locations"""
    id: str
    name: str
    role: str
    email: str
    locations: List[Dict]
    access_level: str
    mobile_access: bool
    vpn_allowed: bool
    mfa_enabled: bool
    devices: List[str] = field(default_factory=list)


@dataclass
class NetworkClient:
    """UniFi network client information"""
    mac: str
    ip: str
    hostname: Optional[str] = None
    name: Optional[str] = None
    oui: Optional[str] = None  # Manufacturer
    is_wired: bool = False
    is_guest: bool = False
    network: Optional[str] = None
    vlan: Optional[int] = None
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    bytes_rx: int = 0
    bytes_tx: int = 0
    authorized: bool = False
    blocked: bool = False
    geo_location: Optional[GeoLocation] = None


class GeoIPService:
    """Geo-IP lookup service"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get('GEOIP_API_KEY')
        self.cache: Dict[str, Tuple[GeoLocation, datetime]] = {}
        self.cache_ttl = timedelta(hours=24)
        
    async def lookup(self, ip: str) -> GeoLocation:
        """Look up geographic location for an IP address"""
        # Check cache first
        if ip in self.cache:
            cached, timestamp = self.cache[ip]
            if datetime.now() - timestamp < self.cache_ttl:
                return cached
        
        # Skip private IPs
        try:
            ip_obj = ipaddress.ip_address(ip)
            if ip_obj.is_private or ip_obj.is_loopback:
                return GeoLocation(ip=ip, country="LOCAL", country_code="LO")
        except ValueError:
            return GeoLocation(ip=ip)
        
        # Try ip-api.com (free, no key required)
        try:
            async with aiohttp.ClientSession() as session:
                url = f"http://ip-api.com/json/{ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,isp,org,proxy,hosting"
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('status') == 'success':
                            geo = GeoLocation(
                                ip=ip,
                                country=data.get('country', ''),
                                country_code=data.get('countryCode', ''),
                                region=data.get('regionName', ''),
                                city=data.get('city', ''),
                                latitude=data.get('lat', 0),
                                longitude=data.get('lon', 0),
                                isp=data.get('isp', ''),
                                org=data.get('org', ''),
                                is_proxy=data.get('proxy', False),
                                is_hosting=data.get('hosting', False)
                            )
                            self.cache[ip] = (geo, datetime.now())
                            return geo
        except Exception as e:
            logger.warning(f"Geo-IP lookup failed for {ip}: {e}")
        
        return GeoLocation(ip=ip)
    
    async def is_tor_exit_node(self, ip: str) -> bool:
        """Check if IP is a known TOR exit node"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"https://check.torproject.org/torbulkexitlist?ip={ip}"
                async with session.get(url) as response:
                    if response.status == 200:
                        text = await response.text()
                        return ip in text
        except Exception:
            pass
        return False


class UniFiClient:
    """UniFi Network Controller API Client"""
    
    def __init__(self, host: str, username: str = None, password: str = None, 
                 api_key: str = None, site: str = "default", verify_ssl: bool = False):
        self.host = host
        self.username = username or os.environ.get('UNIFI_USERNAME')
        self.password = password or os.environ.get('UNIFI_PASSWORD')
        self.api_key = api_key or os.environ.get('UNIFI_API_KEY')
        self.site = site
        self.verify_ssl = verify_ssl
        self.base_url = f"https://{host}"
        self.session: Optional[aiohttp.ClientSession] = None
        self._logged_in = False
        
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session"""
        if self.session is None or self.session.closed:
            connector = aiohttp.TCPConnector(ssl=False if not self.verify_ssl else None)
            self.session = aiohttp.ClientSession(connector=connector)
        return self.session
    
    async def login(self) -> bool:
        """Authenticate with UniFi controller"""
        if self.api_key:
            # Using API key authentication
            self._logged_in = True
            return True
            
        session = await self._get_session()
        try:
            url = f"{self.base_url}/api/auth/login"
            payload = {"username": self.username, "password": self.password}
            async with session.post(url, json=payload) as response:
                if response.status == 200:
                    self._logged_in = True
                    logger.info("Successfully logged into UniFi controller")
                    return True
                else:
                    logger.error(f"UniFi login failed: {response.status}")
                    return False
        except Exception as e:
            logger.error(f"UniFi login error: {e}")
            return False
    
    async def _request(self, method: str, endpoint: str, data: Dict = None) -> Optional[Dict]:
        """Make authenticated request to UniFi API"""
        session = await self._get_session()
        url = f"{self.base_url}{endpoint}"
        headers = {}
        
        if self.api_key:
            headers['X-API-Key'] = self.api_key
        
        try:
            async with session.request(method, url, json=data, headers=headers) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.warning(f"UniFi API request failed: {response.status} {endpoint}")
                    return None
        except Exception as e:
            logger.error(f"UniFi API error: {e}")
            return None
    
    async def get_clients(self) -> List[NetworkClient]:
        """Get all connected network clients"""
        data = await self._request('GET', f'/proxy/network/api/s/{self.site}/stat/sta')
        if not data:
            return []
        
        clients = []
        for item in data.get('data', []):
            client = NetworkClient(
                mac=item.get('mac', ''),
                ip=item.get('ip', ''),
                hostname=item.get('hostname'),
                name=item.get('name'),
                oui=item.get('oui'),
                is_wired=item.get('is_wired', False),
                is_guest=item.get('is_guest', False),
                network=item.get('network'),
                vlan=item.get('vlan'),
                bytes_rx=item.get('rx_bytes', 0),
                bytes_tx=item.get('tx_bytes', 0),
                blocked=item.get('blocked', False)
            )
            if item.get('first_seen'):
                client.first_seen = datetime.fromtimestamp(item['first_seen'])
            if item.get('last_seen'):
                client.last_seen = datetime.fromtimestamp(item['last_seen'])
            clients.append(client)
        
        return clients
    
    async def get_devices(self) -> List[Dict]:
        """Get all UniFi network devices"""
        data = await self._request('GET', f'/proxy/network/api/s/{self.site}/stat/device')
        return data.get('data', []) if data else []
    
    async def get_active_threats(self) -> List[Dict]:
        """Get active IDS/IPS threats from UniFi"""
        data = await self._request('GET', f'/proxy/network/api/s/{self.site}/stat/ips/event')
        return data.get('data', []) if data else []
    
    async def get_anomalies(self) -> List[Dict]:
        """Get traffic anomalies detected by UniFi"""
        data = await self._request('GET', f'/proxy/network/api/s/{self.site}/stat/anomaly')
        return data.get('data', []) if data else []
    
    async def block_client(self, mac: str) -> bool:
        """Block a client by MAC address"""
        endpoint = f'/proxy/network/api/s/{self.site}/cmd/stamgr'
        payload = {"cmd": "block-sta", "mac": mac}
        result = await self._request('POST', endpoint, payload)
        if result:
            logger.warning(f"Blocked client: {mac}")
            return True
        return False
    
    async def unblock_client(self, mac: str) -> bool:
        """Unblock a client by MAC address"""
        endpoint = f'/proxy/network/api/s/{self.site}/cmd/stamgr'
        payload = {"cmd": "unblock-sta", "mac": mac}
        result = await self._request('POST', endpoint, payload)
        if result:
            logger.info(f"Unblocked client: {mac}")
            return True
        return False
    
    async def get_firewall_rules(self) -> List[Dict]:
        """Get current firewall rules"""
        data = await self._request('GET', f'/proxy/network/api/s/{self.site}/rest/firewallrule')
        return data.get('data', []) if data else []
    
    async def close(self):
        """Close the session"""
        if self.session and not self.session.closed:
            await self.session.close()


class ThreatDetector:
    """Threat detection engine"""
    
    def __init__(self, config: Dict, authorized_users: List[AuthorizedUser]):
        self.config = config
        self.authorized_users = {u.id: u for u in authorized_users}
        self.trusted_services = config.get('trusted_services', [])
        self.high_risk_countries = config.get('high_risk_countries', [])
        self.allowed_countries = config.get('allowed_countries', ['US', 'CA'])
        self.rules = config.get('threat_detection', {}).get('rules', [])
        
        # Tracking for rate limiting and pattern detection
        self.ip_access_count: Dict[str, List[datetime]] = {}
        self.failed_logins: Dict[str, List[datetime]] = {}
        self.port_access: Dict[str, set] = {}
        self.data_transfer: Dict[str, int] = {}
        
    def _generate_event_id(self, ip: str, event_type: str) -> str:
        """Generate unique event ID"""
        data = f"{ip}-{event_type}-{datetime.now().isoformat()}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def _is_trusted_service_ip(self, ip: str) -> bool:
        """Check if IP belongs to a trusted service"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            for service in self.trusted_services:
                for cidr in service.get('ips', []):
                    try:
                        network = ipaddress.ip_network(cidr, strict=False)
                        if ip_obj in network:
                            return True
                    except ValueError:
                        continue
        except ValueError:
            pass
        return False
    
    def _is_user_location(self, ip: str, geo: GeoLocation) -> Tuple[bool, Optional[str]]:
        """Check if geo-location matches any authorized user location"""
        if not geo or not geo.latitude:
            return False, None
        
        for user in self.authorized_users.values():
            for location in user.locations:
                coords = location.get('coordinates', {})
                if coords:
                    # Simple distance check using Euclidean approximation
                    lat_diff = abs(geo.latitude - coords.get('lat', 0))
                    lng_diff = abs(geo.longitude - coords.get('lng', 0))
                    # Approximate km per degree at mid-latitudes
                    distance_km = ((lat_diff * 111) ** 2 + (lng_diff * 85) ** 2) ** 0.5
                    radius = location.get('radius_km', 50)
                    if distance_km <= radius:
                        return True, user.id
        
        return False, None
    
    async def analyze_client(self, client: NetworkClient, geo_service: GeoIPService) -> List[SecurityEvent]:
        """Analyze a network client for threats"""
        events = []
        
        if not client.ip:
            return events
        
        # Get geo-location
        geo = await geo_service.lookup(client.ip)
        client.geo_location = geo
        
        # Skip private IPs
        try:
            ip_obj = ipaddress.ip_address(client.ip)
            if ip_obj.is_private or ip_obj.is_loopback:
                return events
        except ValueError:
            return events
        
        # Check if it's a trusted service
        if self._is_trusted_service_ip(client.ip):
            return events
        
        # Rule 001: Non-US/CA traffic
        if geo.country_code and geo.country_code not in self.allowed_countries:
            # Check if it matches a user location (like Beto in Alberta)
            is_user_loc, user_id = self._is_user_location(client.ip, geo)
            if not is_user_loc:
                events.append(SecurityEvent(
                    id=self._generate_event_id(client.ip, "non-us-traffic"),
                    timestamp=datetime.now(),
                    event_type="non_authorized_country",
                    severity=ThreatSeverity.MEDIUM,
                    source_ip=client.ip,
                    source_mac=client.mac,
                    geo_location=geo,
                    rule_matched="rule-001",
                    description=f"Traffic from non-US/CA country: {geo.country} ({geo.country_code})",
                    metadata={"country": geo.country, "city": geo.city}
                ))
        
        # Rule 002: High-risk country traffic
        if geo.country_code in self.high_risk_countries:
            events.append(SecurityEvent(
                id=self._generate_event_id(client.ip, "high-risk-country"),
                timestamp=datetime.now(),
                event_type="high_risk_country",
                severity=ThreatSeverity.CRITICAL,
                source_ip=client.ip,
                source_mac=client.mac,
                geo_location=geo,
                rule_matched="rule-002",
                action_taken=ThreatAction.BLOCK_AND_ALERT,
                description=f"Traffic from high-risk country: {geo.country} ({geo.country_code})",
                metadata={"country": geo.country, "should_block": True}
            ))
        
        # Rule 003: Unknown IP not matching user locations
        is_user_loc, user_id = self._is_user_location(client.ip, geo)
        if not is_user_loc and geo.country_code in self.allowed_countries:
            events.append(SecurityEvent(
                id=self._generate_event_id(client.ip, "unknown-ip"),
                timestamp=datetime.now(),
                event_type="unknown_ip_access",
                severity=ThreatSeverity.HIGH,
                source_ip=client.ip,
                source_mac=client.mac,
                geo_location=geo,
                rule_matched="rule-003",
                description=f"Access from unknown IP not matching user locations: {geo.city}, {geo.region}",
                metadata={"city": geo.city, "region": geo.region, "isp": geo.isp}
            ))
        
        # Rule 008: TOR exit node check
        if await geo_service.is_tor_exit_node(client.ip):
            geo.is_tor = True
            events.append(SecurityEvent(
                id=self._generate_event_id(client.ip, "tor-exit"),
                timestamp=datetime.now(),
                event_type="tor_exit_node",
                severity=ThreatSeverity.HIGH,
                source_ip=client.ip,
                source_mac=client.mac,
                geo_location=geo,
                rule_matched="rule-008",
                action_taken=ThreatAction.BLOCK_AND_ALERT,
                description="Traffic from TOR exit node detected",
                metadata={"is_tor": True}
            ))
        
        # Rule 009: VPN detection
        if geo.is_proxy or geo.is_hosting:
            events.append(SecurityEvent(
                id=self._generate_event_id(client.ip, "vpn-detected"),
                timestamp=datetime.now(),
                event_type="vpn_proxy_detected",
                severity=ThreatSeverity.INFO,
                source_ip=client.ip,
                source_mac=client.mac,
                geo_location=geo,
                rule_matched="rule-009",
                action_taken=ThreatAction.LOG,
                description="VPN/Proxy/Hosting provider detected",
                metadata={"is_proxy": geo.is_proxy, "is_hosting": geo.is_hosting, "isp": geo.isp}
            ))
        
        # Rule 010: New device connection
        if not client.authorized and client.first_seen:
            # If device was seen in the last hour, it's new
            if datetime.now() - client.first_seen < timedelta(hours=1):
                events.append(SecurityEvent(
                    id=self._generate_event_id(client.mac, "new-device"),
                    timestamp=datetime.now(),
                    event_type="new_device_connection",
                    severity=ThreatSeverity.LOW,
                    source_ip=client.ip,
                    source_mac=client.mac,
                    geo_location=geo,
                    rule_matched="rule-010",
                    description=f"New device connected: {client.hostname or client.name or client.mac}",
                    metadata={
                        "hostname": client.hostname,
                        "manufacturer": client.oui,
                        "is_wired": client.is_wired
                    }
                ))
        
        return events
    
    def analyze_traffic_patterns(self, ip: str, bytes_transferred: int) -> List[SecurityEvent]:
        """Analyze traffic patterns for anomalies"""
        events = []
        
        # Track data transfer
        self.data_transfer[ip] = self.data_transfer.get(ip, 0) + bytes_transferred
        
        # Rule 006: Data exfiltration detection (500MB/hour)
        if self.data_transfer.get(ip, 0) > 500 * 1024 * 1024:  # 500MB
            events.append(SecurityEvent(
                id=self._generate_event_id(ip, "data-exfil"),
                timestamp=datetime.now(),
                event_type="potential_data_exfiltration",
                severity=ThreatSeverity.CRITICAL,
                source_ip=ip,
                rule_matched="rule-006",
                description=f"Unusual data transfer detected: {self.data_transfer[ip] / (1024*1024):.2f} MB",
                metadata={"bytes_transferred": self.data_transfer[ip]}
            ))
        
        return events


class SecurityAlertManager:
    """Manages security alerts and notifications"""
    
    def __init__(self, config: Dict):
        self.config = config.get('alerting', {})
        self.channels = self.config.get('channels', {})
        self.rate_limits = self.config.get('rate_limits', {})
        self.sent_alerts: Dict[str, datetime] = {}
        self.dedup_window = timedelta(seconds=self.rate_limits.get('dedup_window_seconds', 300))
        
    def _should_send(self, event_id: str) -> bool:
        """Check if alert should be sent (deduplication)"""
        if event_id in self.sent_alerts:
            if datetime.now() - self.sent_alerts[event_id] < self.dedup_window:
                return False
        return True
    
    async def send_alert(self, event: SecurityEvent):
        """Send alert through configured channels (dashboard only)"""
        if not self._should_send(event.id):
            logger.debug(f"Skipping duplicate alert: {event.id}")
            return
        
        self.sent_alerts[event.id] = datetime.now()
        
        # Log the event to console and file
        logger.warning(f"SECURITY EVENT: {event.to_dict()}")


class SecurityEventStore:
    """Stores security events for analysis and audit"""
    
    def __init__(self, config: Dict):
        self.config = config.get('audit_logging', {})
        self.log_path = Path(self.config.get('log_path', '/var/log/mycosoft/security'))
        self.events: List[SecurityEvent] = []
        self.max_memory_events = 10000
        
        # Ensure log directory exists
        self.log_path.mkdir(parents=True, exist_ok=True)
        
    async def store(self, event: SecurityEvent):
        """Store a security event"""
        # Keep in memory
        self.events.append(event)
        if len(self.events) > self.max_memory_events:
            self.events = self.events[-self.max_memory_events:]
        
        # Write to log file
        log_file = self.log_path / f"security-events-{datetime.now().strftime('%Y-%m-%d')}.jsonl"
        try:
            with open(log_file, 'a') as f:
                f.write(json.dumps(event.to_dict()) + '\n')
        except Exception as e:
            logger.error(f"Failed to write event to log: {e}")
    
    def get_recent_events(self, minutes: int = 60, severity: Optional[ThreatSeverity] = None) -> List[SecurityEvent]:
        """Get recent security events"""
        cutoff = datetime.now() - timedelta(minutes=minutes)
        events = [e for e in self.events if e.timestamp > cutoff]
        if severity:
            events = [e for e in events if e.severity == severity]
        return events
    
    def get_threat_summary(self) -> Dict:
        """Get summary of current threats"""
        now = datetime.now()
        hour_ago = now - timedelta(hours=1)
        day_ago = now - timedelta(days=1)
        
        recent_hour = [e for e in self.events if e.timestamp > hour_ago]
        recent_day = [e for e in self.events if e.timestamp > day_ago]
        
        return {
            "total_events_hour": len(recent_hour),
            "total_events_day": len(recent_day),
            "critical_hour": len([e for e in recent_hour if e.severity == ThreatSeverity.CRITICAL]),
            "critical_day": len([e for e in recent_day if e.severity == ThreatSeverity.CRITICAL]),
            "high_hour": len([e for e in recent_hour if e.severity == ThreatSeverity.HIGH]),
            "high_day": len([e for e in recent_day if e.severity == ThreatSeverity.HIGH]),
            "unique_ips_hour": len(set(e.source_ip for e in recent_hour)),
            "unique_ips_day": len(set(e.source_ip for e in recent_day)),
            "blocked_count": len([e for e in recent_day if e.action_taken == ThreatAction.BLOCK_AND_ALERT]),
            "last_updated": now.isoformat()
        }


class UniFiSecurityMonitor:
    """Main security monitoring service"""
    
    def __init__(self, config_path: str = None, users_path: str = None):
        # Load configuration
        config_file = config_path or os.environ.get(
            'SECURITY_CONFIG_PATH',
            '/opt/mycosoft/config/security/security-config.json'
        )
        users_file = users_path or os.environ.get(
            'AUTHORIZED_USERS_PATH',
            '/opt/mycosoft/config/security/authorized-users.json'
        )
        
        self.config = self._load_json(config_file)
        self.users_config = self._load_json(users_file)
        
        # Parse authorized users
        self.authorized_users = [
            AuthorizedUser(**u) for u in self.users_config.get('users', [])
        ]
        
        # Initialize components
        unifi_config = self.config.get('unifi_integration', {})
        self.unifi = UniFiClient(
            host=unifi_config.get('host', os.environ.get('UNIFI_HOST', '192.168.0.1')),
            site=unifi_config.get('site', 'default')
        )
        self.geo_service = GeoIPService()
        self.threat_detector = ThreatDetector(
            {**self.config, **self.users_config},
            self.authorized_users
        )
        self.alert_manager = SecurityAlertManager(self.config)
        self.event_store = SecurityEventStore(self.config)
        
        self.running = False
        self.poll_interval = unifi_config.get('poll_interval_seconds', 30)
        
    def _load_json(self, path: str) -> Dict:
        """Load JSON configuration file"""
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Config file not found: {path}, using defaults")
            return {}
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in {path}: {e}")
            return {}
    
    async def start(self):
        """Start the security monitoring service"""
        logger.info("🔒 Starting Mycosoft Security Operations Center")
        logger.info(f"  Monitoring interval: {self.poll_interval} seconds")
        logger.info(f"  Authorized users: {len(self.authorized_users)}")
        logger.info(f"  Allowed countries: {self.users_config.get('allowed_countries', [])}")
        
        # Login to UniFi
        if not await self.unifi.login():
            logger.error("Failed to connect to UniFi controller")
            return
        
        self.running = True
        
        try:
            while self.running:
                await self._monitor_cycle()
                await asyncio.sleep(self.poll_interval)
        except asyncio.CancelledError:
            logger.info("Security monitor shutting down...")
        finally:
            await self.unifi.close()
    
    async def _monitor_cycle(self):
        """Run one monitoring cycle"""
        cycle_start = datetime.now()
        events_detected = 0
        
        try:
            # Get all connected clients
            clients = await self.unifi.get_clients()
            logger.debug(f"Monitoring {len(clients)} connected clients")
            
            # Analyze each client
            for client in clients:
                events = await self.threat_detector.analyze_client(client, self.geo_service)
                
                # Process detected events
                for event in events:
                    events_detected += 1
                    
                    # Store event
                    await self.event_store.store(event)
                    
                    # Send alerts for high severity events
                    if event.severity in [ThreatSeverity.MEDIUM, ThreatSeverity.HIGH, ThreatSeverity.CRITICAL]:
                        await self.alert_manager.send_alert(event)
                    
                    # Auto-block for critical threats
                    if event.action_taken == ThreatAction.BLOCK_AND_ALERT and client.mac:
                        logger.warning(f"Auto-blocking client: {client.mac} due to {event.event_type}")
                        await self.unifi.block_client(client.mac)
            
            # Check for UniFi IDS/IPS threats
            threats = await self.unifi.get_active_threats()
            for threat in threats:
                event = SecurityEvent(
                    id=threat.get('_id', self.threat_detector._generate_event_id(
                        threat.get('src_ip', 'unknown'), 'ids-threat'
                    )),
                    timestamp=datetime.now(),
                    event_type="ids_threat_detected",
                    severity=ThreatSeverity.HIGH,
                    source_ip=threat.get('src_ip', ''),
                    destination_ip=threat.get('dest_ip', ''),
                    destination_port=threat.get('dest_port'),
                    description=threat.get('msg', 'IDS threat detected'),
                    metadata=threat
                )
                await self.event_store.store(event)
                await self.alert_manager.send_alert(event)
                events_detected += 1
            
            cycle_time = (datetime.now() - cycle_start).total_seconds()
            logger.debug(f"Monitor cycle complete: {events_detected} events, {cycle_time:.2f}s")
            
        except Exception as e:
            logger.error(f"Error in monitor cycle: {e}")
    
    async def stop(self):
        """Stop the security monitoring service"""
        self.running = False
        await self.unifi.close()
    
    def get_status(self) -> Dict:
        """Get current security status"""
        return {
            "status": "running" if self.running else "stopped",
            "threat_summary": self.event_store.get_threat_summary(),
            "authorized_users": len(self.authorized_users),
            "last_check": datetime.now().isoformat()
        }
    
    def get_authorized_users(self) -> List[Dict]:
        """Get list of authorized users (sanitized)"""
        return [
            {
                "id": u.id,
                "name": u.name,
                "role": u.role,
                "locations": [loc.get('name') for loc in u.locations],
                "mobile_access": u.mobile_access
            }
            for u in self.authorized_users
        ]


async def main():
    """Main entry point"""
    # Determine config paths
    base_path = os.environ.get('MYCOSOFT_CONFIG_PATH', '/opt/mycosoft')
    config_path = os.path.join(base_path, 'config/security/security-config.json')
    users_path = os.path.join(base_path, 'config/security/authorized-users.json')
    
    # Check for local development paths
    if not os.path.exists(config_path):
        local_base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        mas_config = os.path.join(local_base, 'mycosoft-mas', 'config', 'security', 'security-config.json')
        mas_users = os.path.join(local_base, 'mycosoft-mas', 'config', 'security', 'authorized-users.json')
        if os.path.exists(mas_config):
            config_path = mas_config
            users_path = mas_users
    
    monitor = UniFiSecurityMonitor(config_path, users_path)
    
    try:
        await monitor.start()
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    finally:
        await monitor.stop()


if __name__ == "__main__":
    asyncio.run(main())
