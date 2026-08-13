"""BYO model calls — customer's provider key stays on this machine. Never posted to Launchpad."""

from __future__ import annotations

import json
import urllib.error
import urllib.request

from .config import ByoAi
from .sanitizer import scan_text_blocked

MAX_TOKENS = 700


def complete_local(byo: ByoAi, system: str, user: str) -> str | None:
    if not byo.configured:
        return None
    blob = f"{system}\n{user}"
    if scan_text_blocked(blob):
        return None
    provider = (byo.provider or "anthropic").lower()
    try:
        if provider in {"anthropic", "claude"}:
            return _anthropic(byo, system, user)
        if provider in {"openai", "xai"}:
            return _openai_compat(byo, system, user)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, OSError):
        return None
    return None


def _anthropic(byo: ByoAi, system: str, user: str) -> str | None:
    model = byo.model or "claude-sonnet-4-20250514"
    body = json.dumps(
        {
            "model": model,
            "max_tokens": MAX_TOKENS,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        method="POST",
        headers={
            "content-type": "application/json",
            "x-api-key": byo.api_key,
            "anthropic-version": "2023-06-01",
        },
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    parts = payload.get("content") or []
    text = "".join(str(p.get("text") or "") for p in parts if isinstance(p, dict))
    if scan_text_blocked(text):
        return None
    return text.strip() or None


def _openai_compat(byo: ByoAi, system: str, user: str) -> str | None:
    model = byo.model or "gpt-4o-mini"
    url = byo.openai_base_url.rstrip("/") + "/chat/completions"
    body = json.dumps(
        {
            "model": model,
            "max_tokens": MAX_TOKENS,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "content-type": "application/json",
            "authorization": f"Bearer {byo.api_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    text = str((((payload.get("choices") or [{}])[0].get("message") or {}).get("content")) or "")
    if scan_text_blocked(text):
        return None
    return text.strip() or None
