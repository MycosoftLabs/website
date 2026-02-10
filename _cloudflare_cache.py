#!/usr/bin/env python3
"""Cloudflare cache purge helpers for deployment scripts."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional, Tuple

import requests


def _load_dotenv_into_os(dir_path: Path, filenames: tuple[str, ...] = (".env.local", ".env")) -> None:
    """Load KEY=VALUE lines from .env.local / .env into os.environ (only if not already set)."""
    for name in filenames:
        fpath = dir_path / name
        if not fpath.is_file():
            continue
        try:
            with open(fpath, encoding="utf-8", errors="replace") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, _, value = line.partition("=")
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key and key not in os.environ:
                        os.environ[key] = value
        except OSError:
            pass


def _get_cloudflare_config() -> Tuple[Optional[str], Optional[str], Optional[str]]:
    # Try loading from .env in the same directory as this script (website repo root when run from website/)
    script_dir = Path(__file__).resolve().parent
    _load_dotenv_into_os(script_dir)
    # Also try cwd (e.g. when run from website repo)
    cwd = Path.cwd()
    if cwd != script_dir:
        _load_dotenv_into_os(cwd)

    token = os.getenv("CLOUDFLARE_API_TOKEN")
    zone_id = os.getenv("CLOUDFLARE_ZONE_ID")
    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    return token, zone_id, account_id


def purge_everything(timeout_seconds: int = 20) -> bool:
    token, zone_id, _ = _get_cloudflare_config()
    if not token or not zone_id:
        print("Cloudflare purge skipped: CLOUDFLARE_API_TOKEN/CLOUDFLARE_ZONE_ID not set.")
        return False

    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {"purge_everything": True}

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=timeout_seconds)
        data = response.json()
        if response.ok and data.get("success") is True:
            print("Cloudflare purge succeeded (purge_everything=true).")
            return True
        print(f"Cloudflare purge failed: HTTP {response.status_code} - {data}")
        return False
    except Exception as error:
        print(f"Cloudflare purge error: {error}")
        return False
