#!/usr/bin/env node
/**
 * Warm / re-seed MINDEX `eagle.video_sources` — Apr 22, 2026
 *
 * The Next route `/api/eagle/sources` bulk-upserts live connector output to
 * MINDEX when `live=1` and `MINDEX_INTERNAL_TOKEN` or `MINDEX_API_KEY` is set.
 * Run this against a **running** dev or prod site to populate the warm cache
 * after DB restore / empty table — first request ~2–20s depending on Caltrans.
 *
 * Usage (from website repo):
 *   node scripts/ops/warm-eagle-mindex.mjs
 *   EAGLE_WARM_BASE_URL=https://sandbox.mycosoft.com node scripts/ops/warm-eagle-mindex.mjs
 *
 * Env:
 *   EAGLE_WARM_BASE_URL  — default http://127.0.0.1:3010
 *   EAGLE_WARM_BBOX      — default W,S,E,N = continental US + Baja (wide SD coverage)
 *
 * Bbox is passed to /api/eagle/sources so state-dot-cctv (Caltrans) + others
 * return cameras for the region; the route persists the merged set to MINDEX.
 */

import process from "node:process"

const BASE = (process.env.EAGLE_WARM_BASE_URL || "http://127.0.0.1:3010").replace(/\/$/, "")
const BBOX = process.env.EAGLE_WARM_BBOX || "-125,32,-114,42"

const log = (...a) => console.log(`[warm-eagle-mindex]`, ...a)

async function get(path) {
  const url = `${BASE}${path}`
  const t0 = Date.now()
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(120_000),
  })
  const ms = Date.now() - t0
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { _raw: text.slice(0, 200) }
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url} (${ms}ms): ${text.slice(0, 300)}`)
  }
  return { json, ms, url }
}

async function main() {
  log("Base:", BASE, "bbox:", BBOX)

  // Step 1: fast tier — warms MINDEX with ~96+ cams quickly (overlaps with step 2)
  log("Step 1: fast tier (?fast=1&live=1)…")
  const r1 = await get(
    `/api/eagle/sources?bbox=${encodeURIComponent(BBOX)}&live=1&fast=1&limit=50000`,
  )
  const t1 = r1.json?.total ?? r1.json?.sources?.length ?? "?"
  log(`  → ${t1} sources in ${r1.ms}ms`, r1.url)

  // Step 2: full tier (Caltrans + Shinobi) — blocks up to 120s; persists via route after()
  log("Step 2: full tier (live=1, all connectors)…")
  const r2 = await get(
    `/api/eagle/sources?bbox=${encodeURIComponent(BBOX)}&live=1&limit=50000`,
  )
  const t2 = r2.json?.total ?? r2.json?.sources?.length ?? "?"
  log(`  → ${t2} sources in ${r2.ms}ms`, r2.url)
  log("Done. Verify MINDEX: GET {MINDEX}/api/mindex/eagle/health/stats")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
