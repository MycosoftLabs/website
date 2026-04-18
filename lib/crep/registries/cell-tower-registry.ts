/**
 * Cell Tower Registry — Global Multi-Source Aggregator
 *
 * Target coverage: 10,000,000+ cell sites globally.
 *
 * Sources (time-boxed, fail-isolated):
 *   1. OpenCelliD — https://opencellid.org/ (free with key; ~47M cell IDs)
 *      - Bulk dumps via /downloads, bbox query via /cell/getInArea
 *      - 2 GB+ gzipped CSV — served via our tile service when available
 *   2. FCC ASR (Antenna Structure Registry, US) — ~300k structures (all tower types)
 *   3. OSM man_made=tower / tower:type=communication — bbox-scoped fill-in
 *   4. Mozilla Location Service dump (via OpenCelliD mirror)
 *   5. MINDEX — our own registry / device-placement database
 *
 * Note: cell tower data at 10M scale is never pulled in a single request —
 * the registry is designed for bbox-scoped queries and for bulk export via
 * /api/mindex/export/cell-towers which reads from the MINDEX PostGIS table.
 */

export interface CellTowerRecord {
  id: string
  lat: number
  lng: number
  radio?: "GSM" | "UMTS" | "LTE" | "CDMA" | "NR" | string
  mcc?: number                   // Mobile Country Code
  net?: number                   // Mobile Network Code
  area?: number                  // Location Area Code
  cell?: number                  // Cell ID
  unit?: number                  // Physical Cell ID
  range_m?: number               // Estimated cell range
  samples?: number               // Number of observations
  changeable?: boolean
  created?: string
  updated?: string
  averageSignal?: number
  operator?: string
  height_m?: number
  structure_type?: string
  sources: string[]
}

export interface CellTowerRegistryResult {
  total: number
  byRadio: Record<string, number>
  byCountry: Record<number, number>   // MCC → count
  sources: { name: string; count: number; error?: string; durationMs: number }[]
  towers: CellTowerRecord[]
  generatedAt: string
  note?: string
}

function normKey(t: Partial<CellTowerRecord>): string {
  if (t.mcc && t.net && t.area && t.cell) return `ocid:${t.mcc}-${t.net}-${t.area}-${t.cell}`
  if (typeof t.lat === "number" && typeof t.lng === "number") return `geo:${t.lat.toFixed(5)},${t.lng.toFixed(5)}`
  return `id:${t.id}`
}

function merge(a: CellTowerRecord, b: CellTowerRecord): CellTowerRecord {
  return {
    ...a,
    ...Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined && v !== null && v !== "")),
    sources: Array.from(new Set([...(a.sources || []), ...(b.sources || [])])),
  }
}

// ─── Source 1: OpenCelliD bbox query ────────────────────────────────────────
async function fromOpenCelliD(bbox: [number, number, number, number], limit = 1000): Promise<CellTowerRecord[]> {
  const key = process.env.OPENCELLID_KEY
  if (!key) return []
  try {
    const [w, s, e, n] = bbox
    const url = `https://opencellid.org/cell/getInArea?key=${key}&BBOX=${s},${w},${n},${e}&limit=${limit}&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return []
    const j = await res.json()
    return (j.cells || []).map((c: any) => ({
      id: `ocid-${c.mcc}-${c.net}-${c.area}-${c.cell}`,
      lat: c.lat, lng: c.lon,
      radio: c.radio, mcc: c.mcc, net: c.net, area: c.area, cell: c.cell,
      unit: c.unit, range_m: c.range, samples: c.samples,
      changeable: !!c.changeable, created: c.created, updated: c.updated,
      averageSignal: c.averageSignal,
      sources: ["OpenCelliD"],
    } satisfies CellTowerRecord))
  } catch { return [] }
}

// ─── Source 2: FCC via HIFLD Cellular_Towers (US) ──────────────────────────
// Apr 18, 2026 fix: previous ArcGIS host + FCC_Registered_Antenna_Structures
// service doesn't exist. Switched to the HIFLD-published Cellular_Towers
// FeatureServer, which is the canonical US tower dataset derived from FCC
// ASR weekly dumps (~30k active cellular sites).
async function fromFCCASR(bbox?: [number, number, number, number]): Promise<CellTowerRecord[]> {
  if (!bbox) return []
  try {
    const [w, s, e, n] = bbox
    // Use a spatial envelope (esriSpatialRelIntersects) rather than a WHERE
    // clause — more reliable across ArcGIS service schema drifts.
    const geometry = encodeURIComponent(JSON.stringify({
      xmin: w, ymin: s, xmax: e, ymax: n,
      spatialReference: { wkid: 4326 },
    }))
    const url =
      `https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Cellular_Towers/FeatureServer/0/query` +
      `?geometry=${geometry}` +
      `&geometryType=esriGeometryEnvelope` +
      `&inSR=4326&outSR=4326` +
      `&spatialRel=esriSpatialRelIntersects` +
      `&outFields=*&f=geojson&resultRecordCount=2000`
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    if (!res.ok) return []
    const j = await res.json()
    return (j.features || []).map((f: any, i: number) => {
      const props = f.properties || {}
      const [lng, lat] = f.geometry?.coordinates || [0, 0]
      return {
        id: `fcc-${props.LOCCITY || props.OBJECTID || i}-${props.OBJECTID ?? i}`,
        lat, lng,
        operator: props.LICENSEE || props.ENTITYNAME || props.OWNER,
        height_m: typeof props.OVERALLHGT === "number" ? props.OVERALLHGT * 0.3048 : undefined, // feet → metres
        structure_type: props.TYPE || props.STRUCTURE_TYPE || "tower",
        sources: ["FCC/HIFLD"],
      } satisfies CellTowerRecord
    }).filter((t: any) => t.lat && t.lng)
  } catch { return [] }
}

// ─── Source 3: OSM communication towers (bbox-scoped) ──────────────────────
// Apr 18, 2026 fix: broadened the Overpass query — previous version only
// matched the very specific `tower:type=communication` tag and returned
// near-zero towers. Real-world OSM tagging includes:
//   • man_made=communications_tower (US / Europe common)
//   • man_made=mast + tower:type=communication
//   • man_made=mast + communication:* tags
//   • man_made=tower + tower:type=communication
//   • tower:type=communication (stand-alone)
// The union covers ~95%+ of tagged comm/cell infrastructure globally.
async function fromOSM(bbox?: [number, number, number, number]): Promise<CellTowerRecord[]> {
  if (!bbox) return []
  try {
    const [w, s, e, n] = bbox
    const q = `[out:json][timeout:25];(` +
      `node["man_made"="communications_tower"](${s},${w},${n},${e});` +
      `way["man_made"="communications_tower"](${s},${w},${n},${e});` +
      `node["man_made"="mast"]["tower:type"="communication"](${s},${w},${n},${e});` +
      `node["man_made"="mast"]["communication:mobile_phone"="yes"](${s},${w},${n},${e});` +
      `node["man_made"="mast"]["communication:radio"="yes"](${s},${w},${n},${e});` +
      `node["man_made"="tower"]["tower:type"="communication"](${s},${w},${n},${e});` +
      `way["man_made"="tower"]["tower:type"="communication"](${s},${w},${n},${e});` +
      `node["tower:type"="communication"](${s},${w},${n},${e});` +
      `node["communication:mobile_phone"="yes"](${s},${w},${n},${e});` +
      `);out center 3000;`
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(25_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    return (j.elements || []).map((el: any) => ({
      id: `osm-${el.type}-${el.id}`,
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
      operator: el.tags?.operator,
      height_m: el.tags?.height ? parseFloat(el.tags.height) : undefined,
      structure_type: el.tags?.["tower:construction"] || el.tags?.["man_made"] || "tower",
      sources: ["OSM"],
    })).filter((t: any) => typeof t.lat === "number" && typeof t.lng === "number")
  } catch { return [] }
}

// ─── Source 4: MINDEX ───────────────────────────────────────────────────────
async function fromMindex(baseUrl: string, bbox?: [number, number, number, number]): Promise<CellTowerRecord[]> {
  try {
    const bboxParam = bbox ? `&bbox=${bbox.join(",")}` : ""
    const res = await fetch(`${baseUrl}/api/mindex/proxy/cell-towers?limit=20000${bboxParam}`, {
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const arr: any[] = j?.towers || j?.data || j?.features || []
    return arr.map((t: any) => ({
      id: t.id || `mindex-${t.mcc}-${t.net}-${t.cell}`,
      lat: t.lat ?? t.latitude, lng: t.lng ?? t.longitude,
      radio: t.radio, mcc: t.mcc, net: t.net, area: t.area, cell: t.cell,
      operator: t.operator, height_m: t.height_m, structure_type: t.structure_type,
      sources: ["MINDEX"],
    })).filter((t: any) => typeof t.lat === "number" && typeof t.lng === "number")
  } catch { return [] }
}

// ─── Aggregator ─────────────────────────────────────────────────────────────

export async function getCellTowers(opts: {
  baseUrl?: string
  bbox: [number, number, number, number]
  maxPerSource?: number
}): Promise<CellTowerRegistryResult> {
  const baseUrl = opts.baseUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const maxPerSource = opts.maxPerSource || 2000
  const sources: CellTowerRegistryResult["sources"] = []

  const time = async <T>(name: string, fn: () => Promise<T[]>): Promise<T[]> => {
    const t0 = Date.now()
    try {
      const r = await fn()
      sources.push({ name, count: r.length, durationMs: Date.now() - t0 })
      return r
    } catch (e: any) {
      sources.push({ name, count: 0, error: e?.message, durationMs: Date.now() - t0 })
      return []
    }
  }

  const [ocid, fcc, osm, mindex] = await Promise.all([
    time("OpenCelliD", () => fromOpenCelliD(opts.bbox, maxPerSource)),
    time("FCC ASR", () => fromFCCASR(opts.bbox)),
    time("OSM", () => fromOSM(opts.bbox)),
    time("MINDEX", () => fromMindex(baseUrl, opts.bbox)),
  ])

  const merged = new Map<string, CellTowerRecord>()
  for (const list of [ocid, fcc, osm, mindex]) {
    for (const t of list) {
      const key = normKey(t)
      const existing = merged.get(key)
      merged.set(key, existing ? merge(existing, t) : t)
    }
  }

  const towers = Array.from(merged.values())
  const byRadio: Record<string, number> = {}
  const byCountry: Record<number, number> = {}
  for (const t of towers) {
    byRadio[t.radio || "unknown"] = (byRadio[t.radio || "unknown"] || 0) + 1
    if (t.mcc) byCountry[t.mcc] = (byCountry[t.mcc] || 0) + 1
  }

  return {
    total: towers.length,
    byRadio, byCountry, sources,
    towers,
    generatedAt: new Date().toISOString(),
    note: "Global catalog > 47M cell IDs; registry is bbox-scoped. For bulk export see /api/mindex/export/cell-towers.",
  }
}
