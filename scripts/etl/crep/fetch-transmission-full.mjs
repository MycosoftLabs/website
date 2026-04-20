#!/usr/bin/env node
/**
 * Full US Transmission Lines Harvester — Apr 19, 2026
 *
 * Morgan (Apr 19, 2026): "looking in san diego there is massive missing
 * infra powerlines you missed all the smaller transmission lines like
 * suncres and jamacha and many others just as examples all powerlines
 * need to be there smallest lines need to be hardcoded every single
 * asset from opengridworks needs to be hardcoded in our crep map".
 *
 * Current bundled file `transmission-lines-us-major.geojson` is HIFLD
 * ≥345 kV only (22,760 segments) — that's just the long-haul backbone.
 * San Diego county has only 22 features in it, all ≥500 kV (Suncrest
 * SWPL, Sunrise Powerlink etc). 69 / 115 / 138 / 230 kV feeders like
 * Jamacha, Miguel, South Bay tie lines are completely absent.
 *
 * Sources (bundled, time-boxed, fail-isolated):
 *   1. HIFLD Electric Power Transmission Lines (full) — ArcGIS
 *      FeatureServer. All US voltage classes (69 kV through 1100 kV).
 *      ~125k features globally.
 *   2. OpenInfraMap / OSM power=line via Overpass — fills gaps in
 *      HIFLD for distribution-level lines + minor transmission.
 *      Sharded by 20° bboxes to avoid Overpass timeouts.
 *   3. MINDEX power_grid (when LAN reachable) — custom Morgan data.
 *
 * Output:
 *   public/data/crep/transmission-lines-us-full.geojson
 *
 * Usage:
 *   node scripts/etl/crep/fetch-transmission-full.mjs [--no-osm] [--no-mindex]
 *
 * After:
 *   bash scripts/etl/crep/gen-transmission-pmtiles.sh
 *
 * Morgan's rule: these are bundled + hardcoded in the image — same
 * pattern as cell-towers-global.pmtiles.
 */

import { promises as fs, createWriteStream } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const ROOT = path.resolve(path.dirname(__filename), "..", "..", "..")
const OUT_DIR = path.join(ROOT, "public", "data", "crep")
const OUT_FILE = path.join(OUT_DIR, "transmission-lines-us-full.geojson")

const args = new Set(process.argv.slice(2))
const SKIP_OSM = args.has("--no-osm")
const SKIP_MINDEX = args.has("--no-mindex") || !process.env.MINDEX_API_URL
const SKIP_HIFLD = args.has("--no-hifld")

const log = (...a) => console.log(`[${new Date().toISOString().substring(11, 19)}]`, ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ─── Source 1: HIFLD Electric Power Transmission Lines (full) ──────────────
// HIFLD migrated to ESRI Geoplatform hosted services. The FeatureServer
// URL for electric power transmission lines changes periodically — we try
// the most-recent known endpoints in order.
const HIFLD_CANDIDATES = [
  "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0",
  "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/ElectricPowerTransmissionLines/FeatureServer/0",
  "https://services.arcgis.com/Hp6G80Pky0om7QvQ/ArcGIS/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0",
  "https://geo.energy.gov/arcgis/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0",
  "https://services5.arcgis.com/9SnB0u95p4pT2EwA/ArcGIS/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0",
]

async function probeHifldEndpoint(base) {
  try {
    const res = await fetch(`${base}?f=json`, { signal: AbortSignal.timeout(12_000) })
    if (!res.ok) return null
    const ct = (res.headers.get("content-type") || "").toLowerCase()
    if (!ct.includes("json")) return null
    const meta = await res.json()
    if (!meta?.name && !meta?.geometryType) return null
    return { base, maxRecords: meta.maxRecordCount || 2000, count: meta.count ?? null }
  } catch { return null }
}

async function fetchHifldFull() {
  let endpoint = null
  for (const url of HIFLD_CANDIDATES) {
    log(`HIFLD: probing ${url}...`)
    const probe = await probeHifldEndpoint(url)
    if (probe) { endpoint = probe; break }
  }
  if (!endpoint) {
    log("HIFLD: no working endpoint found among candidates — skipping")
    return []
  }
  log(`HIFLD: using ${endpoint.base} (maxRecordCount=${endpoint.maxRecords})`)

  // First, get total count to size pagination
  const countRes = await fetch(`${endpoint.base}/query?where=1%3D1&returnCountOnly=true&f=json`, {
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null)
  const countJson = countRes?.ok ? await countRes.json().catch(() => null) : null
  const total = countJson?.count ?? 0
  log(`HIFLD: total feature count = ${total.toLocaleString()}`)
  if (!total) return []

  const pageSize = Math.min(endpoint.maxRecords, 2000)
  const pages = Math.ceil(total / pageSize)
  const features = []
  for (let p = 0; p < pages; p++) {
    const offset = p * pageSize
    const url = `${endpoint.base}/query?where=1%3D1&outFields=*&outSR=4326&f=geojson&resultOffset=${offset}&resultRecordCount=${pageSize}`
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(45_000) })
      if (!res.ok) { log(`HIFLD page ${p}: HTTP ${res.status} — skip`); continue }
      const j = await res.json()
      const feats = j?.features || []
      for (const f of feats) {
        const p0 = f.properties || {}
        // Normalize voltage to volts (HIFLD stores kV in `VOLTAGE`).
        const voltKv = Number(p0.VOLTAGE) || Number(p0.voltage) || Number(p0.VOLT_CLASS) || 0
        features.push({
          type: "Feature",
          properties: {
            id: `hifld-${p0.OBJECTID || p0.FID || features.length}`,
            v: voltKv > 0 ? voltKv * 1000 : 0,          // volts — match existing bundle schema
            op: p0.OWNER || p0.owner || null,
            n: p0.NAME || p0.LINE_NAME || null,
            status: p0.STATUS || "IN SERVICE",
            src: "hifld",
          },
          geometry: f.geometry,
        })
      }
      log(`HIFLD page ${p + 1}/${pages} (+${feats.length}) total ${features.length.toLocaleString()}`)
    } catch (e) {
      log(`HIFLD page ${p} ERROR ${e.message}`)
    }
    await sleep(120)
  }
  log(`HIFLD: ${features.length.toLocaleString()} features`)
  return features
}

// ─── Source 2: OSM power=line via Overpass (sharded) ───────────────────────
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
]
const OSM_STEP = 20 // degrees — denser than cell-tower pull because power lines are plentiful

async function overpassFetch(endpoint, query, timeoutMs = 180_000) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (!(res.headers.get("content-type") || "").includes("json")) throw new Error("non-json")
  return res.json()
}

async function harvestOSM() {
  const features = []
  const tiles = []
  for (let lat = -60; lat < 80; lat += OSM_STEP) {
    for (let lng = -180; lng < 180; lng += OSM_STEP) {
      tiles.push([lat, lng, Math.min(lat + OSM_STEP, 85), Math.min(lng + OSM_STEP, 180)])
    }
  }
  log(`OSM: ${tiles.length} tiles`)
  let idx = 0
  for (const [s, w, n, e] of tiles) {
    idx++
    const q = `[out:json][timeout:120];way["power"="line"](${s},${w},${n},${e});out geom 5000;`
    let ok = false
    for (const ep of OVERPASS_ENDPOINTS) {
      try {
        const j = await overpassFetch(ep, q)
        const ways = j.elements || []
        for (const w0 of ways) {
          if (!w0.geometry || w0.geometry.length < 2) continue
          const coords = w0.geometry.map((g) => [g.lon, g.lat])
          const vStr = w0.tags?.voltage
          const v = typeof vStr === "string"
            ? parseInt(vStr.split(/[;,]/)[0], 10)
            : Number(vStr) || 0
          features.push({
            type: "Feature",
            properties: {
              id: `osm-way-${w0.id}`,
              v: v || 0,
              op: w0.tags?.operator || null,
              n: w0.tags?.name || null,
              status: "Active",
              src: "osm",
            },
            geometry: { type: "LineString", coordinates: coords },
          })
        }
        log(`OSM [${idx}/${tiles.length}] (${s},${w}→${n},${e}) +${ways.length}  total ${features.length.toLocaleString()}`)
        ok = true
        break
      } catch (e) {
        await sleep(2000)
      }
    }
    if (!ok) log(`OSM [${idx}/${tiles.length}] all endpoints failed`)
    await sleep(1000)
  }
  log(`OSM: ${features.length.toLocaleString()} features`)
  return features
}

// ─── Source 3: MINDEX (optional) ───────────────────────────────────────────
async function harvestMindex() {
  if (!process.env.MINDEX_API_URL) return []
  const base = process.env.MINDEX_API_URL
  const key = process.env.MINDEX_API_KEY || "local-dev-key"
  try {
    const url = `${base}/api/mindex/earth/map/bbox?layer=transmission_lines&lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&limit=500000`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(60_000),
      headers: { "X-API-Key": key, Accept: "application/json" },
    })
    if (!res.ok) { log(`MINDEX: HTTP ${res.status}`); return [] }
    const j = await res.json()
    const items = j.entities || j.features || []
    const out = []
    for (const it of items) {
      const geom = it.geometry || (it.route && { type: "LineString", coordinates: it.route })
      if (!geom) continue
      out.push({
        type: "Feature",
        properties: {
          id: it.id || `mindex-${out.length}`,
          v: Number(it.voltage_v || it.voltage_kv * 1000) || 0,
          op: it.operator || null,
          n: it.name || null,
          status: it.status || "Active",
          src: "mindex",
        },
        geometry: geom,
      })
    }
    log(`MINDEX: ${out.length} features`)
    return out
  } catch (e) { log(`MINDEX: ERROR ${e.message}`); return [] }
}

// ─── Orchestrate + write (stream) ──────────────────────────────────────────
async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  log(`Output: ${OUT_FILE}`)
  log(`Sources: HIFLD=${!SKIP_HIFLD}  OSM=${!SKIP_OSM}  MINDEX=${!SKIP_MINDEX}`)

  const [hifld, osm, mindex] = await Promise.all([
    SKIP_HIFLD ? [] : fetchHifldFull().catch((e) => { log("HIFLD failed:", e.message); return [] }),
    SKIP_OSM ? [] : harvestOSM().catch((e) => { log("OSM failed:", e.message); return [] }),
    SKIP_MINDEX ? [] : harvestMindex().catch((e) => { log("MINDEX failed:", e.message); return [] }),
  ])

  // Merge keyed by id — HIFLD wins over OSM wins over MINDEX on collision.
  // For multi-source overlap we do nothing clever: just concat. Tippecanoe's
  // `--coalesce-smallest-as-needed` will drop duplicates geometrically.
  const features = [...hifld, ...osm, ...mindex]

  // Guard: never overwrite a non-empty bundle with zero features.
  if (features.length === 0 && !args.has("--allow-empty")) {
    try {
      const existing = await fs.readFile(OUT_FILE, "utf8")
      const matches = existing.match(/"type":"Feature"/g)
      const existingCount = matches ? matches.length : 0
      if (existingCount > 0) {
        log(`ABORT: harvest yielded 0 features but existing file has ${existingCount} — refusing overwrite.`)
        process.exit(2)
      }
    } catch {}
  }

  log(`writing ${features.length.toLocaleString()} features (streaming)...`)
  const stream = createWriteStream(OUT_FILE, { encoding: "utf8" })
  const write = (chunk) =>
    new Promise((res) => (stream.write(chunk) ? res() : stream.once("drain", res)))
  const meta = {
    generatedAt: new Date().toISOString(),
    sources: { hifld: hifld.length, osm: osm.length, mindex: mindex.length, total: features.length },
  }
  await write(`{"type":"FeatureCollection","generatedAt":${JSON.stringify(meta.generatedAt)},"sources":${JSON.stringify(meta.sources)},"features":[`)
  for (let i = 0; i < features.length; i++) {
    if (i > 0) await write(",")
    await write(JSON.stringify(features[i]))
    if (i > 0 && i % 10000 === 0) log(`  ...wrote ${i.toLocaleString()}/${features.length.toLocaleString()}`)
  }
  await write("]}\n")
  await new Promise((res) => stream.end(res))
  log(`✓ wrote ${features.length.toLocaleString()} features to ${OUT_FILE}`)
  log(`  Next: bash scripts/etl/crep/gen-transmission-pmtiles.sh`)
}

main().catch((e) => { console.error(e); process.exit(1) })
