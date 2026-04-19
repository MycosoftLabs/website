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
IN="$ROOT/public/data/crep/cell-towers-global.geojson"
OUT_DIR="$ROOT/public/data/crep/tiles"
OUT_MBTILES="$OUT_DIR/cell-towers-global.mbtiles"
OUT_PMTILES="$OUT_DIR/cell-towers-global.pmtiles"

mkdir -p "$OUT_DIR"

if [ ! -f "$IN" ]; then
  echo "ERROR: $IN not found. Run scripts/etl/crep/fetch-celltowers-global.mjs first." >&2
  exit 1
fi

command -v tippecanoe >/dev/null 2>&1 || { echo "ERROR: tippecanoe not installed" >&2; exit 1; }
command -v pmtiles   >/dev/null 2>&1 || { echo "ERROR: pmtiles CLI not installed"  >&2; exit 1; }

echo "=== cell-towers-global.geojson → cell-towers-global.pmtiles ==="
echo "Input: $(stat -c%s "$IN" 2>/dev/null || wc -c < "$IN") bytes"

tippecanoe \
  --output="$OUT_MBTILES" \
  --force \
  --layer=cell_towers \
  --minimum-zoom=0 \
  --maximum-zoom=14 \
  --cluster-distance=8 \
  --cluster-maxzoom=11 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --no-feature-limit \
  --no-tile-size-limit \
  "$IN"

pmtiles convert "$OUT_MBTILES" "$OUT_PMTILES" --force
rm "$OUT_MBTILES"

BYTES=$(wc -c < "$OUT_PMTILES")
echo "✓ $(basename "$OUT_PMTILES"): $((BYTES / 1024 / 1024)) MB"
ls -lh "$OUT_DIR"
