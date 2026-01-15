"""
MINDEX Audit Logger Service
Logs all data events to MINDEX for audit trail and data lineage tracking.

This service:
1. Receives events from all data collectors
2. Logs them to MINDEX with full metadata
3. Provides queryable audit trail
4. Supports data lineage tracking

Author: Mycosoft
Version: 1.0.0
"""

import asyncio
import json
import logging
import os
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict
from enum import Enum

import aiohttp

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class EventType(Enum):
    """Types of events that can be logged."""
    DATA_COLLECTED = "data_collected"
    DATA_UPDATED = "data_updated"
    DATA_DELETED = "data_deleted"
    API_CALL = "api_call"
    CACHE_HIT = "cache_hit"
    CACHE_MISS = "cache_miss"
    ERROR = "error"
    GEOCODING = "geocoding"
    ENRICHMENT = "enrichment"
    SYSTEM = "system"


@dataclass
class AuditEvent:
    """Represents an audit event."""
    event_id: str
    event_type: str
    source: str
    entity_type: str
    entity_id: Optional[str]
    action: str
    metadata: Dict[str, Any]
    timestamp: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    success: bool = True
    error_message: Optional[str] = None


class LocalAuditStore:
    """Local SQLite store for audit events (backup/offline mode)."""
    
    def __init__(self, db_path: str = "./data/audit_log.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        """Initialize database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT UNIQUE NOT NULL,
                event_type TEXT NOT NULL,
                source TEXT NOT NULL,
                entity_type TEXT,
                entity_id TEXT,
                action TEXT NOT NULL,
                metadata TEXT,
                timestamp TIMESTAMP NOT NULL,
                user_id TEXT,
                session_id TEXT,
                ip_address TEXT,
                success INTEGER DEFAULT 1,
                error_message TEXT,
                synced_to_mindex INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_event_type ON audit_events(event_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_entity ON audit_events(entity_type, entity_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_events(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_synced ON audit_events(synced_to_mindex)")
        
        conn.commit()
        conn.close()
        logger.info(f"Audit store initialized at {self.db_path}")
    
    def log_event(self, event: AuditEvent):
        """Store an audit event locally."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO audit_events
                (event_id, event_type, source, entity_type, entity_id, action, metadata,
                 timestamp, user_id, session_id, ip_address, success, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id, event.event_type, event.source, event.entity_type,
                event.entity_id, event.action, json.dumps(event.metadata),
                event.timestamp, event.user_id, event.session_id, event.ip_address,
                1 if event.success else 0, event.error_message
            ))
            conn.commit()
        except sqlite3.IntegrityError:
            pass  # Event already exists
        finally:
            conn.close()
    
    def get_unsynced_events(self, limit: int = 100) -> List[AuditEvent]:
        """Get events not yet synced to MINDEX."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT event_id, event_type, source, entity_type, entity_id, action,
                   metadata, timestamp, user_id, session_id, ip_address, success, error_message
            FROM audit_events
            WHERE synced_to_mindex = 0
            ORDER BY timestamp ASC
            LIMIT ?
        """, (limit,))
        
        events = []
        for row in cursor.fetchall():
            events.append(AuditEvent(
                event_id=row[0], event_type=row[1], source=row[2],
                entity_type=row[3], entity_id=row[4], action=row[5],
                metadata=json.loads(row[6]) if row[6] else {},
                timestamp=row[7], user_id=row[8], session_id=row[9],
                ip_address=row[10], success=bool(row[11]), error_message=row[12]
            ))
        
        conn.close()
        return events
    
    def mark_synced(self, event_ids: List[str]):
        """Mark events as synced to MINDEX."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        placeholders = ','.join('?' * len(event_ids))
        cursor.execute(f"""
            UPDATE audit_events SET synced_to_mindex = 1
            WHERE event_id IN ({placeholders})
        """, event_ids)
        
        conn.commit()
        conn.close()
    
    def get_events(
        self,
        event_type: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Query audit events."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = "SELECT * FROM audit_events WHERE 1=1"
        params = []
        
        if event_type:
            query += " AND event_type = ?"
            params.append(event_type)
        if entity_type:
            query += " AND entity_type = ?"
            params.append(entity_type)
        if entity_id:
            query += " AND entity_id = ?"
            params.append(entity_id)
        if start_time:
            query += " AND timestamp >= ?"
            params.append(start_time.isoformat())
        if end_time:
            query += " AND timestamp <= ?"
            params.append(end_time.isoformat())
        
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        
        columns = [desc[0] for desc in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        return results
    
    def cleanup_old_events(self, days: int = 90):
        """Remove old synced events."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cutoff = datetime.now() - timedelta(days=days)
        cursor.execute("""
            DELETE FROM audit_events 
            WHERE synced_to_mindex = 1 AND timestamp < ?
        """, (cutoff.isoformat(),))
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        logger.info(f"Cleaned up {deleted} old audit events")
        return deleted


class MINDEXAuditLogger:
    """
    Main MINDEX audit logger that:
    1. Stores events locally for reliability
    2. Syncs to MINDEX API when available
    3. Provides query interface for audit trail
    """
    
    def __init__(
        self,
        mindex_api_url: str = "http://localhost:8001",
        local_store_path: str = "./data/audit_log.db",
        redis_url: str = "redis://localhost:6379"
    ):
        self.mindex_api_url = mindex_api_url
        self.local_store = LocalAuditStore(local_store_path)
        self.redis_url = redis_url
        self.session: Optional[aiohttp.ClientSession] = None
        self.redis_client = None
        self.stats = {"logged": 0, "synced": 0, "errors": 0}
        self._event_counter = 0
    
    async def start(self):
        """Initialize the logger."""
        self.session = aiohttp.ClientSession()
        
        try:
            import redis.asyncio as redis
            self.redis_client = redis.from_url(self.redis_url)
            await self.redis_client.ping()
            logger.info("Connected to Redis for event streaming")
        except Exception as e:
            logger.warning(f"Redis not available: {e}")
        
        logger.info("MINDEX Audit Logger started")
    
    async def stop(self):
        """Cleanup resources."""
        if self.session:
            await self.session.close()
        if self.redis_client:
            await self.redis_client.close()
        logger.info(f"MINDEX Audit Logger stopped. Stats: {self.stats}")
    
    def _generate_event_id(self) -> str:
        """Generate a unique event ID."""
        import uuid
        return str(uuid.uuid4())
    
    async def log(
        self,
        event_type: EventType,
        source: str,
        action: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        metadata: Optional[Dict] = None,
        user_id: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> str:
        """
        Log an audit event.
        
        Args:
            event_type: Type of event
            source: Source system/service
            action: Action performed
            entity_type: Type of entity affected
            entity_id: ID of entity affected
            metadata: Additional metadata
            user_id: User who triggered the event
            success: Whether the action succeeded
            error_message: Error message if failed
        
        Returns:
            Event ID
        """
        event = AuditEvent(
            event_id=self._generate_event_id(),
            event_type=event_type.value,
            source=source,
            entity_type=entity_type or "",
            entity_id=entity_id,
            action=action,
            metadata=metadata or {},
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            success=success,
            error_message=error_message
        )
        
        # Store locally first (always succeeds)
        self.local_store.log_event(event)
        self.stats["logged"] += 1
        
        # Publish to Redis for real-time consumers
        if self.redis_client:
            try:
                await self.redis_client.publish("audit:events", json.dumps(asdict(event)))
            except Exception:
                pass
        
        return event.event_id
    
    async def sync_to_mindex(self) -> int:
        """Sync unsynced events to MINDEX API."""
        events = self.local_store.get_unsynced_events(limit=100)
        if not events:
            return 0
        
        synced_ids = []
        
        for event in events:
            try:
                async with self.session.post(
                    f"{self.mindex_api_url}/api/v1/audit/events",
                    json=asdict(event),
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status in (200, 201):
                        synced_ids.append(event.event_id)
                    else:
                        logger.warning(f"Failed to sync event {event.event_id}: {resp.status}")
            except Exception as e:
                logger.debug(f"MINDEX sync error: {e}")
                break  # Stop trying if MINDEX is unavailable
        
        if synced_ids:
            self.local_store.mark_synced(synced_ids)
            self.stats["synced"] += len(synced_ids)
            logger.info(f"Synced {len(synced_ids)} events to MINDEX")
        
        return len(synced_ids)
    
    async def run_sync_loop(self, interval_seconds: int = 60):
        """Run the sync loop continuously."""
        await self.start()
        
        try:
            while True:
                await self.sync_to_mindex()
                self.local_store.cleanup_old_events()
                await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            pass
        finally:
            await self.stop()
    
    def query(self, **kwargs) -> List[Dict]:
        """Query audit events."""
        return self.local_store.get_events(**kwargs)


# Convenience functions for logging from other services
_logger_instance: Optional[MINDEXAuditLogger] = None


def get_logger() -> MINDEXAuditLogger:
    """Get or create the global logger instance."""
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = MINDEXAuditLogger(
            mindex_api_url=os.getenv("MINDEX_API_URL", "http://localhost:8001"),
            local_store_path=os.getenv("AUDIT_LOG_PATH", "./data/audit_log.db"),
            redis_url=os.getenv("REDIS_URL", "redis://localhost:6379")
        )
    return _logger_instance


async def log_event(
    event_type: EventType,
    source: str,
    action: str,
    **kwargs
) -> str:
    """Log an event using the global logger."""
    logger_instance = get_logger()
    return await logger_instance.log(event_type, source, action, **kwargs)


async def main():
    """Main entry point."""
    audit_logger = MINDEXAuditLogger(
        mindex_api_url=os.getenv("MINDEX_API_URL", "http://localhost:8001"),
        local_store_path=os.getenv("AUDIT_LOG_PATH", "./data/audit_log.db"),
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379")
    )
    await audit_logger.run_sync_loop(
        interval_seconds=int(os.getenv("SYNC_INTERVAL", "60"))
    )


if __name__ == "__main__":
    asyncio.run(main())
