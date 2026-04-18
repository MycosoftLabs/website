# CREP PMTiles ETL — static infra vector-tile generation

**Status:** infrastructure ready, tile generation pending external CLI tools.
**Date:** Apr 18, 2026 · Fix C of the LOD/perf audit series.

## What this fixes

The bundled static infra GeoJSONs parse into MapLibre GeoJSON sources that
hold every feature in JS memory:

| File | Size | Features | Memory pressure |
|---|---|---|---|
| `public/data/crep/substations-us.geojson` | 12 MB | 76,065 | ~30 MB resident JS heap |
| `public/data/crep/transmission-lines-us-major.geojson` | 14 MB | 22,760 | ~40 MB resident JS heap |
| `public/data/crep/power-plants-global.geojson` | 16 MB | 34,936 | ~25 MB resident JS heap |

Total: **~95 MB of JS heap**, all parsed up front even when the user never
pans to North America.

PMTiles replaces the up-front load with HTTP range-requested vector tiles:
MapLibre only materialises features in the current viewport tile, so at
most ~500 features are in JS memory at any moment. Typical compressed
PMTiles archive per layer is **1–3 MB**.

## Prerequisites

You need two CLI tools installed locally or on a build box:

```bash
# tippecanoe — generates MBTiles from GeoJSON
brew install felt/felt/tippecanoe        # macOS
# or
apt-get install tippecanoe               # Debian/Ubuntu
# or build from source: https://github.com/felt/tippecanoe

# pmtiles — converts MBTiles → PMTiles archive
brew install go-pmtiles                  # macOS
# or
go install github.com/protomaps/go-pmtiles/cmd/pmtiles@latest
```

## Run the ETL

From the repo root:

```bash
./scripts/etl/crep/gen-pmtiles.sh
```

This produces:

```
public/data/crep/tiles/
├── substations-us.pmtiles             (~1-2 MB)
├── transmission-lines-us-major.pmtiles (~2-3 MB)
└── power-plants-global.pmtiles         (~1-2 MB)
```

Commit these files (they're meant to ship in the repo like the GeoJSONs).

## How the runtime loader uses them

`lib/crep/static-infra-loader.ts` probes each layer's `.pmtiles` URL with
a HEAD request (15 s memoised). If the archive is reachable, MapLibre
registers a vector source via the pmtiles protocol:

```ts
map.addSource("crep-substations", {
  type: "vector",
  url: "pmtiles:///data/crep/tiles/substations-us.pmtiles",
})
```

If the file isn't present, it falls back to fetching the GeoJSON and
registering a geojson source — current behaviour preserved.

The dashboard doesn't need to know which path it's on; the only caller-
visible change is that layer specs need `source-layer` set for the
vector path. Helper `layerSpecForMode(mode, cfg)` returns the right
props.

## What already landed with Fix C

- `scripts/etl/crep/gen-pmtiles.sh` — the ETL script
- `lib/crep/static-infra-loader.ts` — runtime PMTiles-first / GeoJSON-fallback helper
- `docs/CREP_PMTILES_ETL.md` — this document

## What still needs to happen (manual, out of CI)

1. Install tippecanoe + pmtiles CLI on a build box
2. Run `./scripts/etl/crep/gen-pmtiles.sh`
3. `git add public/data/crep/tiles/*.pmtiles`
4. Commit + push (Option B pipeline handles the rest)

Once the `.pmtiles` files land, the dashboard automatically switches to
the vector-tile path on next page load. No further code changes needed.

## Regeneration cadence

Regenerate when the underlying GeoJSON changes:
- Substations: whenever HIFLD publishes a new snapshot (was Aug 2025;
  next unknown — archived at SeerAI)
- Transmission lines: same source
- Power plants: WRI releases v1.4 of the Global Power Plant DB (last
  update was June 2021; possibly stale)

## Why this isn't in CI yet

Tippecanoe is a C++ binary, and go-pmtiles needs a Go toolchain. Both
are easy to install but bloat the CI runner. It's cheaper to regenerate
locally every few months when the source data rolls over, commit the
`.pmtiles` files, and let the existing deploy pipeline ship them.

If we ever want this in CI, add a `gen-pmtiles` job that runs
`apt-get install -y tippecanoe golang-go && ...` on ubuntu-latest —
adds ~3 min to a full build but can be gated on
`git diff --name-only` touching `public/data/crep/*.geojson`.
