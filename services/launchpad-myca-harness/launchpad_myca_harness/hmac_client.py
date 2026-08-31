"""HMAC-SHA256 matching lib/launchpad/agent/hmac.ts (utf-8 key, `${ts}.${rawBody}`)."""

from __future__ import annotations

import hashlib
import hmac


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def build_agent_signature(hmac_key: str, timestamp_sec: int, raw_body: str) -> str:
    msg = f"{timestamp_sec}.{raw_body}".encode("utf-8")
    return hmac.new(hmac_key.encode("utf-8"), msg, hashlib.sha256).hexdigest()
