#!/usr/bin/env bash
# Runs once when the codespace is first created (before postCreate).
# Goal: install OS-level deps that the Node image doesn't ship.
set -euo pipefail

echo "[on-create] Installing OS deps for sharp / playwright / cesium tooling..."

# Native deps for sharp (libvips), playwright browser deps, and image/video tools
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    libvips-dev \
    ffmpeg \
    jq \
    git-lfs \
    rsync \
    ca-certificates

git lfs install --skip-repo || true

echo "[on-create] Done."
