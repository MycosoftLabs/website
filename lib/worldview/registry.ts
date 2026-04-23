/**
 * Worldview v1 dataset registry — Apr 23, 2026
 *
 * Single source of truth for every dataset agents can reach through
 * /api/worldview/v1/*. Each entry declares its identity, cost, scope,
 * cache TTL, and a handler shim that proxies to the underlying route
 * (which stays at its original /api/crep/*, /api/mindex/*, /api/oei/*
 * path so existing consumers don't break).
 *
 * Full design in docs/WORLDVIEW_API_V2_PLAN.md §6.
 */

import type { NextRequest } from "next/server"

export type WorldviewScope = "public" | "agent" | "fusarium" | "ops"
export type WorldviewCategory =
  | "infrastructure.power"
  | "infrastructure.comms"
  | "infrastructure.transport"
  | "infrastructure.defense"
  | "live.aviation"
  | "live.maritime"
  | "live.space"
  | "live.environmental"
  | "sensors.airquality"
  | "sensors.water"
  | "sensors.biodiversity"
  | "cameras"
  | "mindex.knowledge"
  | "mindex.telemetry"
  | "projects.oyster"
  | "projects.goffs"
  | "security.shodan"
  | "natureos"

export type ResponseShape =
  | "geojson.FeatureCollection"
  | "geojson.FeatureCollection.Stream"
  | "json.Array"
  | "json.Object"
  | "sse.EventStream"
  | "image.Binary"
  | "tile.Vector"
  | "tile.Raster"

export interface DatasetSupport {
  bbox: boolean
  cursor: boolean
  time_range: boolean
  stream: boolean
  tile: boolean
  /** Supports an ID lookup, e.g. /v1/query?type=<id>&id=<record_id>. */
  id_lookup: boolean
}

export interface DatasetHandlerInput {
  req: NextRequest
  params: URLSearchParams
  requestId: string
  /** Caller's origin (injected by middleware) so internal fetches use the
   *  right base URL in both dev and prod. */
  internalOrigin: string
}

export interface DatasetHandlerResult {
  data: any
  ttl_s: number
  cache: "hit" | "miss" | "stale" | "bypass"
  meta?: Record<string, any>
}

export interface Dataset {
  id: string
  name: string
  category: WorldviewCategory
  description: string
  /** The native route(s) this dataset proxies. For docs only — handler owns the actual fetch. */
  underlying_routes: string[]
  response_shape: ResponseShape
  supports: DatasetSupport
  scope: WorldviewScope
  /** Token-cents debited per uncached request. Cached hits are 50%. */
  cost_per_request: number
  /** Rate-bucket units consumed per request. `/v1/health` = 0, `/v1/query?type=ais` = 3, bundle = 20+. */
  rate_weight: number
  /** Server-side cache TTL in ms. 0 = never cache. */
  cache_ttl_ms: number
  /** Short example for the catalog UI + OpenAPI. */
  example: string
  handler: (input: DatasetHandlerInput) => Promise<DatasetHandlerResult>
}

// ─── Handler helpers ─────────────────────────────────────────────────

async function proxyJson(url: string, ttlS: number, meta?: Record<string, any>): Promise<DatasetHandlerResult> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "WorldviewV1/1.0" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`upstream ${res.status} on ${url}`)
  }
  const data = await res.json()
  return { data, ttl_s: ttlS, cache: "miss", meta }
}

async function proxyStatic(publicPath: string, internalOrigin: string, ttlS: number): Promise<DatasetHandlerResult> {
  const res = await fetch(`${internalOrigin}${publicPath}`, {
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`static fetch failed ${res.status} ${publicPath}`)
  const data = await res.json()
  const features = Array.isArray(data?.features) ? data.features : []
  return { data, ttl_s: ttlS, cache: "miss", meta: { count: features.length } }
}

function bboxParam(p: URLSearchParams): string | null {
  const b = p.get("bbox")
  if (!b) return null
  const parts = b.split(",").map(Number)
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return null
  return parts.join(",")
}

// ─── Registry ────────────────────────────────────────────────────────

export const DATASETS: Dataset[] = [
  // ============================================================
  // INFRASTRUCTURE — POWER
  // ============================================================
  {
    id: "crep.infra.power.tx-lines-major",
    name: "Transmission Lines — Major (HIFLD ≥345 kV)",
    category: "infrastructure.power",
    description: "HIFLD US transmission backbone, 22,760 lines ≥345 kV. Authoritative federal dataset.",
    underlying_routes: ["/data/crep/transmission-lines-us-major.geojson"],
    response_shape: "geojson.FeatureCollection",
    supports: { bbox: false, cursor: false, time_range: false, stream: false, tile: true, id_lookup: false },
    scope: "agent",
    cost_per_request: 4,
    rate_weight: 5,
    cache_ttl_ms: 24 * 60 * 60_000,
    example: "/api/worldview/v1/query?type=crep.infra.power.tx-lines-major",
    handler: ({ internalOrigin }) => proxyStatic("/data/crep/transmission-lines-us-major.geojson", internalOrigin, 24 * 3600),
  },
  {
    id: "crep.infra.power.tx-lines-full",
    name: "Transmission Lines — All Voltages (HIFLD full)",
    category: "infrastructure.power",
    description: "HIFLD full dataset, 52,244 lines including 69/115/138/230 kV feeders.",
    underlying_routes: ["/data/crep/transmission-lines-us-full.geojson"],
    response_shape: "geojson.FeatureCollection",
    supports: { bbox: false, cursor: false, time_range: false, stream: false, tile: true, id_lookup: false },
    scope: "agent",
    cost_per_request: 6,
    rate_weight: 8,
    cache_ttl_ms: 24 * 60 * 60_000,
    example: "/api/worldview/v1/query?type=crep.infra.power.tx-lines-full",
    handler: ({ internalOrigin }) => proxyStatic("/data/crep/transmission-lines-us-full.geojson", internalOrigin, 24 * 3600),
  },
  {
    id: "crep.infra.power.tx-lines-sub",
    name: "Sub-Transmission Lines (OSM ≤115 kV)",
    category: "infrastructure.power",
    description: "OSM community-mapped sub-transmission feeders that fill the HIFLD ≥115 kV gap. Covers Loveland / Jamacha / Otay 69 kV.",
    underlying_routes: ["/data/crep/transmission-lines-sub-transmission.geojson"],
    response_shape: "geojson.FeatureCollection",
    supports: { bbox: false, cursor: false, time_range: false, stream: false, tile: false, id_lookup: false },
    scope: "agent",
    cost_per_request: 3,
    rate_weight: 4,
    cache_ttl_ms: 7 * 24 * 60 * 60_000,
    example: "/api/worldview/v1/query?type=crep.infra.power.tx-lines-sub",
    handler: ({ internalOrigin }) => proxyStatic("/data/crep/transmission-lines-sub-transmission.geojson", internalOrigin, 7 * 24 * 3600),
  },
  {
    id: "crep.infra.power.substations",
    name: "Substations (US)",
    category: "infrastructure.power",
    description: "HIFLD US electric substations (~75k).",
    underlying_routes: ["/data/crep/substations-us.geojson"],
    response_shape: "geojson.FeatureCollection",
    supports: { bbox: false, cursor: false, time_range: false, stream: false, tile: true, id_lookup: false },
    scope: "agent",
    cost_per_request: 3,
    rate_weight: 4,
    cache_ttl_ms: 24 * 60 * 60_000,
    example: "/api/worldview/v1/query?type=crep.infra.power.substations",
    handler: ({ internalOrigin }) => proxyStatic("/data/crep/substations-us.geojson", internalOrigin, 24 * 3600),
  },
  {
    id: "crep.infra.power.power-plants-global",
    name: "Power Plants (global)",
    category: "infrastructure.power",
    description: "WRI Global Power Plant Database — ~35k plants worldwide with fuel type + capacity.",
    underlying_routes: ["/data/crep/power-plants-global.geojson"],
    response_shape: "geojson.FeatureCollection",
    supports: { bbox: false, cursor: false, time_range: false, stream: false, tile: true, id_lookup: false },
    scope: "agent",
    cost_per_request: 4,
    rate_weight: 5,
    cache_ttl_ms: 24 * 60 * 60_000,
    example: "/api/worldview/v1/query?type=crep.infra.power.power-plants-global",
    handler: ({ internalOrigin }) => proxyStatic("/data/crep/power-plants-global.geojson", internalOrigin, 24 * 3600),
  },
  {
    id: "crep.infra.power.data-centers-global",
    name: "Data Centers (global)",
    category: "infrastructure.power",
    description: "Global data-center inventory — IM3 + OSM + commercial directories.",
    underlying_routes: ["/data/crep/data-centers-global.geojson"],
    response_shape: "geojson.FeatureCollection",
    supports: { bbox: false, cursor: false, time_range: false, stream: false, tile: false, id_lookup: false },
    scope: "agent",
    cost_per_request: 3,
    rate_weight: 3,
    cache_ttl_ms: 24 * 60 * 60_000,
    example: "/api/worldview/v1/query?type=crep.infra.power.data-centers-global",
    handler: ({ internalOrigin }) => proxyStatic("/data/crep/data-centers-global.geojson", internalOrigin, 24 * 3600),
  },

  // ============================================================
  // INFRASTRUCTURE — COMMS
  // ============================================================
  {
    id: "crep.infra.comms.cell-towers-global",
    name: "Cell Towers (global)",
    category: "infrastructure.comms",
    description: "OpenCellID global cell-tower dataset.",
    underlying_routes: ["/data/crep/cell-towers-global.geojson"],
    response_shape: "geojson.FeatureCollection",
    supports: { bbox: false, cursor: true, time_range: false, stream: false, tile: true, id_lookup: false },
    scope: "agent",
    cost_per_request: 6,
    rate_weight: 10,
    cache_ttl_ms: 24 * 60 * 60_000,
    example: "/api/worldview/v1/query?type=crep.infra.comms.cell-towers-global",
    handler: ({ internalOrigin }) => proxyStatic("/data/crep/cell-towers-global.geojson", internalOrigin, 24 * 3600),
  },
  {
    id: "crep.infra.comms.submarine-cables",
    name: "Submarine Cables (global)",
    category: "infrastructure.comms",
    description: "TeleGeography-derived submarine cable routes with landing stations.",
    underlying_routes: ["/data/crep/submarine-cables.geojson"],
    response_shape: "geojson.FeatureCollection",
    supports: { bbox: false, cursor: false, time_range: false, stream: false, tile: false, id_lookup: true },
    scope: "agent",
    cost_per_request: 2,
    rate_weight: 2,
    cache_ttl_ms: 24 * 60 * 60_000,
    example: "/api/worldview/v1/query?type=crep.infra.comms.submarine-cables",
    handler: ({ internalOrigin }) => proxyStatic("/data/crep/submarine-cables.geojson", internalOrigin, 24 * 3600),
  },

  // ============================================================
  // LIVE — AVIATION
  // ============================================================
  {
    id: "crep.live.aviation.flightradar24",
    name: "Live Aircraft (FlightRadar24)",
    category: "live.aviation",
    description: "Live ADS-B from FlightRadar24. Viewport bbox recommended to cap result size.",
    underlying_routes: ["/api/oei/flightradar24"],
    response_shape: "json.Object",
    supports: { bbox: true, cursor: false, time_range: false, stream: true, tile: false, id_lookup: true },
    scope: "agent",
    cost_per_request: 2,
    rate_weight: 3,
    cache_ttl_ms: 15_000,
    example: "/api/worldview/v1/query?type=crep.live.aviation.flightradar24&bbox=-118,32,-116,34",
    handler: async ({ params, internalOrigin }) => {
      const bbox = bboxParam(params)
      const url = `${internalOrigin}/api/oei/flightradar24${bbox ? `?bbox=${bbox}` : ""}`
      return proxyJson(url, 15)
    },
  },

  // ============================================================
  // LIVE — MARITIME
  // ============================================================
  {
    id: "crep.live.maritime.aisstream",
    name: "Live Vessels (AISStream)",
    category: "live.maritime",
    description: "Live AIS vessel positions. Capped at ~20k in memory; use bbox for local subsets.",
    underlying_routes: ["/api/oei/aisstream"],
    response_shape: "json.Object",
    supports: { bbox: true, cursor: false, time_range: false, stream: true, tile: false, id_lookup: true },
    scope: "agent",
    cost_per_request: 2,
    rate_weight: 3,
    cache_ttl_ms: 30_000,
    example: "/api/worldview/v1/query?type=crep.live.maritime.aisstream&bbox=-120,32,-117,35",
    handler: async ({ params, internalOrigin }) => {
      const bbox = bboxParam(params)
      const url = `${internalOrigin}/api/oei/aisstream${bbox ? `?bbox=${bbox}` : ""}`
      return proxyJson(url, 30)
    },
  },

  // ============================================================
  // LIVE — SPACE
  // ============================================================
  {
    id: "crep.live.space.satellites",
    name: "Live Satellites (Celestrak SGP4)",
    category: "live.space",
    description: "Active satellites propagated from Celestrak TLEs via SGP4.",
    underlying_routes: ["/api/oei/satellites"],
    response_shape: "json.Object",
    supports: { bbox: false, cursor: false, time_range: false, stream: true, tile: false, id_lookup: true },
    scope: "agent",
    cost_per_request: 3,
    rate_weight: 5,
    cache_ttl_ms: 60_000,
    example: "/api/worldview/v1/query?type=crep.live.space.satellites&category=active",
    handler: async ({ params, internalOrigin }) => {
      const category = params.get("category") || "active"
      return proxyJson(`${internalOrigin}/api/oei/satellites?category=${encodeURIComponent(category)}&mode=registry`, 60)
    },
  },

  // ============================================================
  // LIVE — ENVIRONMENTAL
  // ============================================================
  {
    id: "crep.live.environmental.wildfires-firms",
    name: "Active Fires (NASA FIRMS)",
    category: "live.environmental",
    description: "NASA FIRMS thermal anomalies last 24 h.",
    underlying_routes: ["/api/oei/eonet?category=fires"],
    response_shape: "json.Object",
    supports: { bbox: true, cursor: false, time_range: true, stream: false, tile: false, id_lookup: false },
    scope: "agent",
    cost_per_request: 2,
    rate_weight: 3,
    cache_ttl_ms: 15 * 60_000,
    example: "/api/worldview/v1/query?type=crep.live.environmental.wildfires-firms",
    handler: async ({ internalOrigin }) => proxyJson(`${internalOrigin}/api/oei/eonet?category=wildfires`, 15 * 60),
  },
  {
    id: "crep.live.environmental.earthquakes",
    name: "Earthquakes (USGS)",
    category: "live.environmental",
    description: "USGS global earthquakes last 7 days.",
    underlying_routes: ["/api/mindex/proxy/earthquakes"],
    response_shape: "json.Object",
    supports: { bbox: true, cursor: false, time_range: true, stream: false, tile: false, id_lookup: true },
    scope: "agent",
    cost_per_request: 1,
    rate_weight: 1,
    cache_ttl_ms: 5 * 60_000,
    example: "/api/worldview/v1/query?type=crep.live.environmental.earthquakes",
    handler: async ({ params, internalOrigin }) => {
      const bbox = bboxParam(params) || "-180,-90,180,90"
      return proxyJson(`${internalOrigin}/api/mindex/proxy/earthquakes?bbox=${bbox}&limit=${params.get("limit") || 500}`, 5 * 60)
    },
  },

  // ============================================================
  // SENSORS — AIR QUALITY
  // ============================================================
  {
    id: "crep.sensors.airquality.airnow-current",
    name: "AirNow Current AQI (nearest monitor)",
    category: "sensors.airquality",
    description: "EPA AirNow current-observations for a lat/lng. Requires AIRNOW_API_KEY env.",
    underlying_routes: ["/api/crep/airnow/current"],
    response_shape: "json.Object",
    supports: { bbox: false, cursor: false, time_range: false, stream: false, tile: false, id_lookup: false },
    scope: "agent",
    cost_per_request: 1,
    rate_weight: 1,
    cache_ttl_ms: 10 * 60_000,
    example: "/api/worldview/v1/query?type=crep.sensors.airquality.airnow-current&lat=32.7&lng=-117.1",
    handler: async ({ params, internalOrigin }) => {
      const lat = params.get("lat"), lng = params.get("lng")
      if (!lat || !lng) throw new Error("INVALID_PARAMS: lat + lng required")
      return proxyJson(`${internalOrigin}/api/crep/airnow/current?lat=${lat}&lng=${lng}&distance=${params.get("distance") || 25}`, 10 * 60)
    },
  },
  {
    id: "crep.sensors.airquality.airnow-bbox",
    name: "AirNow Monitors in bbox",
    category: "sensors.airquality",
    description: "All EPA AirNow monitors inside a bbox with current AQI + dominant pollutant.",
    underlying_routes: ["/api/crep/airnow/bbox"],
    response_shape: "geojson.FeatureCollection",
    supports: { bbox: true, cursor: false, time_range: false, stream: false, tile: false, id_lookup: false },
    scope: "agent",
    cost_per_request: 2,
    rate_weight: 2,
    cache_ttl_ms: 15 * 60_000,
    example: "/api/worldview/v1/query?type=crep.sensors.airquality.airnow-bbox&bbox=-118,32,-116,34",
    handler: async ({ params, internalOrigin }) => {
      const bbox = bboxParam(params)
      if (!bbox) throw new Error("INVALID_PARAMS: bbox required")
      return proxyJson(`${internalOrigin}/api/crep/airnow/bbox?bbox=${bbox}`, 15 * 60)
    },
  },
  {
    id: "crep.sensors.airquality.sdapcd-h2s",
    name: "SDAPCD H2S (Tijuana River Valley)",
    category: "sensors.airquality",
    description: "UCSD-airborne + SDAPCD H2S monitors around TJ estuary. Charts + latest ppb when available.",
    underlying_routes: ["/api/crep/sdapcd/h2s"],
    response_shape: "json.Object",
    supports: { bbox: false, cursor: false, time_range: true, stream: false, tile: false, id_lookup: true },
    scope: "agent",
    cost_per_request: 1,
    rate_weight: 1,
    cache_ttl_ms: 5 * 60_000,
    example: "/api/worldview/v1/query?type=crep.sensors.airquality.sdapcd-h2s",
    handler: async ({ internalOrigin }) => proxyJson(`${internalOrigin}/api/crep/sdapcd/h2s`, 5 * 60),
  },

  // ============================================================
  // PROJECTS — OYSTER
  // ============================================================
  {
    id: "crep.projects.oyster.overview",
    name: "Project Oyster — full overlay",
    category: "projects.oyster",
    description: "Tijuana estuary federated overlay: IBWC discharge + SDAPCD H2S + cameras + Navy + oyster sites.",
    underlying_routes: ["/api/crep/tijuana-estuary"],
    response_shape: "json.Object",
    supports: { bbox: false, cursor: false, time_range: false, stream: false, tile: false, id_lookup: false },
    scope: "agent",
    cost_per_request: 5,
    rate_weight: 8,
    cache_ttl_ms: 5 * 60_000,
    example: "/api/worldview/v1/query?type=crep.projects.oyster.overview",
    handler: async ({ internalOrigin }) => proxyJson(`${internalOrigin}/api/crep/tijuana-estuary`, 5 * 60),
  },
  {
    id: "crep.projects.oyster.plume",
    name: "Project Oyster — UCSD PFM plume",
    category: "projects.oyster",
    description: "UCSD cross-border plume FIB polygon + flow rate.",
    underlying_routes: ["/api/crep/oyster/plume"],
    response_shape: "json.Object",
    supports: { bbox: false, cursor: false, time_range: false, stream: false, tile: false, id_lookup: false },
    scope: "agent",
    cost_per_request: 2,
    rate_weight: 2,
    cache_ttl_ms: 15 * 60_000,
    example: "/api/worldview/v1/query?type=crep.projects.oyster.plume",
    handler: async ({ internalOrigin }) => proxyJson(`${internalOrigin}/api/crep/oyster/plume`, 15 * 60),
  },

  // ============================================================
  // PROJECTS — GOFFS
  // ============================================================
  {
    id: "crep.projects.goffs.overview",
    name: "Project Goffs — Mojave Preserve full overlay",
    category: "projects.goffs",
    description: "NPS MOJA boundary + Goffs anchor + wilderness POIs + ASOS/RAWS climate + iNat observations.",
    underlying_routes: ["/api/crep/mojave"],
    response_shape: "json.Object",
    supports: { bbox: false, cursor: false, time_range: false, stream: false, tile: false, id_lookup: false },
    scope: "agent",
    cost_per_request: 5,
    rate_weight: 8,
    cache_ttl_ms: 15 * 60_000,
    example: "/api/worldview/v1/query?type=crep.projects.goffs.overview",
    handler: async ({ internalOrigin }) => proxyJson(`${internalOrigin}/api/crep/mojave`, 15 * 60),
  },

  // ============================================================
  // CAMERAS
  // ============================================================
  {
    id: "crep.cameras.eagle-sources",
    name: "Eagle Eye Video Sources",
    category: "cameras",
    description: "Union of registered + live-connector cameras (Caltrans, Surfline, HPWREN, ALERTCalifornia, NPS, etc).",
    underlying_routes: ["/api/eagle/sources"],
    response_shape: "json.Object",
    supports: { bbox: true, cursor: false, time_range: false, stream: false, tile: false, id_lookup: false },
    scope: "agent",
    cost_per_request: 3,
    rate_weight: 4,
    cache_ttl_ms: 5 * 60_000,
    example: "/api/worldview/v1/query?type=crep.cameras.eagle-sources&bbox=-118,32,-116,34",
    handler: async ({ params, internalOrigin }) => {
      const bbox = bboxParam(params)
      const url = `${internalOrigin}/api/eagle/sources?limit=${params.get("limit") || 5000}${bbox ? `&bbox=${bbox}` : ""}`
      return proxyJson(url, 5 * 60)
    },
  },

  // ============================================================
  // MINDEX KNOWLEDGE
  // ============================================================
  {
    id: "mindex.knowledge.species",
    name: "MINDEX Species",
    category: "mindex.knowledge",
    description: "Species entries with taxonomic lineage, compounds, and genome references.",
    underlying_routes: ["/api/mindex/species"],
    response_shape: "json.Object",
    supports: { bbox: false, cursor: true, time_range: false, stream: false, tile: false, id_lookup: true },
    scope: "agent",
    cost_per_request: 2,
    rate_weight: 2,
    cache_ttl_ms: 60 * 60_000,
    example: "/api/worldview/v1/query?type=mindex.knowledge.species&q=fusarium",
    handler: async ({ params, internalOrigin }) => {
      const q = params.get("q") || ""
      const limit = params.get("limit") || "50"
      return proxyJson(`${internalOrigin}/api/mindex/species?q=${encodeURIComponent(q)}&limit=${limit}`, 60 * 60)
    },
  },

  // ============================================================
  // NATUREOS
  // ============================================================
  {
    id: "natureos.global-events",
    name: "NatureOS Global Events",
    category: "natureos",
    description: "Global event feed (alerts, disasters, biodiversity incidents).",
    underlying_routes: ["/api/natureos/global-events"],
    response_shape: "json.Object",
    supports: { bbox: false, cursor: true, time_range: true, stream: false, tile: false, id_lookup: false },
    scope: "agent",
    cost_per_request: 1,
    rate_weight: 1,
    cache_ttl_ms: 60_000,
    example: "/api/worldview/v1/query?type=natureos.global-events",
    handler: async ({ internalOrigin }) => proxyJson(`${internalOrigin}/api/natureos/global-events`, 60),
  },
]

// Build an id→dataset lookup for O(1) access from query handler.
const BY_ID = new Map<string, Dataset>(DATASETS.map((d) => [d.id, d]))

export function getDataset(id: string): Dataset | undefined {
  return BY_ID.get(id)
}

export function listDatasets(opts: { scope?: WorldviewScope; category?: WorldviewCategory } = {}): Dataset[] {
  return DATASETS.filter((d) => {
    if (opts.scope && d.scope !== opts.scope) return false
    if (opts.category && d.category !== opts.category) return false
    return true
  })
}

export function scopeAllows(callerScope: WorldviewScope, required: WorldviewScope): boolean {
  const tier = (s: WorldviewScope) => ({ public: 0, agent: 1, fusarium: 2, ops: 3 }[s])
  return tier(callerScope) >= tier(required)
}
