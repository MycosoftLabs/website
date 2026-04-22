#!/usr/bin/env node
/**
 * Bake Eagle Eye camera registry — Apr 22, 2026
 *
 * Morgan: "cameras are PERMANENT assets and shouldn't depend on API pulls.
 * the icon of camera should be hard coded in map unless update shows its
 * gone".
 *
 * Hits /api/eagle/sources (live fan-out to all connectors + MINDEX) once
 * and writes the result to public/data/crep/eagle-cameras-registry.geojson.
 * That static file is then loaded instantly by the eagle-eye-overlay at
 * map-mount time — ~3,900 camera markers paint in tens of milliseconds
 * instead of 10-30 s API latency.
 *
 * The overlay still polls /api/eagle/sources every 5 min for deltas:
 *   - New cameras appear
 *   - stream_url changes (Shinobi → MediaMTX swap)
 *   - source_status: "offline" flips an icon
 *   - Removed cameras fade after 48 h without a sighting
 *
 * Run locally / on sandbox / in CI:
 *   node scripts/etl/crep/bake-eagle-cameras-registry.mjs
 *   EAGLE_BAKE_BASE_URL=https://sandbox.mycosoft.com node scripts/etl/crep/bake-eagle-cameras-registry.mjs
 *
 * npm: `npm run etl:bake-cameras`
 *
 * Env:
 *   EAGLE_BAKE_BASE_URL — default http://127.0.0.1:3010
 *   EAGLE_BAKE_BBOX     — default wide US+BAJA (passes through to route)
 *   EAGLE_BAKE_OUT      — default public/data/crep/eagle-cameras-registry.geojson
 */

import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const BASE = (process.env.EAGLE_BAKE_BASE_URL || "http://127.0.0.1:3010").replace(/\/$/, "")
const BBOX = process.env.EAGLE_BAKE_BBOX || "-125,32,-114,42"
const OUT = process.env.EAGLE_BAKE_OUT ||
  path.resolve(process.cwd(), "public", "data", "crep", "eagle-cameras-registry.geojson")

const log = (...a) => console.log("[bake-cameras]", ...a)

async function getJson(url) {
  const t0 = Date.now()
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(120_000),
  })
  const text = await res.text()
  const ms = Date.now() - t0
  if (!res.ok) throw new Error(`HTTP ${res.status} after ${ms}ms: ${text.slice(0, 200)}`)
  return { j: JSON.parse(text), ms }
}

async function main() {
  log(`base=${BASE} bbox=${BBOX}`)
  log("step 1/2 — ?live=1&fast=1 (fast tier)")
  try {
    const r = await getJson(`${BASE}/api/eagle/sources?live=1&fast=1&limit=50000&bbox=${encodeURIComponent(BBOX)}`)
    log(`  ${r.j.total ?? 0} cameras, ${r.ms} ms`)
  } catch (e) {
    log(`  fast tier failed: ${e.message}`)
  }

  log("step 2/2 — ?live=1 (full — Caltrans + NYSDOT + Shinobi)")
  const { j, ms } = await getJson(`${BASE}/api/eagle/sources?live=1&limit=50000&bbox=${encodeURIComponent(BBOX)}`)
  const sources = j.sources || j.cams || []
  log(`  ${sources.length} cameras, ${ms} ms, providers: ${JSON.stringify(j.by_provider || {})}`)

  const features = sources
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
    .map((s) => ({
      type: "Feature",
      properties: {
        id: String(s.id),
        provider: s.provider || "unknown",
        kind: s.kind || "permanent",
        name: s.name || s.id || "",
        stream_url: s.stream_url ?? null,
        embed_url: s.embed_url ?? null,
        media_url: s.media_url ?? null,
        status: s.source_status ?? "online",
        location_confidence: s.location_confidence ?? 1,
      },
      geometry: {
        type: "Point",
        coordinates: [Number(s.lng), Number(s.lat)],
      },
    }))

  const fc = {
    type: "FeatureCollection",
    baked_at: new Date().toISOString(),
    total: features.length,
    by_provider: j.by_provider || {},
    features,
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(fc), "utf8")
  const bytes = fs.statSync(OUT).size
  log(`wrote ${OUT} (${(bytes / 1024).toFixed(0)} KB, ${features.length} cameras)`)
}

main().catch((e) => {
  console.error("[bake-cameras] fatal:", e)
  process.exit(1)
})
