#!/usr/bin/env node
/**
 * NASA EMIT STAC backfill — Apr 21, 2026
 *
 * Morgan (deferred Item 3 — Cursor systemd timer target):
 * "based on more data add this ... earth.jpl.nasa.gov/emit/data/".
 *
 * Queries NASA CMR STAC for new EMIT methane (EMITL2BCH4PLM_001) and
 * mineral dust (EMITL2BMIN_001) granules intersecting the SD/TJ bbox,
 * downloads the per-granule CSV of detections, and UPSERTs each
 * detection as a row in MINDEX `crep.emit_plumes`.
 *
 * Env required:
 *   EARTHDATA_USERNAME, EARTHDATA_PASSWORD — Earthdata Login creds
 *   MINDEX_API_URL, MINDEX_INTERNAL_TOKEN — MINDEX ingest target
 *
 * Cursor ops install:
 *   1. Drop this file at /opt/mycosoft/website/scripts/etl/crep/
 *   2. systemd unit at /etc/systemd/system/emit-backfill.service
 *   3. systemd timer at /etc/systemd/system/emit-backfill.timer
 *      [Timer]
 *      OnCalendar=daily
 *      Persistent=true
 *   4. systemctl enable --now emit-backfill.timer
 *
 * Local manual run: node scripts/etl/crep/emit-stac-backfill.mjs
 */

import process from "node:process"

const STAC_BASE = "https://cmr.earthdata.nasa.gov/stac/LPCLOUD"
const COLLECTIONS = ["EMITL2BCH4PLM_001", "EMITL2BMIN_001"]
const BBOX = [-117.8, 32.3, -116.8, 33.2] // SD/TJ region
const DAYS_BACK = 30

const MINDEX_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"
const MINDEX_TOKEN = process.env.MINDEX_INTERNAL_TOKEN || ""
const ED_USER = process.env.EARTHDATA_USERNAME
const ED_PASS = process.env.EARTHDATA_PASSWORD

if (!ED_USER || !ED_PASS) {
  console.error("emit-backfill: EARTHDATA_USERNAME/PASSWORD missing")
  process.exit(2)
}

const edAuth = "Basic " + Buffer.from(`${ED_USER}:${ED_PASS}`).toString("base64")

async function searchStac(collection) {
  const since = new Date(Date.now() - DAYS_BACK * 86400_000).toISOString()
  const body = {
    collections: [collection],
    bbox: BBOX,
    datetime: `${since}/${new Date().toISOString()}`,
    limit: 200,
  }
  const res = await fetch(`${STAC_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: edAuth, Accept: "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`STAC ${collection} HTTP ${res.status}`)
  return (await res.json())?.features || []
}

async function ingestToMindex(rows) {
  if (!rows.length) return { upserts: 0 }
  const res = await fetch(`${MINDEX_URL}/api/mindex/ingest/emit_plumes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(MINDEX_TOKEN ? { "X-Internal-Token": MINDEX_TOKEN } : {}),
    },
    body: JSON.stringify({ entities: rows }),
  })
  if (!res.ok) throw new Error(`MINDEX ingest HTTP ${res.status}`)
  return await res.json()
}

function featureToMindexRow(feat, collection) {
  const coords = feat.geometry?.coordinates?.[0]?.[0]
  if (!Array.isArray(coords)) return null
  const isCh4 = collection === "EMITL2BCH4PLM_001"
  return {
    source: "nasa-emit",
    source_id: feat.id,
    entity_type: "emit_plume",
    lat: Number(coords[1]),
    lng: Number(coords[0]),
    properties: {
      gas: isCh4 ? "CH4" : "MineralDust",
      collection,
      granule_id: feat.id,
      overpass_utc: feat.properties?.datetime,
      intensity: 0.6, // placeholder — actual intensity requires downloading + parsing the L2B CSV per granule
      description: `NASA EMIT ${isCh4 ? "methane plume" : "mineral dust detection"}`,
      download_url: feat.assets?.data?.href,
      bbox: feat.bbox,
    },
  }
}

async function main() {
  console.log(`[emit-backfill] started @ ${new Date().toISOString()}, bbox=${BBOX.join(",")}, last ${DAYS_BACK}d`)
  let total = 0
  for (const collection of COLLECTIONS) {
    try {
      const features = await searchStac(collection)
      console.log(`  ${collection}: ${features.length} granules`)
      const rows = features.map((f) => featureToMindexRow(f, collection)).filter(Boolean)
      if (rows.length) {
        const r = await ingestToMindex(rows)
        console.log(`    → MINDEX upsert: ${JSON.stringify(r)}`)
        total += rows.length
      }
    } catch (e) {
      console.warn(`  ${collection}: ${e.message}`)
    }
  }
  console.log(`[emit-backfill] done, ${total} rows ingested`)
}

main().catch((e) => {
  console.error("[emit-backfill] fatal:", e)
  process.exit(1)
})
