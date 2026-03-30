#!/usr/bin/env python3
"""Apply SEO-related Cloudflare zone settings via API.

- Enables Always Use HTTPS (SSL/TLS edge setting).
- Ensures a Single Redirect rule: www.mycosoft.com → https://mycosoft.com (301, path + query preserved).

Requires CLOUDFLARE_API_TOKEN with Zone.SSL and Zone.Settings (or equivalent) and Rules write.
Uses same env loading as _cloudflare_cache.py (website .env.local, .credentials.local, MAS repo).

Run from repo root:  python scripts/apply_cloudflare_seo_settings.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import requests

from _cloudflare_cache import _get_cloudflare_config

RULE_DESCRIPTION = "SEO: www.mycosoft.com → apex (301)"
CF_API = "https://api.cloudflare.com/client/v4"
PHASE = "http_request_dynamic_redirect"


def _zone_id() -> str | None:
    return os.getenv("CLOUDFLARE_ZONE_ID_PRODUCTION") or os.getenv("CLOUDFLARE_ZONE_ID")


def _headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def _www_rule() -> dict:
    return {
        "expression": '(http.host eq "www.mycosoft.com")',
        "description": RULE_DESCRIPTION,
        "action": "redirect",
        "enabled": True,
        "action_parameters": {
            "from_value": {
                "target_url": {
                    "expression": 'concat("https://mycosoft.com", http.request.uri.path)',
                },
                "status_code": 301,
                "preserve_query_string": True,
            }
        },
    }


def _has_www_rule(rules: list) -> bool:
    for rule in rules:
        if not isinstance(rule, dict):
            continue
        if rule.get("description") == RULE_DESCRIPTION:
            return True
        expr = str(rule.get("expression", ""))
        if "www.mycosoft.com" in expr and rule.get("action") == "redirect":
            return True
    return False


def main() -> int:
    _get_cloudflare_config()
    token = os.getenv("CLOUDFLARE_API_TOKEN")
    zone_id = _zone_id()
    if not token or not zone_id:
        print("Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID / CLOUDFLARE_ZONE_ID_PRODUCTION.")
        return 1

    headers = _headers(token)

    # 1) Always Use HTTPS
    url_https = f"{CF_API}/zones/{zone_id}/settings/always_use_https"
    r = requests.patch(url_https, headers=headers, json={"value": "on"}, timeout=30)
    data = r.json()
    if not r.ok or not data.get("success"):
        print(f"always_use_https failed: HTTP {r.status_code} {data}")
        return 1
    print("always_use_https: on")

    # 2) www → apex (dynamic redirect phase)
    ep_url = f"{CF_API}/zones/{zone_id}/rulesets/phases/{PHASE}/entrypoint"
    r = requests.get(ep_url, headers=headers, timeout=30)
    new_rule = _www_rule()

    if r.status_code == 404:
        body = {
            "name": "SEO redirects (www→apex)",
            "kind": "zone",
            "phase": PHASE,
            "rules": [new_rule],
        }
        r2 = requests.post(f"{CF_API}/zones/{zone_id}/rulesets", headers=headers, json=body, timeout=30)
        d2 = r2.json()
        if not r2.ok or not d2.get("success"):
            print(f"create ruleset failed: HTTP {r2.status_code} {d2}")
            return 1
        print("Created http_request_dynamic_redirect ruleset with www→apex rule.")
        return 0

    if not r.ok:
        print(f"entrypoint GET failed: HTTP {r.status_code} {r.text[:800]}")
        return 1

    result = (r.json() or {}).get("result") or {}
    rs_id = result.get("id")
    rules = list(result.get("rules") or [])
    if _has_www_rule(rules):
        print("www→apex redirect already present; no ruleset change.")
        return 0

    rules.append(new_rule)
    put_url = f"{CF_API}/zones/{zone_id}/rulesets/{rs_id}"
    r3 = requests.put(put_url, headers=headers, json={"rules": rules}, timeout=30)
    d3 = r3.json()
    if not r3.ok or not d3.get("success"):
        print(f"ruleset PUT failed: HTTP {r3.status_code} {d3}")
        return 1
    print("Appended www→apex redirect rule to existing ruleset.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
