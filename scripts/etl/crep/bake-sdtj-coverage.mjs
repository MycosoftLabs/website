#!/usr/bin/env node
/**
 * San Diego + Tijuana Coverage Expansion — Apr 22, 2026
 *
 * Morgan: "massive amount of missing data from TIJUANA including infra
 * cell towers enviornmental sensors, military, police, hospitals,
 * sewage line data centers, am fm antennas same with san diego missing
 * data".
 *
 * The base CREP layer set pulls global HIFLD + cell-towers-global +
 * data-centers-global pmtiles. Those have holes for:
 *   - Mexico (HIFLD is US-only)
 *   - Municipal-scale infra (hospitals, police stations, sewage)
 *   - AM/FM antennas (not in the global datacenter set)
 *   - Sub-kW police / sheriff / border-patrol stations
 *
 * This harvester pulls OSM Overpass directly for a TJ+SD bbox, splits
 * by category, writes 7 separate geojson layers so CREP can toggle
 * them individually. It's MUCH cheaper than the global harvest and
 * targets the exact coverage Morgan pointed at.
 *
 * Categories (one geojson file each):
 *   - sdtj-hospitals.geojson        amenity=hospital | amenity=clinic
 *   - sdtj-police.geojson           amenity=police + govt_type=border
 *   - sdtj-sewage.geojson           man_made=sewage_works | building=sewage
 *   - sdtj-cell-towers.geojson      man_made=communications_tower |
 *                                   tower:type=communication
 *   - sdtj-am-fm-antennas.geojson   man_made=antenna | tower:type=broadcast
 *   - sdtj-military.geojson         military=* (any military-tagged object)
 *   - sdtj-data-centers.geojson     telecom=data_center | office=it |
 *                                   data_center=* | building=data_center
 *
 * bbox (default) — covers SD County + Tijuana metro + Rosarito:
 *   west  -117.9
 *   south  32.3
 *   east  -116.8
 *   north  33.6
 *
 * Usage:
 *   node scripts/etl/crep/bake-sdtj-coverage.mjs [--bbox=w,s,e,n]
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
    .map((a) => {
      const [k, ...v] = a.slice(2).split("=")
      return [k, v.length ? v.join("=") : "true"]
    }),
)
const [W, S, E, N] = (args.get("bbox") || "-117.9,32.3,-116.8,33.6").split(",").map(Number)
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
    } catch (err) {
      lastErr = err
      await sleep(1500)
    }
  }
  throw lastErr || new Error("all overpass endpoints failed")
}

/**
 * Project a centroid for each OSM element so layers that want Point
 * geometry (cell towers, hospitals, antennas) get one even when the
 * upstream record is a way or relation.
 */
function toCentroid(el) {
  if (el.type === "node" && typeof el.lat === "number" && typeof el.lon === "number") {
    return [el.lon, el.lat]
  }
  if (el.type === "way" && Array.isArray(el.geometry) && el.geometry.length) {
    let sLon = 0, sLat = 0, n = 0
    for (const g of el.geometry) {
      if (typeof g.lon === "number" && typeof g.lat === "number") { sLon += g.lon; sLat += g.lat; n++ }
    }
    if (n) return [sLon / n, sLat / n]
  }
  if (el.type === "relation" && (typeof el.center?.lat === "number")) {
    return [el.center.lon, el.center.lat]
  }
  return null
}

/** Convert an OSM element into a Point Feature with normalized metadata. */
function toPointFeature(el, category) {
  const c = toCentroid(el)
  if (!c) return null
  const t = el.tags || {}
  return {
    type: "Feature",
    properties: {
      id: `osm-${el.type}-${el.id}`,
      osm_type: el.type,
      osm_id: el.id,
      category,
      name: t.name || t["name:en"] || t["name:es"] || t.operator || t.ref || null,
      operator: t.operator || null,
      ref: t.ref || null,
      tags: t,
      collected_at: new Date().toISOString(),
    },
    geometry: { type: "Point", coordinates: c },
  }
}

/** Convert an OSM way/relation into a Polygon (boundary-like) when it's closed. */
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
      osm_type: el.type,
      osm_id: el.id,
      category,
      name: t.name || t["name:en"] || t["name:es"] || t.operator || t.ref || null,
      operator: t.operator || null,
      tags: t,
      collected_at: new Date().toISOString(),
    },
    geometry: { type: "Polygon", coordinates: [geom] },
  }
}

// ─── Category queries ─────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: "hospitals",
    out: "sdtj-hospitals.geojson",
    // Hospitals + clinics + doctors' offices with emergency capability
    query: `
      [out:json][timeout:90];
      (
        node["amenity"="hospital"](${S},${W},${N},${E});
        way["amenity"="hospital"](${S},${W},${N},${E});
        relation["amenity"="hospital"](${S},${W},${N},${E});
        node["amenity"="clinic"](${S},${W},${N},${E});
        way["amenity"="clinic"](${S},${W},${N},${E});
        node["healthcare"="hospital"](${S},${W},${N},${E});
        way["healthcare"="hospital"](${S},${W},${N},${E});
      );
      out geom center;`,
    render: "point",
  },
  {
    id: "police",
    out: "sdtj-police.geojson",
    query: `
      [out:json][timeout:90];
      (
        node["amenity"="police"](${S},${W},${N},${E});
        way["amenity"="police"](${S},${W},${N},${E});
        relation["amenity"="police"](${S},${W},${N},${E});
        node["amenity"="fire_station"](${S},${W},${N},${E});
        way["amenity"="fire_station"](${S},${W},${N},${E});
        node["government"="border_control"](${S},${W},${N},${E});
        way["government"="border_control"](${S},${W},${N},${E});
      );
      out geom center;`,
    render: "point",
  },
  {
    id: "sewage",
    out: "sdtj-sewage.geojson",
    query: `
      [out:json][timeout:90];
      (
        node["man_made"="sewage_works"](${S},${W},${N},${E});
        way["man_made"="sewage_works"](${S},${W},${N},${E});
        relation["man_made"="sewage_works"](${S},${W},${N},${E});
        way["man_made"="wastewater_plant"](${S},${W},${N},${E});
        relation["man_made"="wastewater_plant"](${S},${W},${N},${E});
        way["building"="sewage"](${S},${W},${N},${E});
        way["utility"="sewerage"](${S},${W},${N},${E});
      );
      out geom center;`,
    render: "polygon", // treatment plants are polygons; fall back to point
  },
  {
    id: "cell-towers",
    out: "sdtj-cell-towers.geojson",
    query: `
      [out:json][timeout:90];
      (
        node["man_made"="communications_tower"](${S},${W},${N},${E});
        way["man_made"="communications_tower"](${S},${W},${N},${E});
        node["tower:type"="communication"](${S},${W},${N},${E});
        way["tower:type"="communication"](${S},${W},${N},${E});
        node["communication:mobile_phone"="yes"](${S},${W},${N},${E});
        node["man_made"="mast"](${S},${W},${N},${E});
        way["man_made"="mast"](${S},${W},${N},${E});
      );
      out geom center;`,
    render: "point",
  },
  {
    id: "am-fm-antennas",
    out: "sdtj-am-fm-antennas.geojson",
    query: `
      [out:json][timeout:90];
      (
        node["man_made"="antenna"](${S},${W},${N},${E});
        way["man_made"="antenna"](${S},${W},${N},${E});
        node["tower:type"="broadcast"](${S},${W},${N},${E});
        way["tower:type"="broadcast"](${S},${W},${N},${E});
        node["communication:radio"](${S},${W},${N},${E});
        node["communication:television"](${S},${W},${N},${E});
      );
      out geom center;`,
    render: "point",
  },
  {
    id: "military",
    out: "sdtj-military.geojson",
    query: `
      [out:json][timeout:90];
      (
        node["military"](${S},${W},${N},${E});
        way["military"](${S},${W},${N},${E});
        relation["military"](${S},${W},${N},${E});
        node["landuse"="military"](${S},${W},${N},${E});
        way["landuse"="military"](${S},${W},${N},${E});
        relation["landuse"="military"](${S},${W},${N},${E});
      );
      out geom center;`,
    render: "polygon",
  },
  {
    id: "data-centers",
    out: "sdtj-data-centers.geojson",
    query: `
      [out:json][timeout:90];
      (
        node["telecom"="data_center"](${S},${W},${N},${E});
        way["telecom"="data_center"](${S},${W},${N},${E});
        node["data_center"](${S},${W},${N},${E});
        way["data_center"](${S},${W},${N},${E});
        way["building"="data_center"](${S},${W},${N},${E});
        node["office"="it"](${S},${W},${N},${E});
        way["office"="it"](${S},${W},${N},${E});
      );
      out geom center;`,
    render: "point",
  },
]

// ─── Runner ───────────────────────────────────────────────────────────

async function runCategory(cat) {
  log(`--- ${cat.id} ---`)
  let elements = []
  try {
    const j = await overpass(cat.query)
    elements = j.elements || []
  } catch (err) {
    log(`  ✗ overpass failed: ${err.message}`)
    return { id: cat.id, count: 0, features: [] }
  }
  const features = elements
    .map((el) => cat.render === "polygon" ? toPolygonFeature(el, cat.id) : toPointFeature(el, cat.id))
    .filter(Boolean)
  log(`  ${elements.length} OSM elements → ${features.length} features`)
  return { id: cat.id, count: features.length, features }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  log(`bbox = ${W}, ${S}, ${E}, ${N} (SD + TJ + Rosarito)`)
  const summary = { generated_at: new Date().toISOString(), bbox: [W, S, E, N], layers: {} }
  for (const cat of CATEGORIES) {
    const result = await runCategory(cat)
    const fc = {
      type: "FeatureCollection",
      generated_at: summary.generated_at,
      bbox: [W, S, E, N],
      category: cat.id,
      feature_count: result.count,
      features: result.features,
    }
    const outPath = path.join(OUT_DIR, cat.out)
    await fs.writeFile(outPath, JSON.stringify(fc))
    const stat = await fs.stat(outPath)
    summary.layers[cat.id] = { file: cat.out, count: result.count, bytes: stat.size }
    log(`  ✓ wrote ${cat.out} (${(stat.size / 1024).toFixed(1)} KB)`)
    await sleep(800)
  }
  const sumPath = path.join(OUT_DIR, "sdtj-coverage-summary.json")
  await fs.writeFile(sumPath, JSON.stringify(summary, null, 2))
  log(`Summary → sdtj-coverage-summary.json`)
  log("Done.")
}

main().catch((err) => {
  console.error("[bake-sdtj-coverage] fatal:", err)
  process.exit(1)
})
