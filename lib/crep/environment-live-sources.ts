/**
 * Real live sources for Earth Sim env BFFs.
 * MINDEX `/api/mindex/environment/*` is 404 on 189. Use earth/map/bbox + NIFC.
 * No mock features.
 */

import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export type Bounds = { west: number; south: number; east: number; north: number }

type MapEntity = {
  lat?: number
  lng?: number
  latitude?: number
  longitude?: number
  name?: string
  source?: string
  occurred_at?: string
  properties?: Record<string, unknown>
  [key: string]: unknown
}

function internalToken(): string {
  const raw = process.env.MINDEX_INTERNAL_TOKEN || process.env.MINDEX_INTERNAL_TOKENS || ""
  return (raw.includes(",") ? raw.split(",")[0] : raw).trim()
}

function inBounds(lat: number, lng: number, b: Bounds): boolean {
  if (lat < b.south || lat > b.north) return false
  if (b.west <= b.east) return lng >= b.west && lng <= b.east
  return lng >= b.west || lng <= b.east
}

export async function fetchMindexMapLayer(
  layer: "weather" | "air_quality" | "wildfires",
  bounds: Bounds,
  limit: number,
): Promise<MapEntity[] | null> {
  const token = internalToken()
  const qs = new URLSearchParams({
    layer,
    lat_min: String(bounds.south),
    lat_max: String(bounds.north),
    lng_min: String(bounds.west),
    lng_max: String(bounds.east),
    limit: String(limit),
  })
  const url = `${resolveMindexServerBaseUrl()}/api/mindex/earth/map/bbox?${qs.toString()}`
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(token ? { "X-Internal-Token": token } : {}),
        ...(process.env.MINDEX_API_KEY ? { "X-API-Key": process.env.MINDEX_API_KEY } : {}),
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })
    if (!res.ok) return null
    const body = await res.json()
    const items = Array.isArray(body?.entities)
      ? body.entities
      : Array.isArray(body?.items)
        ? body.items
        : Array.isArray(body?.data)
          ? body.data
          : []
    return items
  } catch {
    return null
  }
}

export async function fetchNifcWildfires(bounds: Bounds, limit: number): Promise<MapEntity[]> {
  try {
    const params = new URLSearchParams({
      where: "IncidentTypeCategory = 'WF' AND IncidentSize > 0",
      outFields: "IncidentName,IncidentSize,POOState,FireCause,FireDiscoveryDateTime,PercentContained",
      f: "geojson",
      returnGeometry: "true",
      orderByFields: "IncidentSize DESC",
      resultRecordCount: String(Math.min(800, Math.max(limit, 50))),
    })
    const res = await fetch(
      `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0/query?${params.toString()}`,
      { signal: AbortSignal.timeout(6000), cache: "no-store" },
    )
    if (!res.ok) return []
    const data = await res.json()
    const features = Array.isArray(data?.features) ? data.features : []
    const rows: MapEntity[] = []
    for (const feature of features) {
      const lng = Number(feature?.geometry?.coordinates?.[0])
      const lat = Number(feature?.geometry?.coordinates?.[1])
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inBounds(lat, lng, bounds)) continue
      const p = feature.properties || {}
      rows.push({
        lat,
        lng,
        name: p.IncidentName ? `${p.IncidentName} Fire` : "Active wildfire",
        source: "nifc_wfigs",
        detected_at: p.FireDiscoveryDateTime ?? new Date().toISOString(),
        status: Number.isFinite(Number(p.PercentContained)) ? `${p.PercentContained}% contained` : "active",
        severity: Number(p.IncidentSize) >= 25_000 ? "high" : Number(p.IncidentSize) >= 500 ? "medium" : "low",
        source_id: String(feature.id ?? `${lat},${lng}`),
      })
      if (rows.length >= limit) break
    }
    return rows
  } catch {
    return []
  }
}

export function entityLatLng(row: MapEntity): { lat: number; lng: number } | null {
  const lat = Number(row.lat ?? row.latitude)
  const lng = Number(row.lng ?? row.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}
