#!/usr/bin/env bash
# Fix malformed production .env lines (bare secret on its own line without KEY=).
# Jun 19 2026 — blocked blue/green cutover with exit 127.
set -euo pipefail
ENV_FILE="${1:-/opt/mycosoft/website/.env}"
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }
cp "$ENV_FILE" "${ENV_FILE}.bak.sanitize"
python3 - "$ENV_FILE" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
lines = p.read_text().splitlines()
out, i, changed = [], 0, False
while i < len(lines):
    ln, s = lines[i], lines[i].strip()
    if s and not s.startswith("#") and "=" not in s:
        if out and out[-1].rstrip().endswith("="):
            out[-1] = out[-1].rstrip() + s
        else:
            out.append("MINDEX_INTERNAL_TOKEN=" + s)
        changed = True
        i += 1
        continue
    if ln.rstrip().endswith("=") and i + 1 < len(lines):
        nxt = lines[i + 1].strip()
        if nxt and "=" not in nxt and not nxt.startswith("#"):
            out.append(ln.rstrip() + nxt)
            changed = True
            i += 2
            continue
    out.append(ln)
    i += 1
if changed:
    orig = p.read_text()
    p.write_text("\n".join(out) + ("\n" if orig.endswith("\n") else ""))
    print(f"Sanitized {p}")
else:
    print(f"No changes needed for {p}")
PY
set -a
# shellcheck disable=SC1090
source <(grep -E '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE")
set +a
echo "ENV_SOURCE_OK"
