#!/usr/bin/env node
/**
 * Global Cell Tower Harvester — Apr 18, 2026
 *
 * Pulls cell/communications tower locations from multiple sources and emits
 * a single deduplicated GeoJSON feature collection:
 *
 *   public/data/crep/cell-towers-global.geojson
 *   public/data/crep/cell-towers-us-tw-instant.geojson  (US + Taiwan + territories subset)
 *
 * Sources (time-boxed, fail-isolated):
 *   1. MINDEX NAS  —  http://192.168.0.189:8000/api/mindex/earth/map/bbox?layer=antennas
 *      (Taiwan + US tower records already loaded by Morgan; LAN-only.
 *       Must run on Morgan's machine or a box that can route to the NAS.)
 *   2. OpenCelliD bulk CSV  —  https://opencellid.org/downloads/
 *      (~47M global cell IDs; per-tower deduped to ~10M unique sites;
 *       requires OPENCELLID_KEY env var)
 *   3. OpenStreetMap via Overpass  —  sharded 30° bbox tiles (72 tiles)
 *      (public, no key, ~500k-1M comm/cell towers globally; rate-limited)
 *
 * Usage:
 *   node scripts/etl/crep/fetch-celltowers-global.mjs \
 *     [--no-mindex] [--no-ocid] [--no-osm] \
 *     [--mindex-url=http://host:port] [--osm-step=30]
 *
 * Once the GeoJSON is written, run scripts/etl/crep/gen-celltower-pmtiles.sh
 * to build the vector tile archive for instant MapLibre loading.
 */

import { promises as fs, createWriteStream } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { gunzip as _gunzip } from "node:zlib"
import { promisify } from "node:util"

const gunzip = promisify(_gunzip)
const __filename = fileURLToPath(import.meta.url)
const ROOT = path.resolve(path.dirname(__filename), "..", "..", "..")
const OUT_DIR = path.join(ROOT, "public", "data", "crep")
const OUT_FILE = path.join(OUT_DIR, "cell-towers-global.geojson")
/** Bundled subset for CREP instant load (Taiwan + US + territories); shipped to prod CDN. */
const OUT_INSTANT = path.join(OUT_DIR, "cell-towers-us-tw-instant.geojson")

const args = process.argv.slice(2)
const flag = (name) => args.some((a) => a === `--${name}`)
const optVal = (name, dflt) => {
  const f = args.find((a) => a.startsWith(`--${name}=`))
  return f ? f.slice(name.length + 3) : dflt
}

const SKIP_MINDEX = flag("no-mindex")
const SKIP_OCID = flag("no-ocid") || !process.env.OPENCELLID_KEY
const SKIP_OSM = flag("no-osm")
const MINDEX_URL = optVal("mindex-url", process.env.MINDEX_API_URL || "http://192.168.0.189:8000")
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"
const OSM_STEP = parseInt(optVal("osm-step", "30"), 10)

// Morgan (Apr 18, 2026): Taiwan + US hardcoded as the "instant-load" slice.
// OpenCelliD's 4.8M global dedup is too large to JSON.stringify in one pass
// (exceeds Node's 512 MB string limit) AND we don't need the whole world
// bundled — prod ships country-scoped static tiles for Taiwan + US and
// fetches the rest live if users pan elsewhere.
// MCCs: 310–316 = United States (multiple carrier blocks), 466 = Taiwan.
const COUNTRIES_DEFAULT = "310,311,312,313,314,315,316,466"
const COUNTRIES = new Set(
  (optVal("countries", COUNTRIES_DEFAULT) || COUNTRIES_DEFAULT)
    .split(",").map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite),
)
const ALL_COUNTRIES = flag("all-countries")  // escape hatch — emits the full 4.8M set

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log(`[${new Date().toISOString().substring(11, 19)}]`, ...a)

// ─── Source 1: MINDEX NAS antennas ─────────────────────────────────────────

async function harvestMindex() {
  log(`MINDEX: pulling antennas layer from ${MINDEX_URL}`)
  const features = []
  // Paginate by bbox: Taiwan + US + rest-of-world. MINDEX caps limit at some
  // internal value; split to guarantee full recall.
  const regions = [
    { name: "US lower48",   s: 24,  w: -125, n: 49,  e: -66 },
    { name: "US Alaska",    s: 51,  w: -179, n: 71,  e: -129 },
    { name: "US Hawaii",    s: 18,  w: -161, n: 23,  e: -154 },
    { name: "Taiwan",       s: 21,  w: 119,  n: 26,  e: 123 },
    { name: "Rest world",   s: -60, w: -180, n: 85,  e: 180 },
  ]
  for (const r of regions) {
    try {
      const url = `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=antennas&lat_min=${r.s}&lat_max=${r.n}&lng_min=${r.w}&lng_max=${r.e}&limit=1000000`
      const res = await fetch(url, {
        headers: { "X-API-Key": MINDEX_API_KEY, Accept: "application/json" },
        signal: AbortSignal.timeout(120_000),
      })
      if (!res.ok) {
        log(`  ${r.name}: HTTP ${res.status} — skipping`)
        continue
      }
      const j = await res.json()
      // MINDEX may return { entities: [...] } or { features: [...] } or raw array
      const items = j.entities || j.features || j.antennas || (Array.isArray(j) ? j : [])
      for (const it of items) {
        const lat = it.lat ?? it.latitude ?? it.geometry?.coordinates?.[1]
        const lng = it.lng ?? it.longitude ?? it.geometry?.coordinates?.[0]
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
        features.push({
          type: "Feature",
          properties: {
            id: it.id || `mindex-${features.length}`,
            n: it.name || it.tags?.name || null,
            op: it.operator || it.tags?.operator || null,
            h: it.height_m || (it.tags?.height ? parseFloat(it.tags.height) : null),
            radio: it.radio || it.technology || it.tags?.["tower:type"] || null,
            mcc: it.mcc || null,
            src: "mindex",
            region: r.name,
          },
          geometry: { type: "Point", coordinates: [lng, lat] },
        })
      }
      log(`  ${r.name}: ${items.length} records (total ${features.length})`)
    } catch (e) {
      log(`  ${r.name}: ERROR ${e.message}`)
    }
  }
  log(`MINDEX: ${features.length} features total`)
  return features
}

// ─── Source 2: OpenCelliD bulk CSV ─────────────────────────────────────────

async function harvestOpenCelliD() {
  const key = process.env.OPENCELLID_KEY
  if (!key) { log("OpenCelliD: OPENCELLID_KEY not set — skipping"); return [] }
  const url = `https://opencellid.org/ocid/downloads?token=${key}&type=full&file=cell_towers.csv.gz`

  // OpenCelliD rate-limits bulk downloads aggressively (typically one per
  // hour per token). When rate-limited the endpoint returns a small HTML /
  // JSON error page, not the gzip — then gunzip throws "incorrect header
  // check". Retry with exponential backoff and verify gzip magic (0x1f 0x8b)
  // before trying to decompress.
  const MAX_ATTEMPTS = 4
  let buf = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    log(`OpenCelliD: downloading bulk catalog (attempt ${attempt}/${MAX_ATTEMPTS}; can take minutes)...`)
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1_200_000) })
      if (!res.ok) {
        log(`OpenCelliD: HTTP ${res.status}${attempt < MAX_ATTEMPTS ? " — retrying" : ""}`)
      } else {
        const candidate = Buffer.from(await res.arrayBuffer())
        // gzip magic bytes: 0x1f 0x8b
        if (candidate.length >= 2 && candidate[0] === 0x1f && candidate[1] === 0x8b) {
          buf = candidate
          break
        }
        const preview = candidate.toString("utf8", 0, Math.min(200, candidate.length))
        log(`OpenCelliD: non-gzip response (${candidate.length} B) — preview: ${JSON.stringify(preview)}`)
      }
    } catch (e) {
      log(`OpenCelliD: network error: ${e.message}`)
    }
    if (attempt < MAX_ATTEMPTS) {
      const waitMs = Math.min(300_000, 15_000 * Math.pow(2, attempt - 1))
      log(`OpenCelliD: waiting ${(waitMs / 1000).toFixed(0)} s before retry…`)
      await sleep(waitMs)
    }
  }
  if (!buf) { log(`OpenCelliD: all ${MAX_ATTEMPTS} attempts failed — skipping`); return [] }

  try {
    log(`OpenCelliD: ${(buf.length / 1e6).toFixed(1)} MB gzipped; decompressing...`)
    const csv = (await gunzip(buf)).toString("utf8")
    const lines = csv.split("\n")
    const countryNote = ALL_COUNTRIES
      ? "ALL countries"
      : `MCC ∈ {${Array.from(COUNTRIES).join(",")}}`
    log(`OpenCelliD: ${lines.length.toLocaleString()} rows; filter=${countryNote}; deduping at 4-decimal grid (~11 m)...`)
    // Header: radio,mcc,net,area,cell,unit,lon,lat,range,samples,changeable,created,updated,averageSignal
    const dedup = new Map()
    let filteredOut = 0
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",")
      if (cols.length < 8) continue
      const mcc = +cols[1]
      if (!ALL_COUNTRIES && !COUNTRIES.has(mcc)) { filteredOut++; continue }
      const radio = cols[0]
      const lon = +cols[6]
      const lat = +cols[7]
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
      const key = `${lat.toFixed(4)},${lon.toFixed(4)}`
      if (!dedup.has(key)) {
        dedup.set(key, {
          type: "Feature",
          properties: { id: `ocid-${i}`, radio, mcc, src: "ocid" },
          geometry: { type: "Point", coordinates: [lon, lat] },
        })
      }
    }
    const features = Array.from(dedup.values())
    log(`OpenCelliD: ${features.length.toLocaleString()} unique sites after dedup (${filteredOut.toLocaleString()} filtered by MCC)`)
    return features
  } catch (e) { log(`OpenCelliD: ERROR ${e.message}`); return [] }
}

// ─── Source 3: OSM Overpass (sharded) ──────────────────────────────────────

async function overpassFetch(endpoint, query, timeoutMs = 180_000) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const ct = res.headers.get("content-type") || ""
  if (!ct.includes("json")) throw new Error(`non-json: ${ct}`)
  return res.json()
}

const buildOSMQuery = (s, w, n, e) => `[out:json][timeout:160];(` +
  `node["man_made"="communications_tower"](${s},${w},${n},${e});` +
  `way["man_made"="communications_tower"](${s},${w},${n},${e});` +
  `node["man_made"="mast"]["tower:type"="communication"](${s},${w},${n},${e});` +
  `node["man_made"="mast"]["communication:mobile_phone"="yes"](${s},${w},${n},${e});` +
  `node["man_made"="mast"]["communication:radio"="yes"](${s},${w},${n},${e});` +
  `node["man_made"="tower"]["tower:type"="communication"](${s},${w},${n},${e});` +
  `way["man_made"="tower"]["tower:type"="communication"](${s},${w},${n},${e});` +
  `node["tower:type"="communication"](${s},${w},${n},${e});` +
  `node["communication:mobile_phone"="yes"](${s},${w},${n},${e});` +
  `);out center;`

async function harvestOSMTile(s, w, n, e) {
  const query = buildOSMQuery(s, w, n, e)
  let lastErr
  for (const ep of OVERPASS_ENDPOINTS) {
    try {
      const j = await overpassFetch(ep, query)
      return j.elements || []
    } catch (e) { lastErr = e; await sleep(1500) }
  }
  throw lastErr
}

async function harvestOSM() {
  const features = []
  const tiles = []
  for (let lat = -90; lat < 90; lat += OSM_STEP) {
    for (let lng = -180; lng < 180; lng += OSM_STEP) {
      tiles.push([lat, lng, Math.min(lat + OSM_STEP, 85), Math.min(lng + OSM_STEP, 180)])
    }
  }
  log(`OSM: ${tiles.length} tiles (${OSM_STEP}°×${OSM_STEP}°)`)
  let idx = 0
  for (const [s, w, n, e] of tiles) {
    idx++
    try {
      const el = await harvestOSMTile(s, w, n, e)
      const before = features.length
      for (const x of el) {
        const lat = x.lat ?? x.center?.lat
        const lng = x.lon ?? x.center?.lon
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
        features.push({
          type: "Feature",
          properties: {
            id: `osm-${x.type}-${x.id}`,
            n: x.tags?.name ?? null,
            op: x.tags?.operator ?? null,
            h: x.tags?.height ? parseFloat(x.tags.height) : null,
            src: "osm",
          },
          geometry: { type: "Point", coordinates: [lng, lat] },
        })
      }
      log(`  [${idx}/${tiles.length}] (${s},${w}→${n},${e}) +${features.length - before} (total ${features.length})`)
    } catch (e) {
      log(`  [${idx}/${tiles.length}] (${s},${w}→${n},${e}) ERROR: ${e.message}`)
    }
    await sleep(1000) // politeness
  }
  log(`OSM: ${features.length} features total`)
  return features
}

// ─── US + Taiwan “instant” slice for static CREP load ─────────────────────

/** Points inside Taiwan, contiguous US, AK, HI, PR, Guam — matches defense map focus. */
function isUsTaiwanInstantSlice(lng, lat) {
  if (lat >= 21 && lat <= 26.6 && lng >= 118.4 && lng <= 122.6) return true // Taiwan
  if (lat >= 24 && lat <= 49.6 && lng >= -125 && lng <= -66.5) return true // contiguous US
  if (lat >= 51 && lat <= 72 && lng >= -179 && lng <= -129) return true // Alaska
  if (lat >= 18 && lat <= 23.5 && lng >= -161 && lng <= -154) return true // Hawaii
  if (lat >= 17.8 && lat <= 18.7 && lng >= -67.5 && lng <= -65.2) return true // Puerto Rico
  if (lat >= 13.1 && lat <= 13.7 && lng >= 144.6 && lng <= 144.95) return true // Guam
  return false
}

async function writeInstantGeoJSON(features) {
  const instant = features.filter((f) => {
    const [lng, lat] = f.geometry.coordinates
    return isUsTaiwanInstantSlice(lng, lat)
  })
  log(`instant bundle (US + TW + territories): ${instant.length.toLocaleString()} → ${path.basename(OUT_INSTANT)}`)
  if (instant.length === 0) {
    await fs.writeFile(OUT_INSTANT, JSON.stringify({ type: "FeatureCollection", features: [] }), "utf8")
    return
  }
  if (instant.length < 500_000) {
    await fs.writeFile(
      OUT_INSTANT,
      JSON.stringify({
        type: "FeatureCollection",
        generatedAt: new Date().toISOString(),
        slice: "us-tw-territories",
        features: instant,
      }),
      "utf8",
    )
    return
  }
  const stream = createWriteStream(OUT_INSTANT, { encoding: "utf8" })
  const write = (chunk) => new Promise((res) => (stream.write(chunk) ? res() : stream.once("drain", res)))
  await write(`{"type":"FeatureCollection","generatedAt":${JSON.stringify(new Date().toISOString())},"slice":"us-tw-territories","features":[`)
  for (let i = 0; i < instant.length; i++) {
    if (i > 0) await write(",")
    await write(JSON.stringify(instant[i]))
    if (i > 0 && i % 100000 === 0) log(`  instant ... ${i.toLocaleString()}/${instant.length.toLocaleString()}`)
  }
  await write("]}\n")
  await new Promise((res) => stream.end(res))
}

// ─── Orchestrate + dedupe + write ──────────────────────────────────────────

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  log(`Output: ${OUT_FILE}`)
  log(`Sources: MINDEX=${!SKIP_MINDEX}  OpenCelliD=${!SKIP_OCID}  OSM=${!SKIP_OSM}`)

  const [mindex, ocid, osm] = await Promise.all([
    SKIP_MINDEX ? [] : harvestMindex().catch((e) => { log("MINDEX failed:", e.message); return [] }),
    SKIP_OCID ? [] : harvestOpenCelliD().catch((e) => { log("OCID failed:", e.message); return [] }),
    SKIP_OSM ? [] : harvestOSM().catch((e) => { log("OSM failed:", e.message); return [] }),
  ])

  // Merge by ~11m grid; preserve richer records (MINDEX > OCID > OSM)
  const merged = new Map()
  const rank = { mindex: 3, ocid: 2, osm: 1 }
  const add = (f) => {
    const [lng, lat] = f.geometry.coordinates
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
    const existing = merged.get(key)
    if (!existing) { merged.set(key, f); return }
    if ((rank[f.properties.src] || 0) > (rank[existing.properties.src] || 0)) {
      merged.set(key, f)
    }
  }
  for (const arr of [mindex, ocid, osm]) for (const f of arr) add(f)

  const features = Array.from(merged.values())

  await writeInstantGeoJSON(features)

  // Stream-write to avoid JSON.stringify's ~512 MB max string length limit.
  // With Taiwan+US default (~1M features at ~150 bytes each) we'd be at ~150 MB,
  // borderline. Streaming keeps memory flat and scales to the full 4.8M set
  // when --all-countries is passed.
  log(`writing ${features.length.toLocaleString()} features to ${OUT_FILE} (streaming)...`)
  const stream = createWriteStream(OUT_FILE, { encoding: "utf8" })
  const write = (chunk) =>
    new Promise((res, rej) => (stream.write(chunk) ? res() : stream.once("drain", res))) // eslint-disable-line no-unused-vars
  const meta = {
    generatedAt: new Date().toISOString(),
    sources: { mindex: mindex.length, ocid: ocid.length, osm: osm.length, merged: features.length },
    countries: ALL_COUNTRIES ? "all" : Array.from(COUNTRIES),
  }
  await write(`{"type":"FeatureCollection","generatedAt":${JSON.stringify(meta.generatedAt)},"sources":${JSON.stringify(meta.sources)},"countries":${JSON.stringify(meta.countries)},"features":[`)
  for (let i = 0; i < features.length; i++) {
    if (i > 0) await write(",")
    await write(JSON.stringify(features[i]))
    if (i > 0 && i % 100000 === 0) log(`  ...wrote ${i.toLocaleString()}/${features.length.toLocaleString()}`)
  }
  await write("]}\n")
  await new Promise((res) => stream.end(res))
  log(`✓ wrote ${features.length.toLocaleString()} features to ${OUT_FILE}`)
  log(`  Next: run scripts/etl/crep/gen-celltower-pmtiles.sh to build PMTiles archive`)
  log(`  Instant slice: ${OUT_INSTANT} (commit for CREP immediate load)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
