#!/usr/bin/env node
/**
 * US Major Cities Coverage Bake — Apr 23, 2026
 *
 * Morgan: "every single environmental sensor and data source tool in
 * nyc and cd and san diego los angeles and san francisco and chicago
 * and austin houston texas and miami florida and denver colorado and
 * salt lake city and other large cities in the us need to be on crep
 * in map no questions asked".
 *
 * Same pattern as bake-nyc-dc-coverage.mjs and bake-sdtj-coverage.mjs,
 * generalised to 15 US metros. 11 OSM categories per city × 15 cities =
 * 165 geojson layers baked per run.
 *
 * ETA: ~60–90 min for all cities (11 categories × 15 × ~30s Overpass
 * query + sleep). Run overnight, commit outputs, done.
 *
 * Flags:
 *   --city=la               single city
 *   --skip-cities=houston,dallas   skip specified
 *   --categories=hospitals,police  subset of categories
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

const CITIES = [
  { id: "la",       name: "Los Angeles metro",     bbox: [-118.70, 33.70, -118.00, 34.34] },
  { id: "sf",       name: "San Francisco Bay",     bbox: [-122.55, 37.40, -121.85, 38.00] },
  { id: "chicago",  name: "Chicago + suburbs",     bbox: [-88.00, 41.60, -87.50, 42.05] },
  { id: "austin",   name: "Austin, TX",            bbox: [-98.00, 30.08, -97.55, 30.55] },
  { id: "houston",  name: "Houston, TX",           bbox: [-95.80, 29.45, -95.00, 30.05] },
  { id: "miami",    name: "Miami-Dade, FL",        bbox: [-80.60, 25.55, -80.05, 26.05] },
  { id: "denver",   name: "Denver + Boulder",      bbox: [-105.30, 39.55, -104.75, 40.10] },
  { id: "slc",      name: "Salt Lake City",        bbox: [-112.10, 40.55, -111.70, 40.95] },
  { id: "seattle",  name: "Seattle metro",         bbox: [-122.50, 47.40, -122.05, 47.85] },
  { id: "boston",   name: "Boston metro",          bbox: [-71.30, 42.20, -70.90, 42.55] },
  { id: "philly",   name: "Philadelphia",          bbox: [-75.35, 39.85, -74.95, 40.15] },
  { id: "atlanta",  name: "Atlanta metro",         bbox: [-84.65, 33.55, -84.05, 34.00] },
  { id: "phoenix",  name: "Phoenix metro",         bbox: [-112.45, 33.25, -111.75, 33.80] },
  { id: "dallas",   name: "Dallas-Fort Worth",     bbox: [-97.50, 32.55, -96.55, 33.10] },
  { id: "vegas",    name: "Las Vegas",             bbox: [-115.35, 36.00, -115.00, 36.35] },
]

const ONLY = args.get("city") ? args.get("city").split(",") : null
const SKIP = args.get("skip-cities") ? args.get("skip-cities").split(",") : []
const CATS_FILTER = args.get("categories") ? args.get("categories").split(",") : null

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
      if (!ct.includes("json")) throw new Error(`overpass non-JSON`)
      return res.json()
    } catch (err) { lastErr = err; await sleep(1500) }
  }
  throw lastErr
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
  return { type: "Feature", properties: { id: `osm-${el.type}-${el.id}`, osm_type: el.type, osm_id: el.id, category, name: t.name || t["name:en"] || t.operator || t.ref || null, operator: t.operator || null, ref: t.ref || null, tags: t }, geometry: { type: "Point", coordinates: c } }
}
function toPolygonFeature(el, category) {
  if (el.type !== "way" || !Array.isArray(el.geometry)) return toPointFeature(el, category)
  const geom = el.geometry.map((g) => [g.lon, g.lat])
  if (geom.length < 3) return toPointFeature(el, category)
  const first = geom[0], last = geom[geom.length - 1]
  const closed = first[0] === last[0] && first[1] === last[1]
  if (!closed) return toPointFeature(el, category)
  const t = el.tags || {}
  return { type: "Feature", properties: { id: `osm-${el.type}-${el.id}`, osm_type: el.type, osm_id: el.id, category, name: t.name || t["name:en"] || t.operator || null, operator: t.operator || null, tags: t }, geometry: { type: "Polygon", coordinates: [geom] } }
}

const CATEGORIES = [
  { id: "hospitals",      render: "point",   q: (S,W,N,E) => `[out:json][timeout:90];(node["amenity"="hospital"](${S},${W},${N},${E});way["amenity"="hospital"](${S},${W},${N},${E});node["amenity"="clinic"](${S},${W},${N},${E});way["amenity"="clinic"](${S},${W},${N},${E}););out geom center;` },
  { id: "police",         render: "point",   q: (S,W,N,E) => `[out:json][timeout:90];(node["amenity"="police"](${S},${W},${N},${E});way["amenity"="police"](${S},${W},${N},${E});node["amenity"="fire_station"](${S},${W},${N},${E});way["amenity"="fire_station"](${S},${W},${N},${E}););out geom center;` },
  { id: "sewage",         render: "polygon", q: (S,W,N,E) => `[out:json][timeout:90];(way["man_made"="sewage_works"](${S},${W},${N},${E});way["man_made"="wastewater_plant"](${S},${W},${N},${E});relation["man_made"="wastewater_plant"](${S},${W},${N},${E}););out geom center;` },
  { id: "cell-towers",    render: "point",   q: (S,W,N,E) => `[out:json][timeout:90];(node["man_made"="communications_tower"](${S},${W},${N},${E});way["man_made"="communications_tower"](${S},${W},${N},${E});node["tower:type"="communication"](${S},${W},${N},${E});node["man_made"="mast"](${S},${W},${N},${E}););out geom center;` },
  { id: "am-fm-antennas", render: "point",   q: (S,W,N,E) => `[out:json][timeout:90];(node["man_made"="antenna"](${S},${W},${N},${E});way["man_made"="antenna"](${S},${W},${N},${E});node["tower:type"="broadcast"](${S},${W},${N},${E}););out geom center;` },
  { id: "military",       render: "polygon", q: (S,W,N,E) => `[out:json][timeout:90];(node["military"](${S},${W},${N},${E});way["military"](${S},${W},${N},${E});relation["military"](${S},${W},${N},${E});way["landuse"="military"](${S},${W},${N},${E});relation["landuse"="military"](${S},${W},${N},${E}););out geom center;` },
  { id: "data-centers",   render: "point",   q: (S,W,N,E) => `[out:json][timeout:90];(node["telecom"="data_center"](${S},${W},${N},${E});way["telecom"="data_center"](${S},${W},${N},${E});way["building"="data_center"](${S},${W},${N},${E}););out geom center;` },
  { id: "transit-subway", render: "point",   q: (S,W,N,E) => `[out:json][timeout:90];(node["station"="subway"](${S},${W},${N},${E});node["railway"="station"]["subway"="yes"](${S},${W},${N},${E});node["public_transport"="station"]["train"="yes"](${S},${W},${N},${E}););out geom center;` },
  { id: "transit-rail",   render: "point",   q: (S,W,N,E) => `[out:json][timeout:90];(node["railway"="station"](${S},${W},${N},${E});node["railway"="halt"](${S},${W},${N},${E});way["railway"="station"](${S},${W},${N},${E}););out geom center;` },
  { id: "airports",       render: "point",   q: (S,W,N,E) => `[out:json][timeout:90];(node["aeroway"="aerodrome"](${S},${W},${N},${E});way["aeroway"="aerodrome"](${S},${W},${N},${E});node["aeroway"="heliport"](${S},${W},${N},${E}););out geom center;` },
  { id: "govt-embassy",   render: "point",   q: (S,W,N,E) => `[out:json][timeout:90];(node["amenity"="embassy"](${S},${W},${N},${E});way["amenity"="embassy"](${S},${W},${N},${E});way["office"="government"](${S},${W},${N},${E});node["amenity"="courthouse"](${S},${W},${N},${E});way["amenity"="courthouse"](${S},${W},${N},${E}););out geom center;` },
]

async function bakeCity(city) {
  const [W, S, E, N] = city.bbox
  log(`=== ${city.name} (${W},${S},${E},${N}) ===`)
  const summary = { ...city, layers: {} }
  const cats = CATS_FILTER ? CATEGORIES.filter(c => CATS_FILTER.includes(c.id)) : CATEGORIES
  for (const cat of cats) {
    let elements = []
    try {
      const j = await overpass(cat.q(S, W, N, E))
      elements = j.elements || []
    } catch (err) { log(`  ✗ ${cat.id}: ${err.message}`); summary.layers[cat.id] = { error: err.message }; await sleep(800); continue }
    const features = elements.map((el) => cat.render === "polygon" ? toPolygonFeature(el, cat.id) : toPointFeature(el, cat.id)).filter(Boolean)
    const fc = { type: "FeatureCollection", generated_at: new Date().toISOString(), region: city.id, bbox: city.bbox, category: cat.id, feature_count: features.length, features }
    const outName = `${city.id}-${cat.id}.geojson`
    await fs.writeFile(path.join(OUT_DIR, outName), JSON.stringify(fc))
    const sz = (await fs.stat(path.join(OUT_DIR, outName))).size
    summary.layers[cat.id] = { file: outName, count: features.length, bytes: sz }
    log(`  ✓ ${cat.id}: ${features.length} features (${(sz/1024).toFixed(1)} KB)`)
    await sleep(800)
  }
  return summary
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  const toRun = CITIES.filter(c => (!ONLY || ONLY.includes(c.id)) && !SKIP.includes(c.id))
  log(`Baking ${toRun.length} cities × ${CATEGORIES.length} categories`)
  const overall = { generated_at: new Date().toISOString(), cities: {} }
  for (const city of toRun) {
    overall.cities[city.id] = await bakeCity(city)
  }
  await fs.writeFile(path.join(OUT_DIR, "us-major-cities-coverage-summary.json"), JSON.stringify(overall, null, 2))
  log("Summary → us-major-cities-coverage-summary.json")
  log("Done.")
}

main().catch((err) => { console.error("[bake-us-major-cities] fatal:", err); process.exit(1) })
