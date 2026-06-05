/**
 * Earth entity bridge — May 27, 2026
 *
 * Canonical IDs and routes shared by Fluid Search and Earth Simulator.
 * Every geospatial hit should use stable keys and deep-link URLs.
 */

import type { LocationResult } from "@/components/search/fluid/widgets/LocationWidget"

export interface EarthEntityBridgeFields {
  entityKey: string
  mindexEntityId: string
  earthSimulatorUrl: string
  detailRoute?: string
  lat: number
  lng: number
}

export type EarthGeospatialDomain =
  | "observations"
  | "events"
  | "aircraft"
  | "vessels"
  | "satellites"
  | "weather"
  | "emissions"
  | "infrastructure"
  | "devices"
  | "space_weather"
  | "cameras"
  | "species"
  | "crep"
  | "location"

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

export function extractLatLng(item: Record<string, unknown>): { lat?: number; lng?: number } {
  const geo = asRecord(item.geojson)
  const coords = Array.isArray(geo.coordinates) ? geo.coordinates : item.coordinates
  const lat = Number(
    item.lat ??
      item.latitude ??
      (Array.isArray(coords) ? coords[1] : undefined)
  )
  const lng = Number(
    item.lng ??
      item.longitude ??
      (Array.isArray(coords) ? coords[0] : undefined)
  )
  const ok =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  return ok ? { lat, lng } : {}
}

export function normalizeDomain(raw: unknown, fallback: string): string {
  const d = String(raw || fallback).trim().toLowerCase().replace(/\s+/g, "_")
  return d || fallback
}

/** Stable key: domain + source id (survives merge/dedup across widgets). */
export function canonicalEntityKey(domain: string, rawId: unknown): string {
  const id = String(rawId ?? "").trim()
  if (!id) return `${domain}:unknown`
  if (id.includes(":")) return id
  return `${normalizeDomain(domain, "entity")}:${id}`
}

export function buildEarthSimulatorUrl(
  lat: number,
  lng: number,
  highlightId?: string,
  zoom = 8
): string {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    zoom: String(zoom),
  })
  if (highlightId) params.set("highlight", highlightId)
  return `/natureos/earth-simulator?${params.toString()}`
}

/** Detail pages for MINDEX-backed biology (shared with Search widgets). */
export function buildDetailRoute(
  domain: string,
  rawId: unknown,
  props?: Record<string, unknown>
): string | undefined {
  const id = String(rawId ?? "").replace(/^mindex-/, "").trim()
  if (!id) return undefined
  const d = normalizeDomain(domain, "")
  if (d === "taxa" || d === "species" || d === "observations") {
    const taxonId = String(props?.taxon_id ?? props?.taxonId ?? id).replace(/^mindex-/, "")
    return `/natureos/mindex/explorer?taxon=${encodeURIComponent(taxonId)}`
  }
  if (d === "compounds") {
    return `/compounds?q=${encodeURIComponent(String(props?.name ?? props?.compound_name ?? id))}`
  }
  if (d === "genetics" || d === "sequences") {
    const acc = String(props?.accession ?? props?.genbank_id ?? id)
    return `/natureos/genetics?accession=${encodeURIComponent(acc)}`
  }
  if (d === "research") {
    const doi = String(props?.doi ?? "")
    if (doi) return `/natureos/mindex/research?doi=${encodeURIComponent(doi)}`
  }
  return undefined
}

export function enrichEarthEntity(
  item: Record<string, unknown>,
  domain: string
): Record<string, unknown> & EarthEntityBridgeFields {
  const { lat, lng } = extractLatLng(item)
  const entityDomain = normalizeDomain(item.domain ?? item.entity_type ?? item.type ?? domain, domain)
  const rawId = item.id ?? item.mindex_id ?? item.entity_id
  const entityKey = canonicalEntityKey(entityDomain, rawId)
  const mindexEntityId = String(rawId ?? entityKey)
  const bridgeLat = lat ?? 0
  const bridgeLng = lng ?? 0
  const earthSimulatorUrl =
    lat != null && lng != null
      ? buildEarthSimulatorUrl(lat, lng, entityKey)
      : buildEarthSimulatorUrl(0, 0, entityKey)
  const detailRoute = buildDetailRoute(entityDomain, rawId, item)
  return {
    ...item,
    id: mindexEntityId,
    entityKey,
    mindexEntityId,
    earthSimulatorUrl,
    crepMapUrl: item.crepMapUrl ?? (lat != null && lng != null ? earthSimulatorUrl : undefined),
    detailRoute,
    lat: bridgeLat,
    lng: bridgeLng,
    domain: entityDomain,
  }
}

export function mindexUniversalRowToRecord(row: Record<string, unknown>): Record<string, unknown> {
  const props = asRecord(row.properties)
  return enrichEarthEntity(
    {
      id: row.id,
      domain: row.domain,
      entity_type: row.entity_type,
      name: row.name,
      title: row.name,
      description: row.description,
      lat: row.lat,
      lng: row.lng,
      timestamp: row.occurred_at,
      occurred_at: row.occurred_at,
      source: row.source,
      image_url: row.image_url,
      imageUrl: row.image_url,
      ...props,
    },
    String(row.domain ?? "entity")
  )
}

export function earthItemToLocationResult(
  item: Record<string, unknown>,
  domain: string
): LocationResult | null {
  const enriched = enrichEarthEntity(item, domain)
  const { lat, lng } = extractLatLng(enriched)
  if (lat == null || lng == null) return null
  const title = String(
    enriched.title ??
      enriched.name ??
      enriched.callsign ??
      enriched.speciesName ??
      enriched.commonName ??
      enriched.species ??
      "Entity"
  )
  return {
    id: enriched.entityKey,
    speciesName: title,
    commonName: String(enriched.commonName ?? enriched.description ?? title).slice(0, 120),
    lat,
    lng,
    observedAt: String(
      enriched.observedAt ??
        enriched.timestamp ??
        enriched.occurred_at ??
        enriched.lastSeen ??
        ""
    ),
    imageUrl: String(enriched.imageUrl ?? enriched.image_url ?? enriched.thumbnailUrl ?? "") || undefined,
    isToxic: Boolean(enriched.isToxic),
  }
}

export function collectGeospatialLocationResults(input: {
  locationApi?: LocationResult[]
  species?: Array<{ id?: string; lat?: number; lng?: number; scientificName?: string; commonName?: string; imageUrl?: string }>
  liveResults?: Array<{ id?: string; lat?: number; lng?: number; species?: string; imageUrl?: string; date?: string }>
  crepMerged?: Record<string, unknown>[]
  earthBuckets?: Partial<Record<string, unknown[] | undefined>>
  limit?: number
}): LocationResult[] {
  const limit = input.limit ?? 40
  const seen = new Set<string>()
  const out: LocationResult[] = []

  const push = (row: LocationResult | null) => {
    if (!row || seen.has(row.id)) return
    seen.add(row.id)
    out.push(row)
  }

  for (const loc of input.locationApi ?? []) {
    const enriched = enrichEarthEntity(
      {
        id: loc.id,
        name: loc.commonName || loc.speciesName,
        lat: loc.lat,
        lng: loc.lng,
        image_url: loc.imageUrl,
        observed_at: loc.observedAt,
      },
      "observations"
    )
    push(earthItemToLocationResult(enriched, "observations"))
  }

  for (const s of input.species ?? []) {
    if (s.lat == null || s.lng == null) continue
    push(
      earthItemToLocationResult(
        enrichEarthEntity(
          {
            id: s.id,
            name: s.commonName || s.scientificName,
            scientificName: s.scientificName,
            lat: s.lat,
            lng: s.lng,
            image_url: s.imageUrl,
          },
          "taxa"
        ),
        "taxa"
      )
    )
  }

  for (const live of input.liveResults ?? []) {
    if (live.lat == null || live.lng == null) continue
    push(
      earthItemToLocationResult(
        enrichEarthEntity(
          {
            id: live.id,
            name: live.species,
            lat: live.lat,
            lng: live.lng,
            image_url: live.imageUrl,
            occurred_at: live.date,
          },
          "observations"
        ),
        "observations"
      )
    )
  }

  for (const row of input.crepMerged ?? []) {
    const rec = asRecord(row)
    push(
      earthItemToLocationResult(
        enrichEarthEntity(
          {
            ...rec,
            lat: rec.latitude ?? rec.lat,
            lng: rec.longitude ?? rec.lng,
            name: rec.title,
          },
          String(rec.type ?? "crep")
        ),
        String(rec.type ?? "crep")
      )
    )
  }

  const bucketNames = [
    "events",
    "aircraft",
    "vessels",
    "satellites",
    "weather",
    "emissions",
    "infrastructure",
    "devices",
    "space_weather",
    "cameras",
  ] as const
  for (const bucket of bucketNames) {
    const items = input.earthBuckets?.[bucket]
    if (!Array.isArray(items)) continue
    for (const raw of items) {
      push(earthItemToLocationResult(enrichEarthEntity(asRecord(raw), bucket), bucket))
    }
  }

  return out.slice(0, limit)
}

export function mapMindexEarthResponse(data: Record<string, unknown>): Record<string, unknown[]> {
  const results = asRecord(data.results)
  const universal = Array.isArray(data.universal_results) ? data.universal_results : []
  const out: Record<string, unknown[]> = { ...results } as Record<string, unknown[]>

  for (const row of universal) {
    const rec = mindexUniversalRowToRecord(asRecord(row))
    const domain = normalizeDomain(rec.domain, "entity")
    const bucket =
      domain === "earthquakes" || domain === "volcanoes" || domain === "wildfires"
        ? "events"
        : domain === "observations"
          ? "observations"
          : domain
    if (!out[bucket]) out[bucket] = []
    out[bucket].push(rec)
  }

  return out
}
