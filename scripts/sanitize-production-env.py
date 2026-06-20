#!/usr/bin/env python3
"""Sanitize production .env and emit safe export statements (no bash source of raw file)."""
from __future__ import annotations

import re
import shlex
import sys
from pathlib import Path

KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
# Long alphanumeric lines without = are stray secrets (Jun 19 2026 regression).
BARE_SECRET_RE = re.compile(r"^[A-Za-z0-9_-]{20,}$")


def _normalize_value(val: str) -> str:
    val = val.strip()
    # Backticks or $(...) turn the token into a shell command when sourced.
    if len(val) >= 2 and val[0] == "`" and val[-1] == "`":
        val = val[1:-1]
    if val.startswith("$(") and val.endswith(")"):
        val = val[2:-1]
    if ";" in val:
        val = val.split(";", 1)[0].strip()
    parts = val.split()
    if len(parts) > 1 and BARE_SECRET_RE.match(parts[-1]):
        val = parts[0]
    return val


def sanitize_lines(lines: list[str]) -> tuple[list[str], bool]:
    out: list[str] = []
    changed = False
    i = 0
    while i < len(lines):
        raw = lines[i]
        s = raw.strip().strip("\r")

        if not s or s.startswith("#"):
            out.append(raw.rstrip("\r"))
            i += 1
            continue

        if "=" not in s:
            if BARE_SECRET_RE.match(s) or (
                len(s) > 30 and re.fullmatch(r"[A-Za-z0-9_-]+", s)
            ):
                if out and out[-1].rstrip().endswith("="):
                    out[-1] = out[-1].rstrip() + s
                else:
                    out.append("MINDEX_INTERNAL_TOKEN=" + s)
                changed = True
                i += 1
                continue
            out.append(raw.rstrip("\r"))
            i += 1
            continue

        key, _, val = s.partition("=")
        key = key.strip()
        val = val.strip()

        if KEY_RE.match(key) and val == "" and i + 1 < len(lines):
            nxt = lines[i + 1].strip().strip("\r")
            if nxt and "=" not in nxt and not nxt.startswith("#"):
                merged = f"{key}={nxt}"
                if merged != s:
                    changed = True
                out.append(merged)
                i += 2
                continue

        if KEY_RE.match(key):
            new_val = _normalize_value(val)
            merged = f"{key}={new_val}"
            if merged != s:
                changed = True
            out.append(merged)
            i += 1
            continue

        out.append(raw.rstrip("\r"))
        i += 1

    # Drop duplicate bare-secret lines that slipped through as KEY= duplicates.
    seen_mindex = False
    deduped: list[str] = []
    for ln in out:
        s = ln.strip()
        if s.startswith("MINDEX_INTERNAL_TOKEN="):
            if seen_mindex:
                changed = True
                continue
            seen_mindex = True
        deduped.append(ln)

    return deduped, changed


def sanitize_file(path: Path) -> bool:
    text = path.read_text()
    lines = text.splitlines()
    cleaned, changed = sanitize_lines(lines)
    if changed:
        path.write_text("\n".join(cleaned) + ("\n" if text.endswith("\n") else ""))
        print(f"Sanitized {path}")
    else:
        print(f"No changes needed for {path}")
    return changed


def export_statements(path: Path) -> str:
    lines = path.read_text().splitlines()
    exports: list[str] = []
    for raw in lines:
        s = raw.strip().strip("\r")
        if not s or s.startswith("#") or "=" not in s:
            continue
        key, _, val = s.partition("=")
        key = key.strip()
        if not KEY_RE.match(key):
            continue
        val = _normalize_value(val)
        exports.append(f"export {key}={shlex.quote(val)}")
    return "\n".join(exports)


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: sanitize-production-env.py <path> | --export <path>", file=sys.stderr)
        return 2

    if sys.argv[1] == "--export":
        path = Path(sys.argv[2])
        if not path.is_file():
            print(f"Missing {path}", file=sys.stderr)
            return 1
        print(export_statements(path))
        return 0

    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"Missing {path}", file=sys.stderr)
        return 1

    path.parent.mkdir(parents=True, exist_ok=True)
    backup = path.with_suffix(path.suffix + ".bak.sanitize")
    backup.write_text(path.read_text())
    sanitize_file(path)
    # Verify exports parse without shell execution of secret tokens.
    try:
        export_statements(path)
    except Exception as exc:
        print(f"ENV_VERIFY_FAILED: {exc}", file=sys.stderr)
        return 1
    print("ENV_VERIFY_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
