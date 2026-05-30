# MINDEX All-Species ETL/API Handoff - May 30, 2026

## Owner

Cursor / MINDEX operator. Codex is shipping website-side UI and safe live fallback fixes, but Cursor has better access to the MINDEX VM, database, SSH context, scheduler, and long-running ETL services.

## Objective

Fix MINDEX so Earth Simulator does not depend on website foreground crawling for nature observations. MINDEX must continuously ingest, classify, store, and serve all iNaturalist species buckets at low latency:

- Fungi
- Plantae
- Aves
- Mammalia
- Reptilia / Amphibia
- Actinopterygii / marine life
- Insecta / Arachnida

Fungi currently works best and must not regress. The same density, freshness, and viewport behavior needs to exist for the other species buckets.

## Current Website State

Website local QA now passes for foreground fallback:

- San Diego, Los Angeles, Menlo/Bay Area, Washington DC, and NYC all return rows for all seven tested taxa when `fallbackLive=true`.
- Multi-species toggles no longer crash Earth Simulator locally.
- Fungi remains selected and visible when other species toggles are enabled.
- Reptilia and Actinopterygii now skip bad GBIF fallback and use iNaturalist directly, reducing latency.
- Aves, Mammalia, Insecta, and Plantae use targeted GBIF + iNaturalist fallback, not broad all-kingdom rescue.

This is not enough. The website fallback is a user-facing safety net, not the data architecture. MINDEX still needs to own the ETL.

## Confirmed MINDEX Problem

Local website checks against `source=mindex-only` showed:

- San Diego Fungi returns MINDEX rows.
- Most non-fungi species buckets return `0` with `mindex_empty_requires_ingest`.
- Menlo/Bay Area and NYC return `0` for many taxa, including fungi in some checks.

The failure mode is not the Earth Simulator buttons anymore. The failure mode is MINDEX coverage and classification:

- Non-fungi rows are not reliably in MINDEX.
- Existing rows may not have `kingdom`, `iconicTaxon`, `taxon_id`, or joined taxon metadata needed by the website filters.
- The API can return empty for valid bbox + kingdom/class requests.

## Website Endpoints To Reproduce

Run these from the website machine or any host that can hit the website BFF:

```bash
# MINDEX-only should return rows after Cursor fixes ETL/backfill.
curl "http://localhost:3010/api/crep/fungal?quick=true&fallbackLive=false&source=mindex-only&kingdom=Plantae&west=-117.45&south=32.45&east=-116.85&north=33.35&limit=200&nocache=1"

curl "http://localhost:3010/api/crep/fungal?quick=true&fallbackLive=false&source=mindex-only&kingdom=Aves&west=-117.45&south=32.45&east=-116.85&north=33.35&limit=200&nocache=1"

curl "http://localhost:3010/api/crep/fungal?quick=true&fallbackLive=false&source=mindex-only&kingdom=Mammalia&west=-117.45&south=32.45&east=-116.85&north=33.35&limit=200&nocache=1"

curl "http://localhost:3010/api/crep/fungal?quick=true&fallbackLive=false&source=mindex-only&kingdom=Reptilia&west=-117.45&south=32.45&east=-116.85&north=33.35&limit=200&nocache=1"

curl "http://localhost:3010/api/crep/fungal?quick=true&fallbackLive=false&source=mindex-only&kingdom=Actinopterygii&west=-117.45&south=32.45&east=-116.85&north=33.35&limit=200&nocache=1"

curl "http://localhost:3010/api/crep/fungal?quick=true&fallbackLive=false&source=mindex-only&kingdom=Insecta&west=-117.45&south=32.45&east=-116.85&north=33.35&limit=200&nocache=1"
```

Bay Area investor-demo bbox:

```bash
curl "http://localhost:3010/api/crep/fungal?quick=true&fallbackLive=false&source=mindex-only&kingdom=Fungi&west=-122.55&south=37.30&east=-121.90&north=37.90&limit=200&nocache=1"
curl "http://localhost:3010/api/crep/fungal?quick=true&fallbackLive=false&source=mindex-only&kingdom=Plantae&west=-122.55&south=37.30&east=-121.90&north=37.90&limit=200&nocache=1"
curl "http://localhost:3010/api/crep/fungal?quick=true&fallbackLive=false&source=mindex-only&kingdom=Aves&west=-122.55&south=37.30&east=-121.90&north=37.90&limit=200&nocache=1"
```

Expected after MINDEX fix:

- `observations.length > 0`
- response source should include `mindex_primary`
- records must include stable taxonomy fields, not unlabeled `Unknown` rows
- response should complete under 1500 ms for common city/state bboxes

## Direct MINDEX API Contract To Preserve

The website expects this direct MINDEX-style contract to work quickly:

```bash
GET /api/mindex/observations?bbox=-117.45,32.45,-116.85,33.35&kingdom=Fungi&limit=200&include_total=false
```

Extend/fix this for all requested taxa:

```bash
kingdom=Plantae
kingdom=Aves
kingdom=Mammalia
kingdom=Reptilia
kingdom=Amphibia
kingdom=Actinopterygii
kingdom=Insecta
kingdom=Arachnida
```

If MINDEX uses another column name internally, the API still needs to accept these website-facing tokens.

## Required MINDEX Fixes

### 1. ETL must ingest all iconic taxa, not fungi-only

Make sure `mindex_etl/jobs/sync_inat_observations.py` or its current successor supports:

- `--domain-mode all`
- per-taxon collection for iconic taxa
- rolling lookback for freshness, ideally every 5 minutes
- backfill for legacy rows missing taxonomy metadata
- retry/backoff for iNaturalist 429s

Do not move this work into the website. The website may display live fallback, but crawling belongs to MINDEX.

### 2. Add or repair taxonomy hydration

Every observation row served to the website must include enough metadata for filtering:

- `source = iNaturalist`
- `source_id`
- `taxon_id`
- `kingdom`
- `iconic_taxon_name` or equivalent
- `scientific_name`
- `common_name`
- coordinates
- observed timestamp
- media/thumb URL where available
- quality grade / research grade where available

Legacy rows must be backfilled. Do not leave historical observations without taxon classification.

### 3. Fix the API filter path

The observations router should:

- use bbox queries backed by PostGIS indexes
- use `ST_Intersects` or equivalent indexed geometry filtering
- avoid expensive total counts by default (`include_total=false`)
- filter by normalized taxon token
- support class-level filters, not only kingdom-level filters
- merge joined taxon fields into response metadata
- never return broad Animalia rows when the caller requested `Aves`, `Mammalia`, `Reptilia`, etc.

Suggested normalization:

```text
Fungi -> kingdom Fungi
Plantae -> kingdom Plantae
Aves -> iconic_taxon_name/class Aves
Mammalia -> iconic_taxon_name/class Mammalia
Reptilia -> iconic_taxon_name/class Reptilia
Amphibia -> iconic_taxon_name/class Amphibia
Actinopterygii -> iconic_taxon_name/class Actinopterygii
Insecta -> iconic_taxon_name/class Insecta
Arachnida -> iconic_taxon_name/class Arachnida
```

### 4. Indexes to verify

Verify equivalent indexes exist:

```sql
-- Names are examples. Use the actual schema/table names.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_observations_geom
  ON core.observations USING GIST (geom);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_observations_source_source_id
  ON core.observations (source, source_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_observations_taxon_id
  ON core.observations (taxon_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxa_iconic
  ON core.taxa (iconic_taxon_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxa_kingdom
  ON core.taxa (kingdom);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_observations_observed_at
  ON core.observations (observed_at DESC);
```

If the API filters JSON metadata instead of normalized columns, add generated columns or normalized join tables. Do not rely on slow JSON scans for Earth Simulator map reads.

### 5. Backfill priority

Prioritize these geographies:

1. San Diego County / Southern California
2. Bay Area: San Francisco, Menlo Park, Palo Alto, San Mateo, Stanford
3. Los Angeles
4. Washington DC
5. New York City
6. United States and Taiwan broader coverage
7. Global city/state-level coverage

For all of those, store at least the last 12 months of iNaturalist observations for every supported bucket. The UI can cap what it renders, but MINDEX should have enough data to serve viewports without returning sparse/empty results.

### 6. Scheduler target

The scheduler should run something like:

```bash
docker compose exec -T api python -m mindex_etl.jobs.sync_inat_observations \
  --domain-mode all \
  --per-page 50 \
  --max-pages 5 \
  --lookback-hours 48 \
  --backfill-records 5000
```

Then make the scheduler run continuously:

- latest rolling sync every 5 minutes
- taxonomy metadata backfill in batches
- broader geographic backfill in longer background jobs

If iNaturalist 429s, add `INAT_API_TOKEN` to the MINDEX VM environment and honor `Retry-After`.

## Validation Matrix For Cursor

Cursor should produce a before/after table for:

| City | Bbox | Taxa |
| --- | --- | --- |
| San Diego | `-117.45,32.45,-116.85,33.35` | all supported buckets |
| Menlo/Bay | `-122.55,37.30,-121.90,37.90` | all supported buckets |
| Los Angeles | `-118.70,33.65,-117.80,34.35` | all supported buckets |
| Washington DC | `-77.20,38.75,-76.85,39.05` | all supported buckets |
| NYC | `-74.30,40.45,-73.65,40.95` | all supported buckets |

Pass criteria:

- every city/taxon pair returns rows from MINDEX-only
- most city/taxon pairs respond under 1500 ms
- no response relies on website live fallback
- rows include taxonomy labels
- fungi counts do not drop
- newer iNaturalist observations are represented, not only stale scraped rows

## Important Do-Not-Break Rules

- Do not remove existing fungi data.
- Do not remove or hide live iNaturalist display from the website while MINDEX catches up.
- Do not put background crawlers in Earth Simulator or the website VM.
- Do not require the user to wait seconds for data that is already stored.
- Do not return broad `Animalia` when a precise class filter was requested.
- Do not let the API do expensive count scans for every map movement.

## Website Changes That Will Be Live After Codex Deploy

Codex website changes make the UI more tolerant while MINDEX is fixed:

- species toggles are queued/staggered instead of firing one large all-species request storm
- newly enabled species buckets merge into the existing nature store without knocking out fungi
- quick viewport cache no longer pollutes `source=mindex-only` diagnostics
- targeted GBIF fallback replaces broad kingdom fallback for known taxa
- bad Reptilia GBIF fallback is disabled because iNaturalist is faster/reliable there
- Earth Simulator delays heavy permanent overlays so controls do not freeze during first paint

Those changes reduce visible pain, but MINDEX still has to own persistence, freshness, and fast reads.
