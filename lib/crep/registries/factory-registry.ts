/**
 * Factory / Industrial Facility Registry — Global Multi-Source Aggregator
 *
 * Target coverage: global industrial facility catalog.
 *
 * Sources:
 *   1. Climate TRACE asset dataset — ~352M emissions-bearing assets
 *      (includes steel, cement, oil/gas, power, aviation, maritime). CC-BY 4.0
 *      https://climatetrace.org/data
 *   2. OSM man_made=works + landuse=industrial — ~500k globally
 *      bbox-scoped via Overpass; bulk via Geofabrik PBF + osmium
 *   3. GEM Global Steel Plant Tracker — ~1,500 steel plants (CC-BY)
 *   4. GEM Global Cement Tracker — ~3,500 cement plants (CC-BY)
 *   5. Carbon Majors DB — 180 major producers
 *   6. EPA FLIGHT (US GHG) — detailed US emissions facility data
 *   7. MINDEX — our own registry
 *
 * Most full catalogs are 100MB+; this registry is designed for bbox queries.
 */

export interface FactoryRecord {
  id: string
  name: string
  lat: number
  lng: number
  country: string
  industry: "steel" | "cement" | "chemicals" | "oil-gas" | "power" | "manufacturing" | "textile" | "pharmaceutical" | "food" | "auto" | "mining" | "works" | "other" | string
  subSector?: string
  operator?: string
  owner?: string
  capacity_tpy?: number            // annual tonnes (tpy) where known
  commissioningYear?: number
  emissions_tco2e?: number         // latest annual emissions
  status?: "operating" | "construction" | "retired" | "mothballed" | "proposed"
  sources: string[]
  emissionsYear?: number
}

export interface FactoryRegistryResult {
  total: number
  byIndustry: Record<string, number>
  byCountry: Record<string, number>
  sources: { name: string; count: number; error?: string; durationMs: number }[]
  factories: FactoryRecord[]
  generatedAt: string
}

function normKey(f: Partial<FactoryRecord>): string {
  if (typeof f.lat === "number" && typeof f.lng === "number") return `geo:${f.lat.toFixed(4)},${f.lng.toFixed(4)}`
  return `id:${f.id}`
}

function merge(a: FactoryRecord, b: FactoryRecord): FactoryRecord {
  return {
    ...a,
    ...Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined && v !== null && v !== "")),
    sources: Array.from(new Set([...(a.sources || []), ...(b.sources || [])])),
  }
}

// ─── Source 1: OSM Overpass (bbox only) ──────────────────────────────────────
async function fromOSM(bbox: [number, number, number, number]): Promise<FactoryRecord[]> {
  try {
    const [w, s, e, n] = bbox
    const q = `[out:json][timeout:30];(
      node["man_made"="works"](${s},${w},${n},${e});
      way["man_made"="works"](${s},${w},${n},${e});
      relation["man_made"="works"](${s},${w},${n},${e});
      way["landuse"="industrial"](${s},${w},${n},${e});
    );out center tags 3000;`
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(35_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    return (j.elements || []).map((el: any) => ({
      id: `osm-${el.type}-${el.id}`,
      name: el.tags?.name || el.tags?.operator || "Industrial Facility",
      lat: el.lat ?? el.center?.lat, lng: el.lon ?? el.center?.lon,
      country: (el.tags?.["addr:country"] || "").slice(0, 2).toUpperCase(),
      industry: inferIndustry(el.tags),
      operator: el.tags?.operator,
      subSector: el.tags?.industrial || el.tags?.product,
      sources: ["OSM"],
    } satisfies FactoryRecord)).filter((f: any) => f.lat && f.lng)
  } catch { return [] }
}

function inferIndustry(tags: any): FactoryRecord["industry"] {
  if (!tags) return "other"
  const t = Object.values(tags).join(" ").toLowerCase()
  if (t.includes("steel") || t.includes("foundry")) return "steel"
  if (t.includes("cement")) return "cement"
  if (t.includes("refinery") || t.includes("petrochem") || t.includes("oil") || t.includes("gas")) return "oil-gas"
  if (t.includes("chemical")) return "chemicals"
  if (t.includes("auto") || t.includes("motor")) return "auto"
  if (t.includes("pharma")) return "pharmaceutical"
  if (t.includes("textile")) return "textile"
  if (t.includes("food") || t.includes("dairy") || t.includes("bakery")) return "food"
  if (t.includes("mining") || t.includes("quarry")) return "mining"
  if (t.includes("works")) return "works"
  return "manufacturing"
}

// ─── Source 2: MINDEX ───────────────────────────────────────────────────────
async function fromMindex(baseUrl: string, bbox?: [number, number, number, number]): Promise<FactoryRecord[]> {
  try {
    const bboxParam = bbox ? `&bbox=${bbox.join(",")}` : ""
    const res = await fetch(`${baseUrl}/api/mindex/proxy/factories?limit=20000${bboxParam}`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const arr: any[] = j?.factories || j?.data || []
    return arr.map((f: any) => ({
      id: f.id, name: f.name, lat: f.lat ?? f.latitude, lng: f.lng ?? f.longitude,
      country: (f.country || "").slice(0, 2).toUpperCase(),
      industry: f.industry || "manufacturing",
      capacity_tpy: f.capacity_tpy, emissions_tco2e: f.emissions_tco2e,
      operator: f.operator, status: f.status || "operating",
      sources: ["MINDEX"],
    })).filter((f: any) => typeof f.lat === "number" && typeof f.lng === "number")
  } catch { return [] }
}

// ─── Source 3: Static bundle (GEM steel + cement) ───────────────────────────
async function fromStaticBundle(baseUrl: string): Promise<FactoryRecord[]> {
  try {
    const res = await fetch(`${baseUrl}/data/crep/factories-global.geojson`, { cache: "force-cache" })
    if (!res.ok) return []
    const fc = await res.json()
    return (fc?.features || []).map((f: any) => {
      const p = f.properties || {}
      const [lng, lat] = f.geometry?.coordinates || [0, 0]
      return {
        id: p.id, name: p.name, lat, lng, country: p.country,
        industry: p.industry, subSector: p.subSector, operator: p.operator,
        capacity_tpy: p.capacity_tpy, commissioningYear: p.commissioningYear,
        emissions_tco2e: p.emissions_tco2e, status: p.status,
        sources: [p.source || "static"],
      } satisfies FactoryRecord
    })
  } catch { return [] }
}

// ─── Aggregator ─────────────────────────────────────────────────────────────

export async function getAllFactories(opts?: {
  baseUrl?: string
  bbox?: [number, number, number, number]
}): Promise<FactoryRegistryResult> {
  const baseUrl = opts?.baseUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const sources: FactoryRegistryResult["sources"] = []

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

  const tasks: Promise<FactoryRecord[]>[] = [
    time("Static bundle (GEM + Climate TRACE seed)", () => fromStaticBundle(baseUrl)),
    time("MINDEX", () => fromMindex(baseUrl, opts?.bbox)),
  ]
  if (opts?.bbox) tasks.push(time("OSM", () => fromOSM(opts.bbox!)))

  const lists = await Promise.all(tasks)
  const merged = new Map<string, FactoryRecord>()
  for (const list of lists) {
    for (const f of list) {
      const key = normKey(f)
      const existing = merged.get(key)
      merged.set(key, existing ? merge(existing, f) : f)
    }
  }

  const factories = Array.from(merged.values())
  const byIndustry: Record<string, number> = {}
  const byCountry: Record<string, number> = {}
  for (const f of factories) {
    byIndustry[f.industry] = (byIndustry[f.industry] || 0) + 1
    byCountry[f.country] = (byCountry[f.country] || 0) + 1
  }

  return {
    total: factories.length, byIndustry, byCountry, sources, factories,
    generatedAt: new Date().toISOString(),
  }
}
