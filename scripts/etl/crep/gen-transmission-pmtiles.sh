#!/usr/bin/env bash
# Build PMTiles for the FULL US transmission lines dataset (all voltage
# classes from HIFLD + OSM fill-in + MINDEX). Companion to
# scripts/etl/crep/fetch-transmission-full.mjs.
#
# Input:  public/data/crep/transmission-lines-us-full.geojson
# Output: public/data/crep/tiles/transmission-lines-us-full.pmtiles
#
# Tippecanoe settings tuned for line features:
#   --drop-densest-as-needed — tile-size safety net
#   --coalesce-densest-as-needed — merge overlapping segments at low zoom
#   --detect-shared-borders — line-dedup when segments overlap exactly
#   --simplification=2 — modest Douglas-Peucker; preserve route shape
#
# Run from repo root:
#   ./scripts/etl/crep/gen-transmission-pmtiles.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
IN="$ROOT/public/data/crep/transmission-lines-us-full.geojson"
OUT_DIR="$ROOT/public/data/crep/tiles"
OUT_MBTILES="$OUT_DIR/transmission-lines-us-full.mbtiles"
OUT_PMTILES="$OUT_DIR/transmission-lines-us-full.pmtiles"

mkdir -p "$OUT_DIR"

if [ ! -f "$IN" ]; then
  echo "ERROR: $IN not found. Run scripts/etl/crep/fetch-transmission-full.mjs first." >&2
  exit 1
fi

bytes=$(stat -c%s "$IN" 2>/dev/null || wc -c < "$IN")
if [ "$bytes" -lt 1024 ]; then
  echo "skip: input too small ($bytes B) — likely empty FeatureCollection"
  exit 0
fi

command -v tippecanoe >/dev/null 2>&1 || { echo "ERROR: tippecanoe not installed" >&2; exit 1; }
command -v pmtiles   >/dev/null 2>&1 || { echo "ERROR: pmtiles CLI not installed"  >&2; exit 1; }

echo "=== transmission-lines-us-full.geojson → transmission-lines-us-full.pmtiles ==="
echo "Input: $bytes bytes"

tippecanoe \
  --output="$OUT_MBTILES" \
  --force \
  --layer=transmission_lines \
  --minimum-zoom=0 \
  --maximum-zoom=14 \
  --drop-densest-as-needed \
  --coalesce-densest-as-needed \
  --detect-shared-borders \
  --extend-zooms-if-still-dropping \
  --simplification=2 \
  --no-feature-limit \
  --no-tile-size-limit \
  "$IN"

pmtiles convert "$OUT_MBTILES" "$OUT_PMTILES" --force
rm "$OUT_MBTILES"
out_bytes=$(wc -c < "$OUT_PMTILES")
echo "✓ $(basename "$OUT_PMTILES"): $((out_bytes / 1024 / 1024)) MB"
ls -lh "$OUT_DIR"
