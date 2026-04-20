/**
 * Rail Registry — Multi-source live rail vehicle aggregator
 *
 * Fans out to:
 *   • Website OEI proxy — GET /api/oei/railway-live (Amtrak, MBTA, MTS, LA Metro, SF 511, …)
 *   • MINDEX PostGIS — GET /api/mindex/earth/map/bbox?layer=rail_live
 *
 * Deduplicates by `{source}:{stableId}` then POSTs merged rows to
 * POST /api/mindex/ingest/rail_live so the cache stays warm for bbox reads.
 */

import API_URLS, { getBaseUrl } from "@/lib/config/api-urls"

const MINDEX_BASE =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_API_URL ||
  API_URLS.MINDEX

// =============================================================================
// TYPES
// =============================================================================

export interface RailRecord {
  id: string
  trainNum: string | null
  routeName: string | null
  name: string
  operator: string | null
  lat: number
  lng: number
  heading: number | null
  speed: number | null
  vehicleType: string | null
  source: string
  timestamp: string
}

interface SourceResult {
  source: string
  trains: RailRecord[]
  error?: string
  durationMs: number
}

// =============================================================================
// CONFIG
// =============================================================================

const MINDEX_API_KEY = process.env.MINDEX_API_KEY || ""
const MINDEX_INTERNAL_TOKEN = process.env.MINDEX_INTERNAL_TOKEN || ""

const SOURCE_TIMEOUT_MS = 12_000

function mindexAuthHeaders(): Record<string, string> {
  if (MINDEX_INTERNAL_TOKEN) {
    return { "X-Internal-Token": MINDEX_INTERNAL_TOKEN }
  }
  if (MINDEX_API_KEY) {
    return { "X-API-Key": MINDEX_API_KEY }
  }
  return {}
}

// =============================================================================
// FETCHERS
// =============================================================================

async function fetchFromRailwayLiveProxy(): Promise<RailRecord[]> {
  const base = getBaseUrl()
  const url = `${base}/api/oei/railway-live`
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  })
  if (!res.ok) return []
  const data = (await res.json()) as { trains?: unknown[] }
  const trains = data.trains ?? []
  return trains.map((t) => normaliseOeiTrain(t))
}

async function fetchFromMindexRailLive(): Promise<RailRecord[]> {
  const url = `${MINDEX_BASE}/api/mindex/earth/map/bbox?layer=rail_live&lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&limit=20000`
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { Accept: "application/json", ...mindexAuthHeaders() },
  })
  if (!res.ok) return []
  const data = await res.json()
  const entities: unknown[] = data.entities ?? data.features ?? []
  return entities.map((e) => normaliseMindexEntity(e))
}

function normaliseOeiTrain(t: unknown): RailRecord {
  const r = t as Record<string, unknown>
  const lat = Number(r.lat ?? r.latitude)
  const lng = Number(r.lng ?? r.lon ?? r.longitude)
  const src = String(r.source ?? "oei")
  const idRaw = String(r.id ?? `${src}-${r.trainNum ?? lat}-${lng}`)
  return {
    id: idRaw,
    trainNum: r.trainNum != null ? String(r.trainNum) : null,
    routeName: r.routeName != null ? String(r.routeName) : null,
    name: String(r.name ?? r.routeName ?? r.trainNum ?? "Train"),
    operator: r.operator != null ? String(r.operator) : null,
    lat,
    lng,
    heading: r.heading != null ? Number(r.heading) : null,
    speed: r.speed != null ? Number(r.speed) : r.velocity != null ? Number(r.velocity) : null,
    vehicleType: r.vehicle_type != null ? String(r.vehicle_type) : null,
    source: src,
    timestamp: String(r.timestamp ?? new Date().toISOString()),
  }
}

function normaliseMindexEntity(e: unknown): RailRecord {
  const x = e as Record<string, unknown>
  const props = (x.properties as Record<string, unknown>) ?? {}
  return {
    id: String(x.id ?? props.id ?? "mindex-unknown"),
    trainNum: props.trainNum != null ? String(props.trainNum) : null,
    routeName: props.routeName != null ? String(props.routeName) : null,
    name: String(x.name ?? props.name ?? props.routeName ?? "Train"),
    operator: props.operator != null ? String(props.operator) : null,
    lat: Number(x.lat ?? props.lat ?? 0),
    lng: Number(x.lng ?? props.lng ?? 0),
    heading: props.heading != null ? Number(props.heading) : null,
    speed: props.speed != null ? Number(props.speed) : null,
    vehicleType: props.vehicle_type != null ? String(props.vehicle_type) : null,
    source: String(x.source ?? props.source ?? "mindex"),
    timestamp: String(x.occurred_at ?? props.timestamp ?? new Date().toISOString()),
  }
}

// =============================================================================
// DEDUP
// =============================================================================

function dedupeKey(r: RailRecord): string {
  const stable = r.id.replace(/^[^-]+-/, "") || r.id
  return `${r.source}:${stable}`.toLowerCase()
}

function mergeRail(a: RailRecord, b: RailRecord): RailRecord {
  const ta = new Date(a.timestamp).getTime()
  const tb = new Date(b.timestamp).getTime()
  const useB = tb >= ta
  const primary = useB ? b : a
  const secondary = useB ? a : b
  return {
    ...primary,
    trainNum: primary.trainNum ?? secondary.trainNum,
    routeName: primary.routeName ?? secondary.routeName,
    name: primary.name || secondary.name,
    operator: primary.operator ?? secondary.operator,
    heading: primary.heading ?? secondary.heading,
    speed: primary.speed ?? secondary.speed,
    vehicleType: primary.vehicleType ?? secondary.vehicleType,
    source: primary.source === secondary.source ? primary.source : `${primary.source}+${secondary.source}`,
  }
}

function dedupeBySourceId(records: RailRecord[]): RailRecord[] {
  const map = new Map<string, RailRecord>()
  for (const r of records) {
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue
    if (r.lat === 0 && r.lng === 0) continue
    const k = dedupeKey(r)
    const ex = map.get(k)
    map.set(k, ex ? mergeRail(ex, r) : r)
  }
  return Array.from(map.values())
}

// =============================================================================
// MINDEX INGEST (fire-and-forget)
// =============================================================================

async function postRailLiveToMindex(records: RailRecord[]): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...mindexAuthHeaders(),
  }
  if (!headers["X-Internal-Token"] && !headers["X-API-Key"]) {
    console.warn("[RailRegistry] MINDEX_INTERNAL_TOKEN / MINDEX_API_KEY missing — skip ingest")
    return
  }

  const url = `${MINDEX_BASE}/api/mindex/ingest/rail_live`
  const entities = records.map((r) => {
    const sourceId = r.id.includes("-") ? r.id.split("-").slice(1).join("-") : r.id
    return {
      source: r.source,
      source_id: sourceId.slice(0, 500),
      name: r.name,
      entity_type: "rail_vehicle",
      lat: r.lat,
      lng: r.lng,
      occurred_at: r.timestamp,
      properties: {
        trainNum: r.trainNum,
        routeName: r.routeName,
        operator: r.operator,
        heading: r.heading,
        speed: r.speed,
        vehicle_type: r.vehicleType,
        id: r.id,
      },
    }
  })

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ entities }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    console.warn("[RailRegistry] MINDEX ingest failed:", res.status, txt.slice(0, 200))
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

export interface RailRegistryResult {
  trains: RailRecord[]
  sources: Record<string, number>
  totalBeforeDedup: number
  fetchedAt: string
}

export async function fetchAllRails(): Promise<RailRecord[]> {
  const meta = await fetchAllRailsWithMeta()
  return meta.trains
}

/**
 * Aggregate OEI railway-live + MINDEX rail_live, dedupe, and push deduped rows to MINDEX.
 */
export async function fetchAllRailsWithMeta(): Promise<RailRegistryResult> {
  const sourceFetchers: Array<{ name: string; fn: () => Promise<RailRecord[]> }> = [
    { name: "oei-railway-live", fn: fetchFromRailwayLiveProxy },
    { name: "mindex-rail_live", fn: fetchFromMindexRailLive },
  ]

  const results = await Promise.allSettled(
    sourceFetchers.map(async ({ name, fn }): Promise<SourceResult> => {
      const start = Date.now()
      try {
        const trains = await fn()
        return { source: name, trains, durationMs: Date.now() - start }
      } catch (err) {
        return {
          source: name,
          trains: [],
          error: (err as Error).message,
          durationMs: Date.now() - start,
        }
      }
    })
  )

  const all: RailRecord[] = []
  const sourceCounts: Record<string, number> = {}

  for (const r of results) {
    if (r.status === "fulfilled") {
      all.push(...r.value.trains)
      sourceCounts[r.value.source] = r.value.trains.length
    }
  }

  const deduped = dedupeBySourceId(all)

  void postRailLiveToMindex(deduped).catch((e) => console.warn("[RailRegistry] ingest error", e))

  return {
    trains: deduped,
    sources: sourceCounts,
    totalBeforeDedup: all.length,
    fetchedAt: new Date().toISOString(),
  }
}
