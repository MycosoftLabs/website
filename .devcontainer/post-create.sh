#!/usr/bin/env bash
# Runs once after the container is created.
# Goal: install npm deps + bootstrap a usable .env.local from secrets.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[post-create] npm ci..."
# Prefer ci for reproducibility; fall back to install if package-lock drifts.
if ! npm ci --no-audit --no-fund; then
    echo "[post-create] npm ci failed, falling back to npm install"
    npm install --no-audit --no-fund
fi

# Playwright browsers (skip system deps — already handled in on-create)
echo "[post-create] Installing Playwright browsers (chromium only to save space)..."
npx --yes playwright install chromium || true

# Bootstrap .env.local if it doesn't exist
if [ ! -f .env.local ] && [ -f .env.example ]; then
    echo "[post-create] Creating .env.local from .env.example..."
    cp .env.example .env.local
fi

# If Codespaces secrets are present, overlay them into .env.local
# Codespaces injects each Codespaces Secret as an env var in the container.
# Anything starting with MYCOSOFT_ or that matches a key in .env.example will be merged.
if [ -f .env.local ]; then
    echo "[post-create] Merging Codespaces secrets into .env.local..."
    # Read all keys defined in .env.example and pull matching values from env if set.
    while IFS= read -r line; do
        # Skip comments and blanks
        [[ -z "$line" || "$line" =~ ^# ]] && continue
        # Extract KEY=...
        key="${line%%=*}"
        # If a Codespaces secret with that exact name exists, replace the line in .env.local
        val="${!key-}"
        if [ -n "${val:-}" ]; then
            # Escape forward slashes and ampersands for sed
            safe_val=$(printf '%s' "$val" | sed -e 's/[\/&|]/\\&/g')
            if grep -qE "^${key}=" .env.local; then
                sed -i.bak "s|^${key}=.*|${key}=${safe_val}|" .env.local
            else
                echo "${key}=${val}" >> .env.local
            fi
        fi
    done < .env.example
    rm -f .env.local.bak
    echo "[post-create] .env.local prepared. Missing values will need to be filled manually or added to Codespaces secrets."
fi

# Make sure scripts are executable
chmod +x .devcontainer/*.sh || true

echo "[post-create] Done."
echo ""
echo "Next: run  npm run dev  (port 3010 will auto-forward)."
