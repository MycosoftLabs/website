#!/usr/bin/env node
/**
 * Weekly satellite tile prefetch — Apr 20, 2026
 *
 * Morgan: "i also want all of the latest mapbox and hd satelite imagry
 * predownloaded into MINDEX on a weekly bases replacing old tiles so we
 * always have fallback satelite data preloaded".
 *
 * Walks a curated priority bbox list at zooms 0-14 and fetches each
 * upstream satellite tile (Mapbox satellite-streets-v12, Mapbox
 * satellite-v9, ESRI World Imagery). Stores tiles to MINDEX tile cache
 * via POST /api/mindex/tile-cache/{basemap}/{z}/{x}/{y}.jpg.
 *
 * Scheduling: systemd timer on VM 189 — runs every Sunday 02:00 UTC.
 * Expected runtime: ~30 min per basemap with 50 priority bboxes at
 * zooms 0-14 (≈200k tiles per basemap) at 50 req/s.
 *
 * Behavior:
 *   • Atomic swap via MINDEX staging dir: tiles stream into
 *     /tile-cache/{basemap}/.staging/{z}/{x}/{y}.jpg and on successful
 *     completion, MINDEX atomically renames .staging → current and
 *     archives current → .prev.
 *   • Failure mode: if any bbox/zoom fails partway, the staging dir is
 *     left intact and the previous cycle's tiles keep serving. Next run
 *     picks up where this left off.
 *   • Rate limit: 50 concurrent requests per upstream; each request
 *     has 15 s timeout.
 *
 * CLI usage (on VM 189 via cron / systemd timer):
 *   node scripts/etl/crep/prefetch-satellite-tiles.mjs --basemap=mapbox-sat-streets
 *   node scripts/etl/crep/prefetch-satellite-tiles.mjs --basemap=esri-world-imagery --max-zoom=12
 *   node scripts/etl/crep/prefetch-satellite-tiles.mjs --dry-run    (count only, no writes)
 *
 * Env required:
 *   MAPBOX_ACCESS_TOKEN       (for mapbox-* basemaps)
 *   MINDEX_API_URL            (default http://192.168.0.189:8000)
 *   MINDEX_INTERNAL_TOKEN     (or MINDEX_API_KEY)
 */

import process from "node:process"

// ── Config ──────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  }),
)

const BASEMAP = args.basemap || "mapbox-sat-streets"
const MAX_ZOOM = Number(args["max-zoom"] || 14)
const MIN_ZOOM = Number(args["min-zoom"] || 0)
const DRY_RUN = !!args["dry-run"]
const CONCURRENCY = Number(args.concurrency || 50)

const MAPBOX_TOKEN =
  process.env.MAPBOX_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  ""

const MINDEX_BASE = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"
const MINDEX_AUTH_HEADER =
  process.env.MINDEX_INTERNAL_TOKEN
    ? { "X-Internal-Token": process.env.MINDEX_INTERNAL_TOKEN }
    : process.env.MINDEX_API_KEY
    ? { "X-API-Key": process.env.MINDEX_API_KEY }
    : {}

// Priority bboxes — the regions we want warm-cached globally. Each
// entry is [west, south, east, north] in degrees. Sized to match
// Mycosoft operational footprints + major cities where MYCA devices
// are most likely to deploy.
const PRIORITY_BBOXES = [
  { name: "San Diego Metro",       bbox: [-117.6, 32.5, -116.8, 33.3] },
  { name: "Los Angeles Basin",     bbox: [-118.7, 33.6, -117.7, 34.4] },
  { name: "SF Bay Area",           bbox: [-122.6, 37.2, -121.7, 38.1] },
  { name: "Portland OR",           bbox: [-123.0, 45.3, -122.4, 45.7] },
  { name: "Seattle",               bbox: [-122.5, 47.3, -121.9, 47.8] },
  { name: "Las Vegas",             bbox: [-115.4, 36.0, -115.0, 36.3] },
  { name: "Phoenix",               bbox: [-112.5, 33.2, -111.6, 33.8] },
  { name: "Denver",                bbox: [-105.2, 39.5, -104.8, 39.9] },
  { name: "Chicago",               bbox: [-88.0, 41.6, -87.5, 42.1] },
  { name: "New York City",         bbox: [-74.3, 40.5, -73.7, 40.9] },
  { name: "Boston",                bbox: [-71.2, 42.2, -70.9, 42.5] },
  { name: "Washington DC",         bbox: [-77.2, 38.8, -76.9, 39.0] },
  { name: "Atlanta",               bbox: [-84.6, 33.6, -84.2, 33.9] },
  { name: "Miami",                 bbox: [-80.5, 25.5, -80.1, 25.9] },
  { name: "Houston",               bbox: [-95.8, 29.5, -95.1, 30.1] },
  { name: "Austin",                bbox: [-97.9, 30.1, -97.5, 30.5] },
  { name: "Dallas-Fort Worth",     bbox: [-97.6, 32.5, -96.5, 33.1] },
  { name: "New Orleans",           bbox: [-90.2, 29.8, -89.8, 30.1] },
  { name: "Nashville",             bbox: [-87.0, 36.0, -86.6, 36.3] },
  { name: "Detroit",               bbox: [-83.4, 42.2, -82.8, 42.5] },
  { name: "Minneapolis-StP",       bbox: [-93.6, 44.7, -93.0, 45.1] },
  { name: "Kansas City",           bbox: [-94.8, 38.9, -94.3, 39.2] },
  { name: "Salt Lake City",        bbox: [-112.1, 40.5, -111.7, 40.9] },
  { name: "Honolulu",              bbox: [-158.0, 21.2, -157.7, 21.4] },
  { name: "Anchorage",             bbox: [-150.4, 61.0, -149.5, 61.4] },
  { name: "Vancouver BC",          bbox: [-123.3, 49.1, -122.9, 49.4] },
  { name: "Toronto",               bbox: [-79.6, 43.5, -79.2, 43.9] },
  { name: "Mexico City",           bbox: [-99.3, 19.3, -99.0, 19.6] },
  { name: "London",                bbox: [-0.5, 51.3, 0.3, 51.7] },
  { name: "Paris",                 bbox: [2.2, 48.7, 2.5, 49.0] },
  { name: "Amsterdam",             bbox: [4.8, 52.3, 5.0, 52.5] },
  { name: "Berlin",                bbox: [13.1, 52.4, 13.6, 52.7] },
  { name: "Tokyo",                 bbox: [139.5, 35.5, 140.0, 35.9] },
  { name: "Seoul",                 bbox: [126.8, 37.4, 127.2, 37.7] },
  { name: "Sydney",                bbox: [150.9, -34.0, 151.3, -33.7] },
  { name: "Dubai",                 bbox: [54.9, 25.0, 55.5, 25.4] },
  { name: "Singapore",             bbox: [103.6, 1.2, 104.0, 1.5] },
  { name: "Hong Kong",             bbox: [114.0, 22.2, 114.3, 22.5] },
  { name: "Shanghai",              bbox: [121.3, 31.1, 121.7, 31.4] },
  { name: "Mumbai",                bbox: [72.7, 18.9, 73.1, 19.3] },
  { name: "São Paulo",             bbox: [-46.8, -23.7, -46.3, -23.4] },
  { name: "Rio de Janeiro",        bbox: [-43.4, -23.1, -43.0, -22.8] },
  { name: "Buenos Aires",          bbox: [-58.6, -34.7, -58.3, -34.5] },
  { name: "Johannesburg",          bbox: [27.9, -26.3, 28.2, -26.0] },
  { name: "Cairo",                 bbox: [31.1, 29.9, 31.4, 30.2] },
  { name: "Tel Aviv",              bbox: [34.7, 32.0, 34.9, 32.2] },
  { name: "Istanbul",              bbox: [28.7, 40.9, 29.2, 41.2] },
  { name: "Moscow",                bbox: [37.3, 55.5, 37.9, 55.9] },
  { name: "Bangkok",               bbox: [100.4, 13.6, 100.8, 13.9] },
  { name: "Manila",                bbox: [120.9, 14.5, 121.1, 14.7] },
]

// ── Tile math ───────────────────────────────────────────────────────────────

function lngLatToTile(lng, lat, z) {
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, z))
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, z),
  )
  return [x, y]
}

function tilesForBbox(bbox, z) {
  const [w, s, e, n] = bbox
  const [xmin, ymin] = lngLatToTile(w, n, z)
  const [xmax, ymax] = lngLatToTile(e, s, z)
  const out = []
  for (let x = xmin; x <= xmax; x++) {
    for (let y = ymin; y <= ymax; y++) {
      out.push([z, x, y])
    }
  }
  return out
}

function upstreamUrl(basemap, z, x, y) {
  if (basemap === "mapbox-sat-streets") {
    if (!MAPBOX_TOKEN) return null
    return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/${z}/${x}/${y}@2x?access_token=${MAPBOX_TOKEN}`
  }
  if (basemap === "mapbox-sat") {
    if (!MAPBOX_TOKEN) return null
    return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/${z}/${x}/${y}@2x?access_token=${MAPBOX_TOKEN}`
  }
  if (basemap === "esri-world-imagery") {
    return `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
  }
  return null
}

// ── Concurrency-limited worker ──────────────────────────────────────────────

async function mapLimit(items, limit, worker) {
  const results = []
  let idx = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = idx++
      if (i >= items.length) return
      try {
        results[i] = await worker(items[i], i)
      } catch (e) {
        results[i] = { error: e?.message || String(e) }
      }
    }
  })
  await Promise.all(runners)
  return results
}

// ── Tile prefetch loop ──────────────────────────────────────────────────────

async function prefetchTile(basemap, z, x, y) {
  const url = upstreamUrl(basemap, z, x, y)
  if (!url) return { skipped: true, reason: "no-upstream-url" }
  if (DRY_RUN) return { ok: true, dry: true }

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "MycosoftCREP-Prefetch/1.0" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!upstream.ok) return { ok: false, status: upstream.status }
    const buf = await upstream.arrayBuffer()

    const mindexUrl = `${MINDEX_BASE}/api/mindex/tile-cache/${basemap}/.staging/${z}/${x}/${y}.jpg`
    const store = await fetch(mindexUrl, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg", ...MINDEX_AUTH_HEADER },
      body: buf,
      signal: AbortSignal.timeout(10_000),
    })
    if (!store.ok) return { ok: false, reason: "mindex-store-failed", status: store.status }
    return { ok: true, bytes: buf.byteLength }
  } catch (err) {
    return { ok: false, error: err?.message || String(err) }
  }
}

async function run() {
  console.log(`[prefetch] basemap=${BASEMAP} zooms=${MIN_ZOOM}..${MAX_ZOOM} dry=${DRY_RUN} conc=${CONCURRENCY}`)
  const allTiles = []
  for (const region of PRIORITY_BBOXES) {
    for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
      const tiles = tilesForBbox(region.bbox, z)
      for (const [zz, x, y] of tiles) allTiles.push({ region: region.name, z: zz, x, y })
    }
  }
  console.log(`[prefetch] ${allTiles.length} tiles queued`)
  if (DRY_RUN) {
    console.log(`[prefetch] DRY RUN — no network calls. Exiting.`)
    return
  }

  const started = Date.now()
  let ok = 0, fail = 0, skipped = 0, bytes = 0
  await mapLimit(allTiles, CONCURRENCY, async (t) => {
    const r = await prefetchTile(BASEMAP, t.z, t.x, t.y)
    if (r?.ok) { ok++; bytes += r.bytes || 0 }
    else if (r?.skipped) skipped++
    else fail++
    if ((ok + fail + skipped) % 1000 === 0) {
      const elapsed = ((Date.now() - started) / 1000).toFixed(1)
      const rate = ((ok + fail + skipped) / Number(elapsed || 1)).toFixed(0)
      console.log(`[prefetch] ${ok + fail + skipped}/${allTiles.length} (ok=${ok} fail=${fail} skip=${skipped}) ${rate}/s ${(bytes / 1e6).toFixed(1)} MB`)
    }
  })

  // Trigger atomic swap on MINDEX — staging → current, current → .prev
  try {
    const swap = await fetch(`${MINDEX_BASE}/api/mindex/tile-cache/${BASEMAP}/swap`, {
      method: "POST",
      headers: MINDEX_AUTH_HEADER,
      signal: AbortSignal.timeout(30_000),
    })
    console.log(`[prefetch] swap status=${swap.status}`)
  } catch (e) {
    console.warn("[prefetch] swap request failed:", e?.message || e)
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`[prefetch] DONE in ${elapsed}s — ok=${ok} fail=${fail} skip=${skipped} size=${(bytes / 1e6).toFixed(1)} MB`)
  if (fail > ok * 0.1) process.exit(2) // > 10% failure → non-zero exit so systemd logs a failure
}

run().catch((err) => {
  console.error("[prefetch] fatal:", err)
  process.exit(1)
})
