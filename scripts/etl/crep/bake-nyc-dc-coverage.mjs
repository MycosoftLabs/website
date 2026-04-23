#!/usr/bin/env node
/**
 * NYC + DC Coverage Expansion — Apr 23, 2026
 *
 * Morgan: "in washington DC over the whitehouse and dc there is a
 * profound amount of missing data there must 1000X more data all
 * cameras cell towers all enviornmental sensors all internet connected
 * systems feeding data that can be used by a user needs to be on this
 * map ... this is why mil gov ic would use our products".
 *
 * Same pattern as bake-sdtj-coverage.mjs. Two regions, 10 categories each:
 *   hospitals, police/fire/border, sewage, cell towers, AM/FM antennas,
 *   military, data centers, subway/rail stations, airports, govt/embassy.
 *
 * NYC bbox : -74.10, 40.55, -73.70, 40.92 (five boroughs + Jersey City)
 * DC  bbox : -77.30, 38.70, -76.80, 39.10 (DC + Arlington + Alex + Bethesda)
 *
 * Writes one geojson per (region, category): e.g.
 *   public/data/crep/nyc-hospitals.geojson
 *   public/data/crep/dc-police.geojson
 *
 * Usage:
 *   node scripts/etl/crep/bake-nyc-dc-coverage.mjs
 *   node scripts/etl/crep/bake-nyc-dc-coverage.mjs --region=nyc
 *   node scripts/etl/crep/bake-nyc-dc-coverage.mjs --region=dc --bbox=-77.3,38.7,-76.8,39.1
 */

import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const ROOT = path.resolve(path.dirname(__filename), "..", "..", "..")
const OUT_DIR = path.join(ROOT, "public", "data", "crep")

const args = new Map(
  process.argv.slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => { const [k, ...v] = a.slice(2).split("="); return [k, v.length ? v.join("=") : "true"] }),
)
const REGION_FILTER = args.get("region") || null

const REGIONS = [
  { id: "nyc", name: "New York City + NJ approach", bbox: [-74.10, 40.55, -73.70, 40.92] },
  { id: "dc",  name: "Washington DC metro + Arlington + Bethesda", bbox: [-77.30, 38.70, -76.80, 39.10] },
]
const BBOX_OVERRIDE = args.get("bbox") ? args.get("bbox").split(",").map(Number) : null

const log = (...a) => console.log(`[${new Date().toISOString().substring(11, 19)}]`, ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
]

async function overpass(query, timeoutMs = 120_000) {
  let lastErr = null
  for (const ep of OVERPASS) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mycosoft-CREP/1.0" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) throw new Error(`overpass ${res.status}`)
      const ct = (res.headers.get("content-type") || "").toLowerCase()
      if (!ct.includes("json")) throw new Error(`overpass non-JSON: ${(await res.text()).slice(0, 200)}`)
      return res.json()
    } catch (err) { lastErr = err; await sleep(1500) }
  }
  throw lastErr || new Error("all overpass endpoints failed")
}

function toCentroid(el) {
  if (el.type === "node" && typeof el.lat === "number" && typeof el.lon === "number") return [el.lon, el.lat]
  if (el.type === "way" && Array.isArray(el.geometry) && el.geometry.length) {
    let sLon = 0, sLat = 0, n = 0
    for (const g of el.geometry) {
      if (typeof g.lon === "number" && typeof g.lat === "number") { sLon += g.lon; sLat += g.lat; n++ }
    }
    if (n) return [sLon / n, sLat / n]
  }
  if (el.type === "relation" && typeof el.center?.lat === "number") return [el.center.lon, el.center.lat]
  return null
}

function toPointFeature(el, category) {
  const c = toCentroid(el); if (!c) return null
  const t = el.tags || {}
  return {
    type: "Feature",
    properties: {
      id: `osm-${el.type}-${el.id}`,
      osm_type: el.type, osm_id: el.id, category,
      name: t.name || t["name:en"] || t.operator || t.ref || null,
      operator: t.operator || null, ref: t.ref || null,
      tags: t, collected_at: new Date().toISOString(),
    },
    geometry: { type: "Point", coordinates: c },
  }
}

function toPolygonFeature(el, category) {
  if (el.type !== "way" || !Array.isArray(el.geometry)) return toPointFeature(el, category)
  const geom = el.geometry.map((g) => [g.lon, g.lat])
  if (geom.length < 3) return toPointFeature(el, category)
  const first = geom[0], last = geom[geom.length - 1]
  const closed = first[0] === last[0] && first[1] === last[1]
  if (!closed) return toPointFeature(el, category)
  const t = el.tags || {}
  return {
    type: "Feature",
    properties: {
      id: `osm-${el.type}-${el.id}`,
      osm_type: el.type, osm_id: el.id, category,
      name: t.name || t["name:en"] || t.operator || null,
      operator: t.operator || null, tags: t,
      collected_at: new Date().toISOString(),
    },
    geometry: { type: "Polygon", coordinates: [geom] },
  }
}

const CATEGORIES = [
  { id: "hospitals",    render: "point",   q: (S,W,N,E) => `[out:json][timeout:90];(node["amenity"="hospital"](${S},${W},${N},${E});way["amenity"="hospital"](${S},${W},${N},${E});relation["amenity"="hospital"](${S},${W},${N},${E});node["amenity"="clinic"](${S},${W},${N},${E});way["amenity"="clinic"](${S},${W},${N},${E}););out geom center;` },
  { id: "police",       render: "point",   q: (S,W,N,E) => `[out:json][timeout:90];(node["amenity"="police"](${S},${W},${N},${E});way["amenity"="police"](${S},${W},${N},${E});node["amenity"="fire_station"](${S},${W},${N},${E});way["amenity"="fire_station"](${S},${W},${N},${E}););out geom center;` },
  { id: "sewage",       render: "polygon", q: (S,W,N,E) => `[out:json][timeout:90];(way["man_made"="sewage_works"](${S},${W},${N},${E});way["man_made"="wastewater_plant"](${S},${W},${N},${E});relation["man_made"="wastewater_plant"](${S},${W},${N},${E}););out geom center;` },
  { id: "cell-towers",  render: "point",   q: (S,W,N,E) => `[out:json][timeout:90];(node["man_made"="communications_tower"](${S},${W},${N},${E});way["man_made"="communications_tower"](${S},${W},${N},${E});node["tower:type"="communication"](${S},${W},${N},${E});node["man_made"="mast"](${S},${W},${N},${E}););out geom center;` },
  { id: "am-fm-antennas", render: "point", q: (S,W,N,E) => `[out:json][timeout:90];(node["man_made"="antenna"](${S},${W},${N},${E});way["man_made"="antenna"](${S},${W},${N},${E});node["tower:type"="broadcast"](${S},${W},${N},${E});way["tower:type"="broadcast"](${S},${W},${N},${E}););out geom center;` },
  { id: "military",     render: "polygon", q: (S,W,N,E) => `[out:json][timeout:90];(node["military"](${S},${W},${N},${E});way["military"](${S},${W},${N},${E});relation["military"](${S},${W},${N},${E});way["landuse"="military"](${S},${W},${N},${E});relation["landuse"="military"](${S},${W},${N},${E}););out geom center;` },
  { id: "data-centers", render: "point",   q: (S,W,N,E) => `[out:json][timeout:90];(node["telecom"="data_center"](${S},${W},${N},${E});way["telecom"="data_center"](${S},${W},${N},${E});way["building"="data_center"](${S},${W},${N},${E});node["office"="it"](${S},${W},${N},${E}););out geom center;` },
  // New categories — transit + government
  { id: "transit-subway", render: "point", q: (S,W,N,E) => `[out:json][timeout:90];(node["station"="subway"](${S},${W},${N},${E});node["railway"="station"]["subway"="yes"](${S},${W},${N},${E});node["public_transport"="station"]["train"="yes"](${S},${W},${N},${E}););out geom center;` },
  { id: "transit-rail",  render: "point", q: (S,W,N,E) => `[out:json][timeout:90];(node["railway"="station"](${S},${W},${N},${E});node["railway"="halt"](${S},${W},${N},${E});way["railway"="station"](${S},${W},${N},${E}););out geom center;` },
  { id: "airports",      render: "point", q: (S,W,N,E) => `[out:json][timeout:90];(node["aeroway"="aerodrome"](${S},${W},${N},${E});way["aeroway"="aerodrome"](${S},${W},${N},${E});node["aeroway"="heliport"](${S},${W},${N},${E}););out geom center;` },
  { id: "govt-embassy",  render: "point", q: (S,W,N,E) => `[out:json][timeout:90];(node["amenity"="embassy"](${S},${W},${N},${E});way["amenity"="embassy"](${S},${W},${N},${E});node["diplomatic"="embassy"](${S},${W},${N},${E});way["amenity"="townhall"](${S},${W},${N},${E});node["amenity"="courthouse"](${S},${W},${N},${E});way["amenity"="courthouse"](${S},${W},${N},${E});way["office"="government"](${S},${W},${N},${E}););out geom center;` },
]

async function runCategoryForRegion(region, cat) {
  const [W, S, E, N] = region.bbox
  log(`[${region.id}] ${cat.id}…`)
  let elements = []
  try {
    const j = await overpass(cat.q(S, W, N, E))
    elements = j.elements || []
  } catch (err) { log(`  ✗ overpass ${cat.id} failed: ${err.message}`); return { features: [], count: 0 } }
  const features = elements
    .map((el) => cat.render === "polygon" ? toPolygonFeature(el, cat.id) : toPointFeature(el, cat.id))
    .filter(Boolean)
  log(`  ${elements.length} OSM elements → ${features.length} features`)
  return { features, count: features.length }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  const regionsToRun = REGION_FILTER
    ? REGIONS.filter((r) => r.id === REGION_FILTER)
    : REGIONS
  if (!regionsToRun.length) {
    console.error(`unknown region "${REGION_FILTER}" — known: ${REGIONS.map(r => r.id).join(", ")}`)
    process.exit(1)
  }
  const summary = { generated_at: new Date().toISOString(), regions: {} }

  for (const region of regionsToRun) {
    const bbox = (BBOX_OVERRIDE && regionsToRun.length === 1) ? BBOX_OVERRIDE : region.bbox
    const regionRun = { ...region, bbox }
    log(`=== ${region.name} (bbox ${bbox.join(",")}) ===`)
    summary.regions[region.id] = { bbox, layers: {} }
    for (const cat of CATEGORIES) {
      const result = await runCategoryForRegion(regionRun, cat)
      const fc = {
        type: "FeatureCollection",
        generated_at: summary.generated_at,
        region: region.id,
        bbox,
        category: cat.id,
        feature_count: result.count,
        features: result.features,
      }
      const outName = `${region.id}-${cat.id}.geojson`
      await fs.writeFile(path.join(OUT_DIR, outName), JSON.stringify(fc))
      const sz = (await fs.stat(path.join(OUT_DIR, outName))).size
      summary.regions[region.id].layers[cat.id] = { file: outName, count: result.count, bytes: sz }
      log(`  ✓ ${outName} (${(sz/1024).toFixed(1)} KB)`)
      await sleep(800)
    }
  }
  await fs.writeFile(path.join(OUT_DIR, "nyc-dc-coverage-summary.json"), JSON.stringify(summary, null, 2))
  log("Summary → nyc-dc-coverage-summary.json")
  log("Done.")
}

main().catch((err) => { console.error("[bake-nyc-dc-coverage] fatal:", err); process.exit(1) })
