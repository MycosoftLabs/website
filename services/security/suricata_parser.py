#!/usr/bin/env python3
"""
Mycosoft Suricata EVE JSON Log Parser

Monitors Suricata's EVE JSON log file and publishes security events to Redis.
Supports alert detection, flow analysis, and threat correlation.
"""

import asyncio
import json
import os
from datetime import datetime
from typing import Any, Dict, Optional
from dataclasses import dataclass, asdict

import redis.asyncio as redis
import structlog

structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
)
logger = structlog.get_logger()


@dataclass
class SuricataEvent:
    event_type: str
    timestamp: str
    src_ip: str
    src_port: int
    dest_ip: str
    dest_port: int
    proto: str
    severity: int
    signature: str
    signature_id: int
    category: str
    raw: Dict[str, Any]


class SuricataParser:
    """Parses Suricata EVE JSON logs and publishes to Redis"""
    
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.eve_log_path = os.getenv("EVE_LOG_PATH", "/var/log/suricata/eve.json")
        self.parse_interval = int(os.getenv("PARSE_INTERVAL", "5"))
        self.redis_client: Optional[redis.Redis] = None
        self.last_position = 0
        
    async def connect(self):
        """Connect to Redis"""
        self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
        await self.redis_client.ping()
        logger.info("Connected to Redis", url=self.redis_url)
        
        # Restore last position from Redis
        pos = await self.redis_client.get("suricata:last_position")
        if pos:
            self.last_position = int(pos)
            logger.info("Restored position", position=self.last_position)
    
    async def close(self):
        """Close connections"""
        if self.redis_client:
            await self.redis_client.close()
    
    def _parse_event(self, line: str) -> Optional[SuricataEvent]:
        """Parse a single EVE JSON line"""
        try:
            data = json.loads(line)
            event_type = data.get("event_type", "unknown")
            
            # We're mainly interested in alerts
            if event_type != "alert":
                return None
            
            alert = data.get("alert", {})
            
            return SuricataEvent(
                event_type=event_type,
                timestamp=data.get("timestamp", datetime.utcnow().isoformat()),
                src_ip=data.get("src_ip", ""),
                src_port=data.get("src_port", 0),
                dest_ip=data.get("dest_ip", ""),
                dest_port=data.get("dest_port", 0),
                proto=data.get("proto", ""),
                severity=alert.get("severity", 3),
                signature=alert.get("signature", ""),
                signature_id=alert.get("signature_id", 0),
                category=alert.get("category", ""),
                raw=data
            )
            
        except json.JSONDecodeError:
            return None
        except Exception as e:
            logger.error("Parse error", error=str(e))
            return None
    
    def _severity_to_level(self, severity: int) -> str:
        """Convert Suricata severity to threat level"""
        if severity == 1:
            return "critical"
        elif severity == 2:
            return "high"
        elif severity == 3:
            return "medium"
        else:
            return "low"
    
    async def _publish_event(self, event: SuricataEvent):
        """Publish event to Redis"""
        if not self.redis_client:
            return
        
        event_data = {
            "source": "suricata",
            "event_type": event.event_type,
            "timestamp": event.timestamp,
            "threat_level": self._severity_to_level(event.severity),
            "src_ip": event.src_ip,
            "src_port": event.src_port,
            "dest_ip": event.dest_ip,
            "dest_port": event.dest_port,
            "proto": event.proto,
            "signature": event.signature,
            "signature_id": event.signature_id,
            "category": event.category
        }
        
        # Publish to channel
        await self.redis_client.publish("security:ids_events", json.dumps(event_data))
        
        # Store in list for history
        await self.redis_client.lpush("security:ids_history", json.dumps(event_data))
        await self.redis_client.ltrim("security:ids_history", 0, 9999)
        
        # Update counters
        await self.redis_client.incr("security:ids_count:total")
        await self.redis_client.incr(f"security:ids_count:{self._severity_to_level(event.severity)}")
        
        logger.info(
            "Published IDS event",
            signature=event.signature,
            src_ip=event.src_ip,
            severity=event.severity
        )
    
    async def parse_file(self):
        """Parse EVE log file from last position"""
        if not os.path.exists(self.eve_log_path):
            logger.warning("EVE log not found", path=self.eve_log_path)
            return
        
        try:
            with open(self.eve_log_path, 'r') as f:
                # Check file size
                f.seek(0, 2)
                file_size = f.tell()
                
                # If file was truncated (rotation), reset position
                if file_size < self.last_position:
                    self.last_position = 0
                    logger.info("Log rotated, resetting position")
                
                # Seek to last position
                f.seek(self.last_position)
                
                events_parsed = 0
                for line in f:
                    event = self._parse_event(line.strip())
                    if event:
                        await self._publish_event(event)
                        events_parsed += 1
                
                # Save new position
                self.last_position = f.tell()
                if self.redis_client:
                    await self.redis_client.set("suricata:last_position", self.last_position)
                
                if events_parsed > 0:
                    logger.info("Parsed events", count=events_parsed)
                    
        except Exception as e:
            logger.error("File parse error", error=str(e))
    
    async def run(self):
        """Main run loop"""
        while True:
            try:
                await self.parse_file()
                await asyncio.sleep(self.parse_interval)
            except Exception as e:
                logger.error("Run loop error", error=str(e))
                await asyncio.sleep(10)


async def main():
    """Main entry point"""
    parser = SuricataParser()
    
    try:
        await parser.connect()
        await parser.run()
    except KeyboardInterrupt:
        logger.info("Shutting down parser")
    finally:
        await parser.close()


if __name__ == "__main__":
    asyncio.run(main())
