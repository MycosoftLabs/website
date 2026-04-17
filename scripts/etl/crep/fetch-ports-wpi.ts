/**
 * World Port Index (NGA Pub 150) → public/data/crep/ports-global.geojson
 *
 * Source: NGA Maritime Safety Office — PUBLIC DOMAIN (US Govt).
 * ~3,660 seaports globally with UN/LOCODE, harbor size, max draft, etc.
 *
 * Run: `npx tsx scripts/etl/crep/fetch-ports-wpi.ts`
 *
 * Feeds: getAllPorts() via static bundle source.
 * Also POSTs to MINDEX /api/mindex/ingest/ports so we hold the registry.
 */

import fs from "node:fs"
import path from "node:path"

// Primary WPI source — NGA Maritime Safety Information, CSV + GeoJSON download
// The GeoJSON flavor is stable and does not need auth.
const WPI_URL = "https://msi.nga.mil/api/publications/download?type=view&key=16920959/SFH00000/UpdatedPub150.geojson"
// NGA often blocks automated GeoJSON (403) while the same publication key works for CSV (verified 2026-04).
const WPI_CSV_URL = "https://msi.nga.mil/api/publications/download?type=view&key=16920959/SFH00000/UpdatedPub150.csv"
// Fallback mirrors (NGA changes keys occasionally)
const FALLBACK_URLS = [
  "https://msi.nga.mil/api/publications/download?type=view&key=16694622/SFH00000/UpdatedPub150.geojson",
  "https://raw.githubusercontent.com/newzealandpaul/Maritime-Port-Data/master/ports.geojson",
]

const OUT_PATH = path.resolve(process.cwd(), "public/data/crep/ports-global.geojson")

async function fetchFirst(urls: string[]): Promise<any | null> {
  for (const url of urls) {
    try {
      console.log(`[ports-etl] trying ${url.slice(0, 80)}…`)
      const res = await fetch(url, { headers: { "User-Agent": "MycosoftCREPETL/1.0" } })
      if (!res.ok) { console.log(`  → HTTP ${res.status}`); continue }
      const j = await res.json()
      if (!j || !Array.isArray(j.features) || j.features.length < 100) {
        console.log(`  → payload invalid or too small (${j?.features?.length || 0} features)`)
        continue
      }
      console.log(`  → ${j.features.length} ports`)
      return j
    } catch (e: any) {
      console.log(`  → fetch failed: ${e?.message || e}`)
    }
  }
  return null
}

/** Minimal CSV row parser (handles quoted fields with commas). */
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && c === ",") {
      out.push(cur)
      cur = ""
      continue
    }
    cur += c
  }
  out.push(cur)
  return out
}

async function fetchWpiFromCsv(url: string): Promise<{ type: string; features: any[] } | null> {
  console.log(`[ports-etl] trying CSV ${url.slice(0, 80)}…`)
  const res = await fetch(url, { headers: { "User-Agent": "MycosoftCREPETL/1.0" } })
  if (!res.ok) {
    console.log(`  → HTTP ${res.status}`)
    return null
  }
  const text = await res.text()
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length < 2) return null

  const headerRaw = parseCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim())
  const idx = (name: string) => headerRaw.indexOf(name)

  const iLat = idx("Latitude")
  const iLon = idx("Longitude")
  const iWpi = idx("World Port Index Number")
  const iName = idx("Main Port Name")
  const iLocode = idx("UN/LOCODE")
  const iCc = idx("Country Code")
  const iDepth = idx("Channel Depth (m)")
  const iHarborSize = idx("Harbor Size")
  const iHarborType = idx("Harbor Type")
  const iShelter = idx("Shelter Afforded")
  const iContainer = idx("Facilities - Container")

  if (iLat < 0 || iLon < 0) {
    console.log("[ports-etl] CSV missing Latitude/Longitude columns")
    return null
  }

  const features: any[] = []
  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvLine(lines[li])
    const lat = parseFloat(cols[iLat] || "")
    const lng = parseFloat(cols[iLon] || "")
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (Math.abs(lat) < 1e-6 && Math.abs(lng) < 1e-6) continue

    const wpiNum = iWpi >= 0 ? cols[iWpi] : ""
    const containerCell = iContainer >= 0 ? (cols[iContainer] || "").toLowerCase() : ""

    features.push({
      type: "Feature",
      properties: {
        id: wpiNum || `wpi-${li}`,
        name: iName >= 0 ? (cols[iName] || "").trim() || "Unknown Port" : "Unknown Port",
        country: iCc >= 0 ? (cols[iCc] || "").trim().slice(0, 2).toUpperCase() : "",
        unlocode: iLocode >= 0 ? (cols[iLocode] || "").trim() : undefined,
        harborSize: iHarborSize >= 0 ? cols[iHarborSize] : undefined,
        harborType: iHarborType >= 0 ? cols[iHarborType] : undefined,
        shelterAfforded: iShelter >= 0 ? cols[iShelter] : undefined,
        maxDraft_m: iDepth >= 0 ? parseFloat(cols[iDepth] || "") : undefined,
        containerFacility: containerCell === "yes",
        source: "WPI/NGA Pub 150",
      },
      geometry: { type: "Point", coordinates: [lng, lat] },
    })
  }

  if (features.length < 100) {
    console.log(`  → CSV parsed too few ports (${features.length})`)
    return null
  }
  console.log(`  → ${features.length} ports (from CSV)`)
  return { type: "FeatureCollection", features }
}

function normalizeFeature(f: any, i: number): any {
  const p = f.properties || {}
  // NGA WPI keys are UPPER_CASE; Maritime-Port-Data uses Title_Case
  return {
    type: "Feature",
    properties: {
      id: p.INDEX_NO || p.PORT_NUMBER || p.id || `wpi-${i}`,
      name: p.PORT_NAME || p.Main_Port_Name || p.name || "Unknown Port",
      city: p.CITY_NAME || p.City,
      country: (p.COUNTRY || p.Country_Code || p.country || "").toString().slice(0, 2).toUpperCase(),
      unlocode: p.UN_LOCODE || p.UNLOCODE,
      harborSize: p.HARBOR_SIZE || p.Harbor_Size,
      harborType: p.HARBOR_TYPE,
      shelterAfforded: p.SHELTER_AFFORDED,
      maxDraft_m: typeof p.MAX_DRAFT === "number" ? p.MAX_DRAFT
                : (typeof p.Channel_Depth === "string" ? parseFloat(p.Channel_Depth) : undefined),
      anchorageDepth_m: typeof p.ANCHORAGE_DEPTH === "number" ? p.ANCHORAGE_DEPTH : undefined,
      cargoPier: (p.CARGO_PIER === "Y" || p.Cargo_Pier_Depth_ft > 0),
      containerFacility: p.CONTAINER === "Y" || p.containerFacility === true,
      source: "WPI/NGA Pub 150",
    },
    geometry: f.geometry,
  }
}

async function main() {
  let wpi = await fetchFirst([WPI_URL, ...FALLBACK_URLS])
  if (!wpi) {
    wpi = await fetchWpiFromCsv(WPI_CSV_URL)
  }
  if (!wpi) {
    console.error("[ports-etl] all sources failed — existing file (if any) left untouched")
    process.exit(1)
  }

  const features = wpi.features.map(normalizeFeature)
  const bundle = {
    type: "FeatureCollection",
    metadata: {
      source: "NGA World Port Index (Pub 150) — public domain",
      fetchedAt: new Date().toISOString(),
      portCount: features.length,
    },
    features,
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify(bundle))
  console.log(`[ports-etl] wrote ${features.length} ports → ${OUT_PATH}`)

  // Optional: push to MINDEX as the authoritative registry
  const mindexUrl = process.env.MINDEX_URL || process.env.NEXT_PUBLIC_MINDEX_URL
  if (mindexUrl) {
    try {
      const res = await fetch(`${mindexUrl}/api/mindex/ingest/ports`, {
        method: "POST",
        headers: { "Content-Type": "application/json",
                   "x-mindex-token": process.env.MINDEX_INGEST_TOKEN || "" },
        body: JSON.stringify({ source: "WPI/NGA", ports: features.map((f: any) => ({ ...f.properties, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] })) }),
      })
      console.log(`[ports-etl] MINDEX ingest: ${res.status}`)
    } catch (e: any) {
      console.log(`[ports-etl] MINDEX push failed: ${e?.message}`)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
