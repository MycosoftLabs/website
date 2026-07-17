#!/usr/bin/env bash
# Runs every time the codespace starts (including resume from stop).
set -euo pipefail

cd "$(dirname "$0")/.."

# Re-merge secrets in case any were added/rotated since last start.
if [ -f .devcontainer/post-create.sh ]; then
    # Only re-run the secret merge portion if .env.local exists.
    if [ -f .env.local ] && [ -f .env.example ]; then
        while IFS= read -r line; do
            [[ -z "$line" || "$line" =~ ^# ]] && continue
            key="${line%%=*}"
            val="${!key-}"
            if [ -n "${val:-}" ]; then
                safe_val=$(printf '%s' "$val" | sed -e 's/[\/&|]/\\&/g')
                if grep -qE "^${key}=" .env.local; then
                    sed -i.bak "s|^${key}=.*|${key}=${safe_val}|" .env.local
                fi
            fi
        done < .env.example
        rm -f .env.local.bak
    fi
fi

echo "[post-start] Ready. Use 'npm run dev' to start Next.js on port 3010."
