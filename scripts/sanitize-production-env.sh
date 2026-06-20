#!/usr/bin/env bash
# Sanitize production .env and load vars safely (no raw bash source of .env).
set -euo pipefail

ENV_FILE="${1:-/opt/mycosoft/website/.env}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="${SCRIPT_DIR}/sanitize-production-env.py"

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }
[[ -f "$PY" ]] || { echo "Missing $PY" >&2; exit 1; }

python3 "$PY" "$ENV_FILE"

set -a
# shellcheck disable=SC1090
eval "$(python3 "$PY" --export "$ENV_FILE")"
set +a

echo "ENV_SOURCE_OK"
