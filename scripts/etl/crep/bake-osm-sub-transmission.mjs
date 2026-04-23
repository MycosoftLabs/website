#!/usr/bin/env node
/**
 * OSM Sub-Transmission Harvester — Apr 22, 2026
 *
 * Morgan (Apr 22, 2026): "example i see a substation with no line to
 * it that doesnt make sense ... Loveland Substation 69 kV ... another
 * substation with no line? Jamacha Substation 69 kV ... THIS NEEDS TO
 * BE FIXED ACROSS ALL INFRA GLOBALLY ... another sub station and
 * power plant with no line connecting. Chula Vista Energy Center ...
 * Otay Substation ... all on same block no lines marked at all".
 *
 * Root cause:
 *   HIFLD's public US transmission dataset is ≥115 kV overhead only.
 *   SDG&E 69 kV sub-transmission (Loveland, Jamacha, Otay) — the lines
 *   actually connecting the substations Morgan clicked — ARE NOT in
 *   HIFLD. transmission-lines-us-full.geojson says
 *     sources: {hifld:52244, osm:0, mindex:0}
 *   so OSM wasn't contributing. The existing global fetch-transmission-full
 *   script pulls ALL power=line world-wide with 20° tiles (~3h run time)
 *   and was deferred in practice.
 *
 * This script is the FOCUSED complement:
 *   - Pulls OSM power=line globally at ALL voltages (no minimum filter)
 *   - Tags features with voltage when tagged upstream; keeps v:0 otherwise
 *   - Writes /public/data/crep/transmission-lines-sub-transmission.geojson
 *
 * That file is then loaded as a SECOND layer in CREP (dashed-line style,
 * lower priority than HIFLD) so Loveland/Jamacha/Otay/Chula Vista finally
 * show their feeders.
 *
 * Why a separate file vs merging into -full:
 *   - Layer style differentiates verified HIFLD (solid) vs community
 *     OSM (dashed) so users understand data provenance.
 *   - Independent rebuild cadence — OSM can regenerate weekly without
 *     touching the HIFLD baseline.
 *   - Rollback-safe: if OSM shards 502 en masse we can fall back to
 *     HIFLD-only without breaking the map.
 *
 * Usage:
 *   node scripts/etl/crep/bake-osm-sub-transmission.mjs [--bbox=w,s,e,n] [--step=10]
 *
 * Flags:
 *   --bbox    Harvest only inside this bbox (comma-separated w,s,e,n
 *             deg). Default: whole world (-180,-60,180,80).
 *   --step    Tile size in degrees (default 10; smaller = more tiles
 *             but each fits in Overpass timeout more reliably).
 *   --max-v   Max voltage filter (default: no cap — set to 69000 to get
 *             only sub-transmission).
 *
 * Expected outputs:
 *   - Global ALL: ~800k–1.2M features, 250–400 MB
 *   - SD County bbox (-117.7,32.5,-116.0,33.5): ~8k features, 2-3 MB
 *
 * Morgan's rule: bundled + hardcoded in the image, same pattern as
 * cell-towers-global.pmtiles.
 */

import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const ROOT = path.resolve(path.dirname(__filename), "..", "..", "..")
const OUT_DIR = path.join(ROOT, "public", "data", "crep")
const OUT_FILE = path.join(OUT_DIR, "transmission-lines-sub-transmission.geojson")

const args = new Map(
  process.argv.slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, ...v] = a.slice(2).split("=")
      return [k, v.length ? v.join("=") : "true"]
    }),
)

const BBOX = (args.get("bbox") || "-180,-60,180,80").split(",").map(Number)
const STEP = Math.max(1, Math.min(30, Number(args.get("step") || 10)))
const MAX_V = Number(args.get("max-v") || 0) || null
const [W, S, E, N] = BBOX

const log = (...a) => console.log(`[${new Date().toISOString().substring(11, 19)}]`, ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Rotate across Overpass mirrors when one rate-limits.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
]

async function overpassFetch(endpoint, query, timeoutMs = 180_000) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mycosoft-CREP/1.0" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`overpass ${res.status}`)
  const ct = (res.headers.get("content-type") || "").toLowerCase()
  if (!ct.includes("json")) {
    const preview = (await res.text()).slice(0, 200)
    throw new Error(`overpass non-JSON: ${preview}`)
  }
  return res.json()
}

function buildTiles(w, s, e, n, step) {
  const tiles = []
  for (let lat = Math.floor(s); lat < n; lat += step) {
    for (let lng = Math.floor(w); lng < e; lng += step) {
      tiles.push([lat, lng, Math.min(lat + step, 85), Math.min(lng + step, 180)])
    }
  }
  return tiles
}

/**
 * Parse OSM's voltage tag — often multiple values separated by ; or ,
 * representing a circuit with multiple voltage classes. We take the
 * LOWEST value so sub-transmission filter works (Morgan's Jamacha case
 * would be tagged e.g. "69000;12000" for the 69 kV line + adjacent
 * distribution).
 */
function parseVoltage(vTag) {
  if (!vTag) return 0
  if (typeof vTag === "number") return vTag
  const parts = String(vTag).split(/[;,]/).map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite)
  if (!parts.length) return 0
  return Math.min(...parts)
}

async function harvestTile(s, w, n, e) {
  const vClause = MAX_V ? `["voltage"](if:t["voltage"] != "" && number(t["voltage"]) <= ${MAX_V})` : ""
  // Primary query — power=line ways within bbox. Keep geometry + tags.
  const q = `[out:json][timeout:150];way["power"="line"]${vClause}(${s},${w},${n},${e});out geom 6000;`

  let lastErr = null
  for (const ep of OVERPASS_ENDPOINTS) {
    try {
      const j = await overpassFetch(ep, q)
      return j.elements || []
    } catch (e) {
      lastErr = e
      await sleep(1500)
    }
  }
  throw lastErr || new Error("all overpass endpoints failed")
}

function wayToFeature(w0) {
  if (!w0.geometry || w0.geometry.length < 2) return null
  const coords = w0.geometry.map((g) => [g.lon, g.lat])
  const v = parseVoltage(w0.tags?.voltage)
  // Classify voltage class for layer coloring
  let vClass = "unknown"
  if (v >= 345000) vClass = "EHV-345kv+"
  else if (v >= 138000) vClass = "HV-138-230kv"
  else if (v >= 69000) vClass = "MV-69-115kv"
  else if (v >= 30000) vClass = "MV-30-69kv"
  else if (v > 0)      vClass = "distribution"
  return {
    type: "Feature",
    properties: {
      id: `osm-way-${w0.id}`,
      v,
      v_class: vClass,
      op: w0.tags?.operator || null,
      n: w0.tags?.name || w0.tags?.ref || null,
      cables: w0.tags?.cables ? parseInt(w0.tags.cables, 10) || null : null,
      circuits: w0.tags?.circuits ? parseInt(w0.tags.circuits, 10) || null : null,
      wires: w0.tags?.wires || null,
      status: "Active",
      src: "osm",
    },
    geometry: { type: "LineString", coordinates: coords },
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  const tiles = buildTiles(W, S, E, N, STEP)
  log(`bbox=${W},${S},${E},${N} step=${STEP}° → ${tiles.length} tiles`)
  if (MAX_V) log(`voltage filter: ≤${MAX_V} V`)

  const allFeatures = []
  let idx = 0
  let failed = 0
  for (const [s, w, n, e] of tiles) {
    idx++
    try {
      const ways = await harvestTile(s, w, n, e)
      const feats = ways.map(wayToFeature).filter(Boolean)
      allFeatures.push(...feats)
      log(`[${idx}/${tiles.length}] (${s},${w}→${n},${e}) +${feats.length}  total ${allFeatures.length.toLocaleString()}`)
    } catch (err) {
      failed++
      log(`[${idx}/${tiles.length}] FAIL ${err.message}`)
    }
    // Overpass fair-use: pause between requests.
    await sleep(900)
  }

  log(`Writing ${allFeatures.length.toLocaleString()} features → ${OUT_FILE}`)
  const out = {
    type: "FeatureCollection",
    generatedAt: new Date().toISOString(),
    sources: { osm: allFeatures.length },
    bbox: [W, S, E, N],
    tile_count: tiles.length,
    tiles_failed: failed,
    max_voltage_filter: MAX_V,
    features: allFeatures,
  }
  await fs.writeFile(OUT_FILE, JSON.stringify(out))
  log(`✓ baked ${(JSON.stringify(out).length / 1_000_000).toFixed(1)} MB`)
  if (failed > 0) {
    log(`  ${failed} tile(s) failed — consider re-running with smaller --step`)
  }
}

main().catch((err) => {
  console.error("[bake-osm-sub-transmission] fatal:", err)
  process.exit(1)
})
