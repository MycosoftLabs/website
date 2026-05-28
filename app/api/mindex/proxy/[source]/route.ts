import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

/**
 * MINDEX Cache Proxy — Unified data access for all CREP map layers
 *
 * Routes: /api/mindex/proxy/[source]?lat_min=&lat_max=&lng_min=&lng_max=&limit=
 *
 * This proxy routes to MINDEX's earth/map/bbox PostGIS endpoint which already
 * has spatial queries for all entity types:
 *   earthquakes, volcanoes, wildfires, storms, species, facilities,
 *   antennas, aircraft, vessels, airports, ports, satellites, cameras,
 *   military, buoys, weather, air_quality, wifi_hotspots, power_grid
 *
 * MINDEX handles caching internally via its multi-tier cache:
 *   Tier 0: In-process LRU (< 0.1ms)
 *   Tier 1: Redis (< 1ms) with map:{layer}:{bbox_hash} keys
 *   Tier 2: PostgreSQL/PostGIS (< 5ms)
 *   Tier 3: Supabase cloud sync (< 50ms)
 *   Tier 4: Live API scrape + cache (100-2000ms)
 *
 * If MINDEX is unavailable, we fall back to the existing direct API routes
 * (/api/oei/*, /api/crep/*, /api/natureos/*) but data won't be persisted.
 */

const MINDEX_URL = resolveMindexServerBaseUrl()
const MINDEX_API_KEY = process.env.MINDEX_API_KEY?.trim() || ""
const INATURALIST_API = "https://api.inaturalist.org/v1"
const configuredMindexTimeout = Number(process.env.CREP_MINDEX_PROXY_TIMEOUT_MS)
const MINDEX_PROXY_TIMEOUT_MS =
  Number.isFinite(configuredMindexTimeout) && configuredMindexTimeout > 0
    ? configuredMindexTimeout
    : process.env.NODE_ENV === "development"
      ? 1500
      : 8000
const configuredFallbackTimeout = Number(process.env.CREP_MINDEX_PROXY_FALLBACK_TIMEOUT_MS)
const FALLBACK_TIMEOUT_MS =
  Number.isFinite(configuredFallbackTimeout) && configuredFallbackTimeout > 0
    ? configuredFallbackTimeout
    : process.env.NODE_ENV === "development"
      ? 6000
      : 12000
const PROXY_CACHE_TTL_MS = Number(process.env.CREP_PROXY_CACHE_TTL_MS || 3000)
const PROXY_CACHE_STALE_MS = Number(process.env.CREP_PROXY_CACHE_STALE_MS || 30000)

type ProxyCacheEntry = {
  body: any
  sourceLabel: "live" | "fallback" | "unavailable"
  expiresAt: number
  staleUntil: number
}

const proxyResponseCache = new Map<string, ProxyCacheEntry>()

function mindexHeaders(): HeadersInit {
  const h: Record<string, string> = { Accept: "application/json" }
  if (MINDEX_API_KEY) h["X-API-Key"] = MINDEX_API_KEY
  return h
}

/** Map source names to MINDEX earth/map/bbox layer names */
const SOURCE_TO_MINDEX_LAYER: Record<string, string> = {
  // Earth events
  earthquakes: "earthquakes",
  volcanoes: "volcanoes",
  wildfires: "wildfires",
  storms: "storms",
  lightning: "lightning",
  floods: "floods",

  // Transport
  aircraft: "aircraft",
  vessels: "vessels",
  airports: "airports",
  ports: "ports",

  // Space
  satellites: "satellites",
  "solar-events": "solar_events",

  // Species
  species: "species",
  sightings: "sightings",

  // Infrastructure
  facilities: "facilities",
  "power-grid": "power_grid",
  "power-plants": "facilities",
  substations: "substations",
  "transmission-lines": "transmission_lines",
  "internet-cables": "internet_cables",
  "submarine-cables": "internet_cables",
  antennas: "antennas",
  "wifi-hotspots": "wifi_hotspots",
  "cell-towers": "antennas",

  // Atmosphere
  weather: "weather",
  "air-quality": "air_quality",
  "greenhouse-gas": "greenhouse_gas",

  // Water
  buoys: "buoys",
  "stream-gauges": "stream_gauges",

  // Monitoring
  cameras: "cameras",
  military: "military",
}

/** Fallback internal API routes when MINDEX is unavailable */
const FALLBACK_ROUTES: Record<string, string> = {
  aircraft: "/api/oei/flightradar24",
  vessels: "/api/oei/aisstream",
  satellites: "/api/oei/satellites",
  earthquakes: "/api/natureos/global-events",
  species: "/api/crep/fungal",
  "internet-cables": "/api/oei/submarine-cables",
}

function entityCount(data: any): number {
  if (Array.isArray(data?.entities)) return data.entities.length
  if (Array.isArray(data?.observations)) return data.observations.length
  if (Array.isArray(data?.features)) return data.features.length
  if (typeof data?.total === "number") return data.total
  return 0
}

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null
  const ts = new Date(value)
  return Number.isFinite(ts.getTime()) ? ts.toISOString() : null
}

function latestEntityTimestamp(entities: any[]): string {
  let latest = 0
  for (const entity of entities) {
    const occurredAt = typeof entity?.occurred_at === "string" ? Date.parse(entity.occurred_at) : NaN
    if (Number.isFinite(occurredAt) && occurredAt > latest) latest = occurredAt
  }
  return latest > 0 ? new Date(latest).toISOString() : new Date().toISOString()
}

function isStaleTimestamp(iso: string, maxAgeMs: number): boolean {
  const ts = Date.parse(iso)
  if (!Number.isFinite(ts)) return true
  return Date.now() - ts > maxAgeMs
}

function normalizeMoverEntity(entity: any, source: string) {
  const props = typeof entity?.properties === "object" && entity?.properties ? entity.properties : {}
  const loc = entity?.location as
    | { latitude?: number; longitude?: number; coordinates?: [number, number] }
    | undefined
  let lat = Number(entity?.lat ?? entity?.latitude ?? loc?.latitude ?? loc?.coordinates?.[1])
  let lng = Number(entity?.lng ?? entity?.longitude ?? loc?.longitude ?? loc?.coordinates?.[0])
  if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && Array.isArray(entity?.geometry?.coordinates)) {
    lng = Number(entity.geometry.coordinates[0])
    lat = Number(entity.geometry.coordinates[1])
  }
  const heading = Number(entity?.heading ?? props?.heading ?? props?.track ?? props?.cog ?? 0)
  const velocity = Number(
    entity?.velocity ??
      entity?.speed ??
      props?.velocity ??
      props?.speed ??
      props?.speed_kts ??
      props?.speed_knots ??
      props?.groundSpeed ??
      props?.sog ??
      0,
  )
  const sog = Number(entity?.sog ?? props?.sog ?? velocity)
  const cog = Number(entity?.cog ?? props?.cog ?? heading)
  const safeLat = Number.isFinite(lat) ? lat : 0
  const safeLng = Number.isFinite(lng) ? lng : 0
  return {
    id: String(entity?.id ?? ""),
    name: String(entity?.name ?? entity?.id ?? "Unknown"),
    description: String(entity?.name ?? entity?.entity_type ?? "moving object"),
    source: String(entity?.source ?? source),
    occurredAt: toIsoTimestamp(entity?.occurred_at),
    lat: safeLat,
    lng: safeLng,
    latitude: safeLat,
    longitude: safeLng,
    heading: Number.isFinite(heading) ? heading : 0,
    velocity: Number.isFinite(velocity) ? velocity : 0,
    speed: Number.isFinite(velocity) ? velocity : 0,
    sog: Number.isFinite(sog) ? sog : 0,
    cog: Number.isFinite(cog) ? cog : 0,
    location: {
      latitude: safeLat,
      longitude: safeLng,
      altitude: Number(props?.altitude_ft ?? props?.altitude ?? 0),
    },
    properties: {
      ...props,
      heading: Number.isFinite(heading) ? heading : 0,
      velocity: Number.isFinite(velocity) ? velocity : 0,
      speed: Number.isFinite(velocity) ? velocity : 0,
      speed_kts: Number.isFinite(velocity) ? velocity : 0,
      sog: Number.isFinite(sog) ? sog : 0,
      cog: Number.isFinite(cog) ? cog : 0,
      source: String(entity?.source ?? source),
      entityType: String(entity?.entity_type ?? ""),
      domain: String(entity?.domain ?? ""),
    },
  }
}

function moverLatLng(entity: any): { lat: number; lng: number } | null {
  const props = typeof entity?.properties === "object" && entity?.properties ? entity.properties : {}
  const loc = entity?.location as
    | { latitude?: number; longitude?: number; coordinates?: [number, number] }
    | undefined
  let lat = Number(entity?.lat ?? entity?.latitude ?? loc?.latitude ?? loc?.coordinates?.[1] ?? props?.lat ?? props?.latitude)
  let lng = Number(entity?.lng ?? entity?.longitude ?? loc?.longitude ?? loc?.coordinates?.[0] ?? props?.lng ?? props?.longitude)
  if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && Array.isArray(entity?.geometry?.coordinates)) {
    lng = Number(entity.geometry.coordinates[0])
    lat = Number(entity.geometry.coordinates[1])
  }
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

function filterMoverRowsToBounds(
  source: string,
  entities: any[],
  bounds?: { lat_min: number; lat_max: number; lng_min: number; lng_max: number },
) {
  if (!bounds || source === "satellites") return entities
  return entities.filter((entity) => {
    const coord = moverLatLng(entity)
    if (!coord) return false
    return coord.lat >= bounds.lat_min &&
      coord.lat <= bounds.lat_max &&
      coord.lng >= bounds.lng_min &&
      coord.lng <= bounds.lng_max
  })
}

function normalizeSatelliteEntity(entity: any, source: string) {
  const base = normalizeMoverEntity(entity, source)
  const props = typeof entity?.properties === "object" && entity?.properties ? entity.properties : {}
  const noradId = Number(entity?.noradId ?? entity?.norad_id ?? props?.noradId ?? props?.norad_id ?? props?.NORAD_CAT_ID ?? base.properties?.noradId)
  const line1 = entity?.line1 ?? entity?.tle1 ?? props?.line1 ?? props?.tle1 ?? props?.TLE_LINE1
  const line2 = entity?.line2 ?? entity?.tle2 ?? props?.line2 ?? props?.tle2 ?? props?.TLE_LINE2
  const tleEpoch = entity?.tleEpoch ?? entity?.tle_epoch ?? props?.tleEpoch ?? props?.epoch ?? props?.EPOCH
  const orbitType = entity?.orbitType ?? entity?.orbit_type ?? props?.orbitType ?? props?.orbit_type
  const objectType = entity?.objectType ?? entity?.object_type ?? props?.objectType ?? props?.object_type ?? props?.OBJECT_TYPE
  const country = entity?.country ?? props?.country ?? props?.owner ?? props?.COUNTRY_CODE
  const properties = {
    ...base.properties,
    ...props,
    noradId: Number.isFinite(noradId) && noradId > 0 ? noradId : base.properties?.noradId,
    line1,
    line2,
    tle1: line1,
    tle2: line2,
    epoch: tleEpoch,
    orbitType,
    objectType,
    country,
    meanMotion: entity?.meanMotion ?? props?.meanMotion ?? props?.MEAN_MOTION,
    eccentricity: entity?.eccentricity ?? props?.eccentricity ?? props?.ECCENTRICITY,
    inclination: entity?.inclination ?? props?.inclination ?? props?.INCLINATION,
    raAscNode: entity?.raAscNode ?? props?.raAscNode ?? props?.RA_OF_ASC_NODE,
    argPericenter: entity?.argPericenter ?? props?.argPericenter ?? props?.ARG_OF_PERICENTER,
    meanAnomaly: entity?.meanAnomaly ?? props?.meanAnomaly ?? props?.MEAN_ANOMALY,
    bstar: entity?.bstar ?? props?.bstar ?? props?.BSTAR,
  }
  return {
    ...entity,
    ...base,
    type: "satellite",
    noradId: Number.isFinite(noradId) && noradId > 0 ? noradId : undefined,
    orbitType,
    objectType,
    country,
    tleEpoch,
    line1,
    line2,
    meanMotion: properties.meanMotion,
    eccentricity: properties.eccentricity,
    inclination: properties.inclination,
    raAscNode: properties.raAscNode,
    argPericenter: properties.argPericenter,
    meanAnomaly: properties.meanAnomaly,
    bstar: properties.bstar,
    properties,
  }
}

function formatMoverPayload(
  source: string,
  layer: string,
  data: any,
  sourceLabel: "live" | "fallback" | "unavailable",
  bounds?: { lat_min: number; lat_max: number; lng_min: number; lng_max: number },
) {
  const entitiesFromLayer = Array.isArray(data?.entities) ? data.entities : []
  const entitiesFromLegacy =
    source === "aircraft"
      ? Array.isArray(data?.aircraft) ? data.aircraft : []
      : source === "vessels"
        ? Array.isArray(data?.vessels) ? data.vessels : []
        : source === "satellites"
          ? Array.isArray(data?.satellites) ? data.satellites : []
          : []
  const entities = filterMoverRowsToBounds(
    source,
    entitiesFromLayer.length > 0 ? entitiesFromLayer : entitiesFromLegacy,
    bounds,
  )
  const timestamp = latestEntityTimestamp(entities)
  const freshness = {
    timestamp,
    stale: isStaleTimestamp(timestamp, 3 * 60 * 1000),
    maxAgeMs: 3 * 60 * 1000,
  }
  const lineage = {
    primary: "mindex",
    activeSource: sourceLabel,
    fallback: sourceLabel === "fallback",
  }
  const base = {
    source,
    layer,
    timestamp,
    total: entities.length,
    entities,
    freshness,
    lineage,
  }

  if (source === "aircraft") {
    return { ...base, aircraft: entities.map((entity: any) => normalizeMoverEntity(entity, source)) }
  }
  if (source === "vessels") {
    return { ...base, vessels: entities.map((entity: any) => normalizeMoverEntity(entity, source)), isLive: sourceLabel !== "unavailable" }
  }
  if (source === "satellites") {
    return { ...base, category: "all", satellites: entities.map((entity: any) => normalizeSatelliteEntity(entity, source)) }
  }
  return base
}

function parseAndClampBounds(
  latMinRaw: string,
  latMaxRaw: string,
  lngMinRaw: string,
  lngMaxRaw: string,
) {
  const latMin = Number(latMinRaw)
  const latMax = Number(latMaxRaw)
  const lngMin = Number(lngMinRaw)
  const lngMax = Number(lngMaxRaw)
  if (![latMin, latMax, lngMin, lngMax].every(Number.isFinite)) return null
  const clamped = {
    lat_min: Math.max(-90, Math.min(90, latMin)),
    lat_max: Math.max(-90, Math.min(90, latMax)),
    lng_min: Math.max(-180, Math.min(180, lngMin)),
    lng_max: Math.max(-180, Math.min(180, lngMax)),
  }
  if (clamped.lat_min > clamped.lat_max || clamped.lng_min > clamped.lng_max) return null
  return clamped
}

function cacheKeyFor(source: string, limit: string, bounds: { lat_min: number; lat_max: number; lng_min: number; lng_max: number }) {
  return `${source}|${limit}|${bounds.lat_min.toFixed(4)}|${bounds.lat_max.toFixed(4)}|${bounds.lng_min.toFixed(4)}|${bounds.lng_max.toFixed(4)}`
}

function cacheHeaders(sourceLabel: "live" | "fallback" | "unavailable", layer: string, status: "hit" | "stale" | "miss") {
  return {
    "X-MINDEX-Source": sourceLabel,
    "X-MINDEX-Layer": layer,
    "X-Proxy-Cache": status,
    "Cache-Control": "public, max-age=2, stale-while-revalidate=30",
  }
}

function normalizeSpeciesFallback(data: any, bounds: { lat_min: string; lat_max: string; lng_min: string; lng_max: string }) {
  const observations = Array.isArray(data?.observations) ? data.observations : []
  return {
    layer: "species",
    entities: observations.map((obs: any) => ({
      ...obs,
      lat: obs.lat ?? obs.latitude,
      lng: obs.lng ?? obs.longitude,
      name: obs.species || obs.commonName || obs.scientificName || "Unknown",
      source: obs.source || "iNaturalist",
    })),
    observations,
    total: observations.length,
    bounds: {
      lat_min: Number(bounds.lat_min),
      lat_max: Number(bounds.lat_max),
      lng_min: Number(bounds.lng_min),
      lng_max: Number(bounds.lng_max),
    },
    source: "live_api_fallback",
    upstream: data?.meta || null,
  }
}

async function fetchLiveSpeciesFallback(bounds: { lat_min: string; lat_max: string; lng_min: string; lng_max: string }, limit: string) {
  const requested = Math.min(Math.max(Number(limit) || 200, 1), 1000)
  const pages = Math.max(1, Math.ceil(requested / 200))
  const observations: any[] = []

  for (let page = 1; page <= pages && observations.length < requested; page++) {
    const params = new URLSearchParams({
      quality_grade: "research,needs_id",
      per_page: String(Math.min(200, requested - observations.length)),
      page: String(page),
      order: "desc",
      order_by: "observed_on",
      geo: "true",
      photos: "true",
      swlat: bounds.lat_min,
      nelat: bounds.lat_max,
      swlng: bounds.lng_min,
      nelng: bounds.lng_max,
    })

    const res = await fetch(`${INATURALIST_API}/observations?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mycosoft-CREP/1.0 (+https://mycosoft.com)",
      },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    })
    if (!res.ok) break

    const data = await res.json()
    const results = Array.isArray(data?.results) ? data.results : []
    for (const obs of results) {
      const coords = obs.geojson?.coordinates
      const lng = Number(coords?.[0] ?? obs.location?.split(",")?.[1])
      const lat = Number(coords?.[1] ?? obs.location?.split(",")?.[0])
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      observations.push({
        id: `inat-${obs.id}`,
        externalId: String(obs.id),
        species: obs.taxon?.preferred_common_name || obs.taxon?.name || "Unknown",
        scientificName: obs.taxon?.name || "Unknown",
        commonName: obs.taxon?.preferred_common_name,
        latitude: lat,
        longitude: lng,
        timestamp: obs.observed_on || obs.created_at,
        source: "iNaturalist",
        verified: obs.quality_grade === "research",
        observer: obs.user?.login || "Anonymous",
        imageUrl: obs.photos?.[0]?.url?.replace("square", "medium"),
        thumbnailUrl: obs.photos?.[0]?.url,
        location: obs.place_guess,
        hasGps: true,
        geocodeStatus: "complete",
        kingdom: obs.taxon?.iconic_taxon_name || "Unknown",
        iconicTaxon: obs.taxon?.iconic_taxon_name || "Unknown",
        taxonId: obs.taxon?.id,
        sourceUrl: obs.uri || `https://www.inaturalist.org/observations/${obs.id}`,
      })
    }
    if (results.length < 200) break
  }

  return normalizeSpeciesFallback(
    {
      observations: observations.slice(0, requested),
      meta: {
        total: observations.length,
        sources: { mindex: 0, iNaturalist: observations.length, gbif: 0 },
        dataSource: "live_inaturalist_proxy_fallback",
      },
    },
    bounds,
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { source } = await params
  const { searchParams } = new URL(request.url)

  // Special-case local MycoBrain devices so /api/mindex/proxy/devices never 400s.
  if (source === "devices") {
    try {
      const baseUrl = new URL(request.url).origin
      const res = await fetch(new URL("/api/mycobrain", baseUrl).toString(), {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      })
      const body = res.ok ? await res.json() : { devices: [] }
      return NextResponse.json(
        {
          source,
          layer: "devices",
          timestamp: new Date().toISOString(),
          total: Array.isArray(body?.devices) ? body.devices.length : 0,
          entities: Array.isArray(body?.devices) ? body.devices : [],
          devices: Array.isArray(body?.devices) ? body.devices : [],
          freshness: { timestamp: new Date().toISOString(), stale: false, maxAgeMs: 120000 },
          lineage: { primary: "local-device-service", activeSource: "live", fallback: false },
        },
        { headers: cacheHeaders("live", "devices", "miss") },
      )
    } catch {
      return NextResponse.json(
        {
          source,
          layer: "devices",
          timestamp: new Date().toISOString(),
          total: 0,
          entities: [],
          devices: [],
          freshness: { timestamp: new Date().toISOString(), stale: true, maxAgeMs: 120000 },
          lineage: { primary: "local-device-service", activeSource: "unavailable", fallback: true },
        },
        { headers: cacheHeaders("unavailable", "devices", "miss") },
      )
    }
  }

  const mindexLayer = SOURCE_TO_MINDEX_LAYER[source]
  if (!mindexLayer) {
    return NextResponse.json(
      { error: `Unknown source: ${source}`, available: Object.keys(SOURCE_TO_MINDEX_LAYER) },
      { status: 400 }
    )
  }

  // Build MINDEX earth/map/bbox query params
  const lat_min = searchParams.get("lat_min") || searchParams.get("south") || "-90"
  const lat_max = searchParams.get("lat_max") || searchParams.get("north") || "90"
  const lng_min = searchParams.get("lng_min") || searchParams.get("west") || "-180"
  const lng_max = searchParams.get("lng_max") || searchParams.get("east") || "180"
  const limitNum = Math.max(1, Math.min(50000, Number(searchParams.get("limit") || "500") || 500))
  const limit = String(limitNum)
  const bounds = parseAndClampBounds(lat_min, lat_max, lng_min, lng_max)
  if (!bounds) {
    return NextResponse.json(
      { error: "Invalid bounding box or limit parameters", source, layer: mindexLayer },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    )
  }
  const proxyKey = cacheKeyFor(source, limit, bounds)
  const cached = proxyResponseCache.get(proxyKey)
  const now = Date.now()
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.body, { headers: cacheHeaders(cached.sourceLabel, mindexLayer, "hit") })
  }
  const liveFallbackEnabled =
    searchParams.get("liveFallback") === "true" ||
    searchParams.get("fallbackLive") === "true" ||
    process.env.CREP_ENABLE_LIVE_NATURE_FALLBACK === "1"

  try {
    // Primary: Query MINDEX earth/map/bbox endpoint (PostGIS spatial query + Redis cache)
    const mindexUrl = `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=${mindexLayer}&lat_min=${bounds.lat_min}&lat_max=${bounds.lat_max}&lng_min=${bounds.lng_min}&lng_max=${bounds.lng_max}&limit=${limit}`

    const res = await fetch(mindexUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(MINDEX_PROXY_TIMEOUT_MS),
      headers: mindexHeaders(),
    })

    if (res.ok) {
      const data = await res.json()
      const emptyLiveLayer =
        entityCount(data) === 0 &&
        (mindexLayer === "species" || ["aircraft", "vessels", "satellites"].includes(source))
      if (emptyLiveLayer) {
        console.warn(
          `[MINDEX/Proxy] MINDEX ${mindexLayer} returned 0 entities for bbox; using live OEI fallback`,
        )
      } else {
        const payload = ["aircraft", "vessels", "satellites"].includes(source)
          ? formatMoverPayload(source, mindexLayer, data, "live", bounds)
          : data
        proxyResponseCache.set(proxyKey, {
          body: payload,
          sourceLabel: "live",
          expiresAt: now + PROXY_CACHE_TTL_MS,
          staleUntil: now + PROXY_CACHE_STALE_MS,
        })
        return NextResponse.json(payload, { headers: cacheHeaders("live", mindexLayer, "miss") })
      }
    }

    console.warn(`[MINDEX/Proxy] MINDEX returned ${res.status} for layer=${mindexLayer}`)
  } catch (err) {
    console.warn(`[MINDEX/Proxy] MINDEX unreachable for layer=${mindexLayer}:`, err)
  }

  // Fallback: Try internal API routes (no MINDEX caching, no persistence)
  const fallbackRoute = FALLBACK_ROUTES[source]
  if (fallbackRoute) {
    try {
      if (mindexLayer === "species") {
        if (!liveFallbackEnabled) {
          return NextResponse.json(
            {
              available: false,
              source,
              layer: mindexLayer,
              entities: [],
              observations: [],
              features: [],
              total: 0,
              message: "MINDEX species cache unavailable; live fallback disabled for low-latency map loading",
            },
            {
              headers: {
                "Cache-Control": "no-store",
                "X-MINDEX-Source": "unavailable",
                "X-MINDEX-Layer": mindexLayer,
              },
            },
          )
        }
        const body = await fetchLiveSpeciesFallback({ lat_min, lat_max, lng_min, lng_max }, limit)
        if (body.total > 0) {
          return NextResponse.json(body, {
            status: 200,
          headers: cacheHeaders("fallback", mindexLayer, "miss"),
          })
        }
      }

      const baseUrl = new URL(request.url).origin

      const fallbackUrl = new URL(fallbackRoute, baseUrl)
      // Forward bbox params
      fallbackUrl.searchParams.set("lat_min", lat_min)
      fallbackUrl.searchParams.set("lat_max", lat_max)
      fallbackUrl.searchParams.set("lng_min", lng_min)
      fallbackUrl.searchParams.set("lng_max", lng_max)
      fallbackUrl.searchParams.set("south", lat_min)
      fallbackUrl.searchParams.set("north", lat_max)
      fallbackUrl.searchParams.set("west", lng_min)
      fallbackUrl.searchParams.set("east", lng_max)
      fallbackUrl.searchParams.set("limit", limit)
      if (mindexLayer === "species") fallbackUrl.searchParams.set("nocache", "true")
      if (source === "vessels") {
        fallbackUrl.searchParams.set("lamin", lat_min)
        fallbackUrl.searchParams.set("lamax", lat_max)
        fallbackUrl.searchParams.set("lomin", lng_min)
        fallbackUrl.searchParams.set("lomax", lng_max)
        fallbackUrl.searchParams.set("publish", "true")
        fallbackUrl.searchParams.set("refresh", "true")
      }
      if (source === "satellites") {
        fallbackUrl.searchParams.set("category", "active")
        fallbackUrl.searchParams.set("mode", "registry")
      }

      const fallbackRes = await fetch(fallbackUrl.toString(), {
        cache: "no-store",
        signal: AbortSignal.timeout(FALLBACK_TIMEOUT_MS),
      })

      if (fallbackRes.ok) {
        const data = await fallbackRes.json()
        const body = mindexLayer === "species"
          ? normalizeSpeciesFallback(data, { lat_min, lat_max, lng_min, lng_max })
          : ["aircraft", "vessels", "satellites"].includes(source)
            ? formatMoverPayload(source, mindexLayer, data, "fallback", bounds)
            : data
        proxyResponseCache.set(proxyKey, {
          body,
          sourceLabel: "fallback",
          expiresAt: now + PROXY_CACHE_TTL_MS,
          staleUntil: now + PROXY_CACHE_STALE_MS,
        })
        return NextResponse.json(body, {
          status: 200,
          headers: {
            "X-MINDEX-Source": "fallback",
            "X-MINDEX-Layer": mindexLayer,
            "X-MINDEX-Warning": "mindex-unavailable-using-direct-api",
            "X-Proxy-Cache": "miss",
            "Cache-Control": "public, max-age=2, stale-while-revalidate=30",
          },
        })
      }
    } catch {
      // Both MINDEX and fallback failed
    }
  }

  if (cached && cached.staleUntil > now) {
    return NextResponse.json(cached.body, { headers: cacheHeaders(cached.sourceLabel, mindexLayer, "stale") })
  }

  return NextResponse.json(
    {
      available: false,
      source,
      layer: mindexLayer,
      entities: [],
      observations: [],
      features: [],
      total: 0,
      message: `MINDEX and fallback APIs are unreachable for ${source}`,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-MINDEX-Source": "unavailable",
        "X-MINDEX-Layer": mindexLayer,
      },
    }
  )
}

/**
 * POST -- Ingest data into MINDEX for a given source.
 * Used by CREP collectors and ETL pipelines to push data into MINDEX.
 *
 * Body: { entities: [{ lat, lng, timestamp, ...properties }] }
 *
 * Each entity MUST include lat, lng, and timestamp. The handler normalizes
 * missing timestamps to the current server time and validates coordinates.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { source } = await params
  const body = await request.json()

  const mindexLayer = SOURCE_TO_MINDEX_LAYER[source]
  if (!mindexLayer) {
    return NextResponse.json(
      { error: `Unknown source: ${source}`, available: Object.keys(SOURCE_TO_MINDEX_LAYER) },
      { status: 400 }
    )
  }

  const rawEntities: Record<string, unknown>[] = body.entities || []
  if (rawEntities.length === 0) {
    return NextResponse.json({ ingested: 0, source, layer: mindexLayer })
  }

  // Normalize: ensure every entity has lat, lng, timestamp
  const now = new Date().toISOString()
  const entities = rawEntities.map(e => ({
    ...e,
    lat: e.lat ?? e.latitude ?? null,
    lng: e.lng ?? e.longitude ?? null,
    timestamp: e.timestamp || now,
  }))

  // Filter out entities without valid coordinates
  const valid = entities.filter(e => e.lat != null && e.lng != null)

  try {
    const ingestHeaders: Record<string, string> = { "Content-Type": "application/json" }
    if (MINDEX_API_KEY) ingestHeaders["X-API-Key"] = MINDEX_API_KEY
    const res = await fetch(`${MINDEX_URL}/api/mindex/earth/ingest`, {
      method: "POST",
      headers: ingestHeaders,
      body: JSON.stringify({
        source,
        layer: mindexLayer,
        timestamp: now,
        entities: valid,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({
        ...data,
        ingested: valid.length,
        dropped: rawEntities.length - valid.length,
        source,
        layer: mindexLayer,
      })
    }

    return NextResponse.json(
      {
        ingested: 0,
        dropped: rawEntities.length,
        source,
        layer: mindexLayer,
        persisted: false,
        available: false,
        warning: `MINDEX ingest failed: ${res.status}`,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    )
  } catch (err) {
    return NextResponse.json(
      {
        ingested: 0,
        dropped: rawEntities.length,
        source,
        layer: mindexLayer,
        persisted: false,
        available: false,
        warning: "MINDEX unreachable for ingest",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    )
  }
}
