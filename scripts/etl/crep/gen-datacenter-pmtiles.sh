#!/usr/bin/env bash
# Build PMTiles for the global data-centers dataset.
# Input:  public/data/crep/data-centers-global.geojson
# Output: public/data/crep/tiles/data-centers-global.pmtiles

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
IN="$ROOT/public/data/crep/data-centers-global.geojson"
OUT_DIR="$ROOT/public/data/crep/tiles"
mkdir -p "$OUT_DIR"

if [ ! -f "$IN" ]; then
  echo "ERROR: $IN not found. Run scripts/etl/crep/fetch-datacenters-global.mjs first." >&2
  exit 1
fi
bytes=$(stat -c%s "$IN" 2>/dev/null || wc -c < "$IN")
[ "$bytes" -lt 1024 ] && { echo "skip: empty input"; exit 0; }

command -v tippecanoe >/dev/null 2>&1 || { echo "ERROR: tippecanoe not installed" >&2; exit 1; }
command -v pmtiles   >/dev/null 2>&1 || { echo "ERROR: pmtiles CLI not installed"  >&2; exit 1; }

MB="$OUT_DIR/data-centers-global.mbtiles"
PM="$OUT_DIR/data-centers-global.pmtiles"

tippecanoe \
  --output="$MB" \
  --force \
  --layer=data_centers \
  --minimum-zoom=0 \
  --maximum-zoom=14 \
  --cluster-distance=10 \
  --cluster-maxzoom=9 \
  --drop-densest-as-needed \
  --no-feature-limit \
  --no-tile-size-limit \
  "$IN"

pmtiles convert "$MB" "$PM" --force
rm "$MB"
echo "✓ $(basename "$PM"): $(($(wc -c < "$PM") / 1024 / 1024)) MB"
