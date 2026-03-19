#!/usr/bin/env python3
"""
Build /opt/mycosoft/.env for production from local env files.
Run from website repo root: python scripts/build-production-env.py
Output: .env.production.generated (gitignored). Copy to VM when you have SSH access.
Never prints secret values.
"""
from pathlib import Path
import os
import re

REPO_ROOT = Path(__file__).resolve().parent.parent
EXAMPLE = REPO_ROOT / "env.production.example"
OUTPUT = REPO_ROOT / ".env.production.generated"
ENV_LOCAL = REPO_ROOT / ".env.local"
# MAS repo credentials (optional) - for CLOUDFLARE_TUNNEL_TOKEN etc.
CREDS = REPO_ROOT.parent / "MAS" / "mycosoft-mas" / ".credentials.local"


def parse_example(path: Path) -> list[str]:
    keys = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
        if m:
            keys.append(m.group(1))
    return keys


def load_env_file(path: Path) -> dict[str, str]:
    out = {}
    if not path.exists():
        return out
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
        if m:
            key, value = m.group(1), m.group(2)
            value = value.strip().strip('"').strip("'")
            out[key] = value
    return out


def main() -> None:
    keys = parse_example(EXAMPLE)
    combined = {}
    if ENV_LOCAL.exists():
        combined.update(load_env_file(ENV_LOCAL))
    if CREDS.exists():
        combined.update(load_env_file(CREDS))
    lines = []
    for key in keys:
        value = combined.get(key, "")
        lines.append(f"{key}={value}")
    OUTPUT.write_text("\n".join(lines) + "\n")
    print(f"Wrote {OUTPUT.name} ({len(keys)} variables).")
    print("Copy to VM when you have SSH access:")
    print("  scp .env.production.generated mycosoft@192.168.0.187:/opt/mycosoft/.env")
    print("Or from GitHub Actions deploy, ensure production secrets are set and .env is filled on the VM.")


if __name__ == "__main__":
    main()
