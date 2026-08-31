"""Local config — BYO AI keys and lp_ tokens never leave this file / this machine."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


def default_config_dir() -> Path:
    return Path.home() / ".launchpad-myca"


def default_config_path() -> Path:
    override = os.environ.get("LP_MYCA_CONFIG", "").strip()
    if override:
        return Path(override)
    cwd_local = Path.cwd() / ".launchpad-myca.local.json"
    if cwd_local.is_file():
        return cwd_local
    return default_config_dir() / "config.json"


def example_config() -> dict[str, Any]:
    return {
        "launchpad_base_url": "http://localhost:3010",
        "agent_id": "",
        "workspace_api_key": "",
        "hmac_key": "",
        "kill_switch": False,
        "poll_seconds": 60,
        "evidence_dir": "",
        "capability_notes": {"naics": [], "psc": [], "set_asides": []},
        "document_families": ["ac", "ia"],
        "byo_ai": {
            "provider": "anthropic",
            "api_key": "",
            "model": "claude-sonnet-4-20250514",
            "openai_base_url": "https://api.openai.com/v1",
        },
        "sync": {
            "results": True,
            "never_send_prompts": True,
            "never_send_raw_logs": True,
        },
    }


@dataclass
class ByoAi:
    provider: str = "anthropic"
    api_key: str = ""
    model: str = ""
    openai_base_url: str = "https://api.openai.com/v1"

    @property
    def configured(self) -> bool:
        return bool(self.api_key.strip())


@dataclass
class HarnessConfig:
    launchpad_base_url: str = "http://localhost:3010"
    agent_id: str = ""
    workspace_api_key: str = ""
    hmac_key: str = ""
    kill_switch: bool = False
    poll_seconds: int = 60
    evidence_dir: str = ""
    capability_notes: dict[str, list[str]] = field(default_factory=dict)
    document_families: list[str] = field(default_factory=list)
    byo_ai: ByoAi = field(default_factory=ByoAi)
    sync_results: bool = True
    path: Path | None = None

    @property
    def base_url(self) -> str:
        return self.launchpad_base_url.rstrip("/")

    def assert_runnable(self) -> None:
        if self.kill_switch or os.environ.get("LP_AGENT_KILL_SWITCH", "").strip() in {"1", "true", "TRUE"}:
            raise SystemExit("Kill switch is on — harness will not transmit. Set kill_switch=false in config.")
        if not self.agent_id.strip():
            raise SystemExit("config.agent_id is required (from enroll).")
        if not self.workspace_api_key.strip() and not self.hmac_key.strip():
            raise SystemExit("Set workspace_api_key (lp_…) and/or hmac_key from enroll.")
        key = self.workspace_api_key.strip()
        if key and not key.startswith("lp_"):
            raise SystemExit("workspace_api_key must start with lp_")


def load_config(path: Path | None = None) -> HarnessConfig:
    p = path or default_config_path()
    if not p.is_file():
        raise SystemExit(f"No config at {p}. Run: python -m launchpad_myca_harness init")
    raw = json.loads(p.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise SystemExit("Config must be a JSON object")
    byo = raw.get("byo_ai") if isinstance(raw.get("byo_ai"), dict) else {}
    notes = raw.get("capability_notes") if isinstance(raw.get("capability_notes"), dict) else {}
    sync = raw.get("sync") if isinstance(raw.get("sync"), dict) else {}
    families = raw.get("document_families")
    return HarnessConfig(
        launchpad_base_url=str(raw.get("launchpad_base_url") or "http://localhost:3010"),
        agent_id=str(raw.get("agent_id") or os.environ.get("LP_AGENT_ID") or ""),
        workspace_api_key=str(
            raw.get("workspace_api_key") or os.environ.get("LP_WORKSPACE_API_KEY") or ""
        ),
        hmac_key=str(raw.get("hmac_key") or os.environ.get("LP_AGENT_HMAC_KEY") or ""),
        kill_switch=bool(raw.get("kill_switch")),
        poll_seconds=max(15, int(raw.get("poll_seconds") or 60)),
        evidence_dir=str(raw.get("evidence_dir") or ""),
        capability_notes={
            "naics": [str(x) for x in (notes.get("naics") or []) if isinstance(x, str)],
            "psc": [str(x) for x in (notes.get("psc") or []) if isinstance(x, str)],
            "set_asides": [str(x) for x in (notes.get("set_asides") or []) if isinstance(x, str)],
        },
        document_families=[str(x) for x in families] if isinstance(families, list) else ["ac"],
        byo_ai=ByoAi(
            provider=str(byo.get("provider") or "anthropic"),
            api_key=str(byo.get("api_key") or os.environ.get("LP_BYO_AI_KEY") or ""),
            model=str(byo.get("model") or ""),
            openai_base_url=str(byo.get("openai_base_url") or "https://api.openai.com/v1"),
        ),
        sync_results=bool(sync.get("results", True)),
        path=p,
    )


def write_example(path: Path | None = None) -> Path:
    p = path or (default_config_dir() / "config.json")
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists():
        return p
    p.write_text(json.dumps(example_config(), indent=2) + "\n", encoding="utf-8")
    try:
        os.chmod(p, 0o600)
    except OSError:
        pass
    return p
