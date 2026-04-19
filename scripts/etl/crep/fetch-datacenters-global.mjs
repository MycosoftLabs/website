#!/usr/bin/env node
/**
 * Global Data Centers Harvester — Apr 19, 2026
 *
 * Morgan: "the square glowing data centers seen on opengridworks needs
 * to be added to crep in full globally". CREP's current bundle is
 * MAJOR_DATACENTERS (44 hyperscale points). OpenGridWorks displays
 * ~5,000+ global data centers. This ETL pulls the comprehensive set.
 *
 * Sources (fail-isolated):
 *   1. OpenStreetMap (Overpass) — man_made=data_center | telecom=data_center
 *      Global coverage, free, no key. ~4-6k features depending on area.
 *      Sharded by 30° bboxes.
 *   2. PeeringDB — public JSON API at https://peeringdb.com/api/fac
 *      Peering Facilities = data centers + Internet exchange points.
 *      ~3k records, global, no key for read-only.
 *   3. MINDEX data_centers layer (LAN).
 *
 * Output: public/data/crep/data-centers-global.geojson
 */

import { promises as fs, createWriteStream } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const ROOT = path.resolve(path.dirname(__filename), "..", "..", "..")
const OUT_DIR = path.join(ROOT, "public", "data", "crep")
const OUT_FILE = path.join(OUT_DIR, "data-centers-global.geojson")

const args = new Set(process.argv.slice(2))
const SKIP_OSM = args.has("--no-osm")
const SKIP_PEERINGDB = args.has("--no-peeringdb")
const SKIP_MINDEX = args.has("--no-mindex") || !process.env.MINDEX_API_URL

const log = (...a) => console.log(`[${new Date().toISOString().substring(11, 19)}]`, ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ─── Source 1: OSM (Overpass) ──────────────────────────────────────────────
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
]

async function overpassFetch(endpoint, query, timeoutMs = 180_000) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function harvestOSM() {
  const features = []
  const tiles = []
  for (let lat = -60; lat < 85; lat += 30) {
    for (let lng = -180; lng < 180; lng += 30) {
      tiles.push([lat, lng, Math.min(lat + 30, 85), Math.min(lng + 30, 180)])
    }
  }
  log(`OSM data centers: ${tiles.length} tiles`)
  for (let i = 0; i < tiles.length; i++) {
    const [s, w, n, e] = tiles[i]
    const q = `[out:json][timeout:100];(` +
      `node["man_made"="data_center"](${s},${w},${n},${e});` +
      `way["man_made"="data_center"](${s},${w},${n},${e});` +
      `relation["man_made"="data_center"](${s},${w},${n},${e});` +
      `node["telecom"="data_center"](${s},${w},${n},${e});` +
      `way["telecom"="data_center"](${s},${w},${n},${e});` +
      `);out center;`
    for (const ep of OVERPASS_ENDPOINTS) {
      try {
        const j = await overpassFetch(ep, q)
        const before = features.length
        for (const el of (j.elements || [])) {
          const lat = el.lat ?? el.center?.lat
          const lng = el.lon ?? el.center?.lon
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
          features.push({
            type: "Feature",
            properties: {
              id: `osm-${el.type}-${el.id}`,
              n: el.tags?.name ?? null,
              op: el.tags?.operator ?? null,
              tier: el.tags?.tier ?? null,
              src: "osm",
            },
            geometry: { type: "Point", coordinates: [lng, lat] },
          })
        }
        log(`  OSM [${i + 1}/${tiles.length}] (${s},${w}→${n},${e}) +${features.length - before}`)
        break
      } catch {
        await sleep(1500)
      }
    }
    await sleep(800)
  }
  log(`OSM: ${features.length} data centers`)
  return features
}

// ─── Source 2: PeeringDB ───────────────────────────────────────────────────
async function harvestPeeringDB() {
  try {
    const url = "https://peeringdb.com/api/fac?limit=5000"
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(45_000),
    })
    if (!res.ok) { log(`PeeringDB: HTTP ${res.status}`); return [] }
    const j = await res.json()
    const items = j?.data || []
    const out = []
    for (const f of items) {
      if (!Number.isFinite(f.latitude) || !Number.isFinite(f.longitude)) continue
      out.push({
        type: "Feature",
        properties: {
          id: `peeringdb-${f.id}`,
          n: f.name,
          op: f.org_name || f.organization || null,
          address: f.address1 || null,
          city: f.city || null,
          country: f.country || null,
          clli: f.clli || null,
          tier: null,
          src: "peeringdb",
        },
        geometry: { type: "Point", coordinates: [f.longitude, f.latitude] },
      })
    }
    log(`PeeringDB: ${out.length} facilities`)
    return out
  } catch (e) { log(`PeeringDB: ERROR ${e.message}`); return [] }
}

// ─── Source 3: MINDEX ──────────────────────────────────────────────────────
async function harvestMindex() {
  if (!process.env.MINDEX_API_URL) return []
  try {
    const url = `${process.env.MINDEX_API_URL}/api/mindex/earth/map/bbox?layer=data_centers&lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&limit=100000`
    const res = await fetch(url, {
      headers: { "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key", Accept: "application/json" },
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items = j.entities || j.features || []
    return items.map((it, i) => {
      const lat = it.lat ?? it.latitude ?? it.geometry?.coordinates?.[1]
      const lng = it.lng ?? it.longitude ?? it.geometry?.coordinates?.[0]
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      return {
        type: "Feature",
        properties: {
          id: it.id || `mindex-${i}`,
          n: it.name || null,
          op: it.operator || null,
          tier: it.tier || null,
          src: "mindex",
        },
        geometry: { type: "Point", coordinates: [lng, lat] },
      }
    }).filter(Boolean)
  } catch { return [] }
}

// ─── Merge + stream write ──────────────────────────────────────────────────
async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  log(`Output: ${OUT_FILE}`)
  log(`Sources: OSM=${!SKIP_OSM}  PeeringDB=${!SKIP_PEERINGDB}  MINDEX=${!SKIP_MINDEX}`)

  const [osm, pdb, mx] = await Promise.all([
    SKIP_OSM ? [] : harvestOSM().catch((e) => { log("OSM failed:", e.message); return [] }),
    SKIP_PEERINGDB ? [] : harvestPeeringDB().catch((e) => { log("PeeringDB failed:", e.message); return [] }),
    SKIP_MINDEX ? [] : harvestMindex().catch((e) => { log("MINDEX failed:", e.message); return [] }),
  ])

  // Dedup by 4-decimal lat/lng (11 m grid). Prefer PeeringDB (rich fields),
  // then OSM, then MINDEX.
  const rank = { peeringdb: 3, osm: 2, mindex: 1 }
  const merged = new Map()
  const add = (f) => {
    const [lng, lat] = f.geometry.coordinates
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
    const existing = merged.get(key)
    if (!existing) { merged.set(key, f); return }
    if ((rank[f.properties.src] || 0) > (rank[existing.properties.src] || 0)) {
      merged.set(key, f)
    }
  }
  for (const arr of [pdb, osm, mx]) for (const f of arr) add(f)
  const features = Array.from(merged.values())

  if (features.length === 0 && !args.has("--allow-empty")) {
    try {
      const existing = await fs.readFile(OUT_FILE, "utf8")
      const c = (existing.match(/"type":"Feature"/g) || []).length
      if (c > 0) { log(`ABORT: harvest 0; existing has ${c}`); process.exit(2) }
    } catch {}
  }

  log(`writing ${features.length.toLocaleString()} features (streaming)...`)
  const stream = createWriteStream(OUT_FILE, { encoding: "utf8" })
  const write = (chunk) => new Promise((res) => (stream.write(chunk) ? res() : stream.once("drain", res)))
  await write(`{"type":"FeatureCollection","generatedAt":${JSON.stringify(new Date().toISOString())},"sources":{"osm":${osm.length},"peeringdb":${pdb.length},"mindex":${mx.length},"merged":${features.length}},"features":[`)
  for (let i = 0; i < features.length; i++) {
    if (i > 0) await write(",")
    await write(JSON.stringify(features[i]))
  }
  await write("]}\n")
  await new Promise((res) => stream.end(res))
  log(`✓ wrote ${features.length.toLocaleString()} features to ${OUT_FILE}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
