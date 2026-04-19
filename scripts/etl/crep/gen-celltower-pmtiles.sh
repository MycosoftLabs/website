#!/usr/bin/env bash
#
# Generate PMTiles for the global cell tower layer — Apr 18, 2026
#
# Input:  public/data/crep/cell-towers-global.geojson
#         (produced by scripts/etl/crep/fetch-celltowers-global.mjs)
#
# Output: public/data/crep/tiles/cell-towers-global.pmtiles
#
# Tippecanoe settings tuned for a dense point layer (expected 1M–10M points):
#   --cluster-distance=8 — merge points within 8 pixels at each zoom level.
#     At z2 this collapses clusters of cities to single dots; at z14 each
#     tower is rendered individually. MapLibre gets a pre-clustered source.
#   --cluster-maxzoom=11 — full per-tower detail from zoom 12 up.
#   --drop-densest-as-needed — sheds features if tiles exceed size budget
#     (mostly a safety net; clustering should keep tiles small).
#
# With these settings a 10M-point input produces a ~100–300 MB PMTiles
# archive that MapLibre can range-request per-tile.
#
# Requires:
#   tippecanoe  →  brew install felt/felt/tippecanoe
#   pmtiles     →  go install github.com/protomaps/go-pmtiles/cmd/pmtiles@latest
#
# Run from repo root:
#   ./scripts/etl/crep/gen-celltower-pmtiles.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT_DIR="$ROOT/public/data/crep/tiles"
mkdir -p "$OUT_DIR"

command -v tippecanoe >/dev/null 2>&1 || { echo "ERROR: tippecanoe not installed" >&2; exit 1; }
command -v pmtiles   >/dev/null 2>&1 || { echo "ERROR: pmtiles CLI not installed"  >&2; exit 1; }

# Builder: (input, layer, zmax) → PMTiles archive in $OUT_DIR/<basename>.pmtiles
build_tiles() {
  local src="$1"
  local layer="$2"
  local zmax="$3"
  local base
  base="$(basename "$src" .geojson)"
  local mb="$OUT_DIR/$base.mbtiles"
  local pm="$OUT_DIR/$base.pmtiles"

  if [ ! -f "$src" ]; then
    echo "skip: $(basename "$src") not present"
    return
  fi
  echo "=== $(basename "$src") → $(basename "$pm") (layer=$layer, zmax=$zmax) ==="
  echo "Input: $(stat -c%s "$src" 2>/dev/null || wc -c < "$src") bytes"

  tippecanoe \
    --output="$mb" \
    --force \
    --layer="$layer" \
    --minimum-zoom=0 \
    --maximum-zoom="$zmax" \
    --cluster-distance=8 \
    --cluster-maxzoom=11 \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --no-feature-limit \
    --no-tile-size-limit \
    "$src"

  pmtiles convert "$mb" "$pm" --force
  rm "$mb"
  local bytes; bytes=$(wc -c < "$pm")
  echo "  → $(basename "$pm"): $((bytes / 1024 / 1024)) MB"
}

# Primary: full global (or country-filtered) catalog. z14 so streets work.
build_tiles "$ROOT/public/data/crep/cell-towers-global.geojson" cell_towers 14

# Instant bundle (US + Taiwan + territories). Shipped to prod CDN so the
# CREP dashboard paints towers in 0 round-trips on first map mount.
build_tiles "$ROOT/public/data/crep/cell-towers-us-tw-instant.geojson" cell_towers 14

echo
ls -lh "$OUT_DIR"
