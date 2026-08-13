"""HTTP client for Launchpad BFFs. BYO AI keys are never placed in these requests."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Any

from . import CONTROLS_PATH, RADAR_PATH, RADAR_RANK_PATH, RESULTS_PATH, TASKS_PATH
from .config import HarnessConfig
from .hmac_client import build_agent_signature


class LaunchpadClient:
    def __init__(self, cfg: HarnessConfig) -> None:
        self.cfg = cfg

    def _headers(self, extra: dict[str, str] | None = None) -> dict[str, str]:
        headers = {"Accept": "application/json", "User-Agent": "launchpad-myca-harness/0.1"}
        key = self.cfg.workspace_api_key.strip()
        if key:
            headers["Authorization"] = f"Bearer {key}"
        if extra:
            headers.update(extra)
        return headers

    def get_json(self, path: str) -> dict[str, Any]:
        url = self.cfg.base_url + path
        req = urllib.request.Request(url, headers=self._headers(), method="GET")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")[:500]
            raise RuntimeError(f"GET {path} HTTP {e.code}: {body}") from e

    def fetch_tasks(self) -> dict[str, Any]:
        return self.get_json(TASKS_PATH)

    def fetch_controls(self) -> dict[str, Any]:
        return self.get_json(CONTROLS_PATH)

    def fetch_radar(self) -> dict[str, Any]:
        return self.get_json(RADAR_PATH)

    def fetch_radar_rank(self) -> dict[str, Any]:
        return self.get_json(RADAR_RANK_PATH)

    def post_results(self, payload: dict[str, Any]) -> dict[str, Any]:
        raw_body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        extra = {
            "Content-Type": "application/json",
            "X-LP-Agent-Id": self.cfg.agent_id,
        }
        hmac_key = self.cfg.hmac_key.strip()
        if hmac_key:
            ts = int(time.time())
            extra["X-LP-Timestamp"] = str(ts)
            extra["X-LP-Signature"] = build_agent_signature(hmac_key, ts, raw_body)
        url = self.cfg.base_url + RESULTS_PATH
        req = urllib.request.Request(
            url,
            data=raw_body.encode("utf-8"),
            headers=self._headers(extra),
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")[:800]
            raise RuntimeError(f"POST results HTTP {e.code}: {body}") from e
