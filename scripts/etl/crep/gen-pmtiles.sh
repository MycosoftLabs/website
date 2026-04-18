#!/usr/bin/env bash
#
# Generate PMTiles for bundled CREP static infrastructure — Fix C (Apr 18, 2026)
#
# Why: public/data/crep/substations-us.geojson (12 MB, 76k features),
# transmission-lines-us-major.geojson (14 MB, 22k features), and
# power-plants-global.geojson (16 MB, 35k features) each parse into a
# MapLibre GeoJSON source that holds every feature in JS memory.
# PMTiles = pre-built vector tiles served as a single static archive;
# MapLibre only materialises features in the current tile viewport,
# dropping memory pressure from ~42 MB to <5 MB at any moment.
#
# Requires:
#   tippecanoe           — https://github.com/felt/tippecanoe
#     brew install felt/felt/tippecanoe   (macOS)
#     apt-get install tippecanoe          (Debian/Ubuntu)
#
#   pmtiles CLI          — https://github.com/protomaps/go-pmtiles
#     brew install go-pmtiles              (macOS)
#     go install github.com/protomaps/go-pmtiles/cmd/pmtiles@latest
#
# Run from repo root:
#   ./scripts/etl/crep/gen-pmtiles.sh
#
# Outputs:
#   public/data/crep/tiles/substations-us.pmtiles
#   public/data/crep/tiles/transmission-lines-us-major.pmtiles
#   public/data/crep/tiles/power-plants-global.pmtiles
#
# The runtime loader (lib/crep/static-infra-loader.ts) prefers these when
# present and falls back to the GeoJSON files when they're not.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
IN="$ROOT/public/data/crep"
OUT="$ROOT/public/data/crep/tiles"
mkdir -p "$OUT"

command -v tippecanoe >/dev/null 2>&1 || { echo "ERROR: tippecanoe not installed"; exit 1; }
command -v pmtiles >/dev/null 2>&1 || { echo "ERROR: pmtiles CLI not installed"; exit 1; }

convert() {
  local src="$1"
  local name="$2"
  local zoom_min="$3"
  local zoom_max="$4"
  local layer_name="$5"
  local out_mbtiles="$OUT/$name.mbtiles"
  local out_pmtiles="$OUT/$name.pmtiles"

  if [ ! -f "$IN/$src" ]; then
    echo "skip: $src not present"
    return
  fi
  echo "=== $src  →  $name.pmtiles  (z$zoom_min–$zoom_max) ==="

  # Tippecanoe: feature-first (not cluster), drop gracefully, single layer
  tippecanoe \
    --output="$out_mbtiles" \
    --force \
    --minimum-zoom="$zoom_min" \
    --maximum-zoom="$zoom_max" \
    --layer="$layer_name" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --no-feature-limit \
    --no-tile-size-limit \
    --simplification=2 \
    --detect-shared-borders \
    --coalesce-smallest-as-needed \
    "$IN/$src"

  pmtiles convert "$out_mbtiles" "$out_pmtiles" --force
  rm "$out_mbtiles"

  local bytes
  bytes=$(wc -c < "$out_pmtiles")
  echo "  → $(basename "$out_pmtiles"): $((bytes / 1024)) KB"
}

# Substations: point layer, render from zoom 5 so state-level inspection works
convert "substations-us.geojson" "substations-us" 5 12 "substations"

# Transmission lines: line layer, need higher zooms for route detail
convert "transmission-lines-us-major.geojson" "transmission-lines-us-major" 4 12 "transmission_lines"

# Power plants (global): need zoom 2+ for world view, but point size scales
convert "power-plants-global.geojson" "power-plants-global" 2 10 "power_plants"

# Submarine cables: already small (~725 KB), skip conversion unless requested
# convert "submarine-cables.geojson" "submarine-cables" 0 10 "submarine_cables"

echo
echo "Generated PMTiles in $OUT"
ls -lh "$OUT"
