import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Bbox = [number, number, number, number]

const GBIF_OCCURRENCE_SEARCH = "https://api.gbif.org/v1/occurrence/search"
const MAX_RESPONSE_FEATURES = 800
const GBIF_LIMIT = 300
const PRELOADS: Array<{ id: string; file: string; bbox: Bbox }> = [
  { id: "sf-inat", file: "public/data/crep/sf-inat.geojson", bbox: [-122.6, 37.6, -122.25, 37.95] },
  { id: "peninsula-inat", file: "public/data/crep/peninsula-inat.geojson", bbox: [-122.35, 37.2, -121.95, 37.58] },
]

let preloadCache = new Map<string, any[]>()

function parseBbox(value: string | null): Bbox | null {
  if (!value) return null
  const parts = value.split(",").map((part) => Number(part.trim()))
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null
  const [w, s, e, n] = parts
  if (w >= e || s >= n || w < -180 || e > 180 || s < -90 || n > 90) return null
  return [w, s, e, n]
}

function intersects(a: Bbox, b: Bbox): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]
}

function pointInBbox(coords: unknown, bbox: Bbox): boolean {
  if (!Array.isArray(coords) || coords.length < 2) return false
  const lng = Number(coords[0])
  const lat = Number(coords[1])
  return Number.isFinite(lng) && Number.isFinite(lat) && lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3]
}

function normalizePreloadFeature(feature: any, preloadId: string) {
  const properties = feature?.properties || {}
  return {
    type: "Feature" as const,
    properties: {
      ...properties,
      id: properties.id || properties.inat_id || `${preloadId}-${feature?.geometry?.coordinates?.join(",")}`,
      source: properties.source || "iNaturalist",
      preload: preloadId,
    },
    geometry: feature.geometry,
  }
}

function normalizeGbifFeature(record: any) {
  return {
    type: "Feature" as const,
    properties: {
      id: `gbif-${record.key}`,
      gbif_key: record.key,
      name: record.species || record.scientificName || record.genericName || "Biodiversity record",
      sci_name: record.scientificName,
      common_name: record.vernacularName,
      taxon_id: record.taxonKey,
      kingdom: record.kingdom,
      class: record.class,
      order: record.order,
      family: record.family,
      genus: record.genus,
      event_date: record.eventDate,
      basis_of_record: record.basisOfRecord,
      source: "GBIF",
      url: record.key ? `https://www.gbif.org/occurrence/${record.key}` : undefined,
    },
    geometry: {
      type: "Point" as const,
      coordinates: [record.decimalLongitude, record.decimalLatitude],
    },
  }
}

async function loadPreloadFeatures(preload: { id: string; file: string; bbox: Bbox }, bbox: Bbox): Promise<any[]> {
  if (!intersects(bbox, preload.bbox)) return []
  let features = preloadCache.get(preload.id)
  if (!features) {
    const raw = await readFile(path.join(process.cwd(), preload.file), "utf8")
    const geojson = JSON.parse(raw)
    features = Array.isArray(geojson?.features) ? geojson.features : []
    preloadCache.set(preload.id, features)
  }
  return features
    .filter((feature) => feature?.geometry?.type === "Point" && pointInBbox(feature.geometry.coordinates, bbox))
    .map((feature) => normalizePreloadFeature(feature, preload.id))
}

async function fetchGbifFeatures(bbox: Bbox, limit: number): Promise<any[]> {
  const [w, s, e, n] = bbox
  const params = new URLSearchParams({
    hasCoordinate: "true",
    limit: String(Math.min(limit, GBIF_LIMIT)),
    decimalLatitude: `${s},${n}`,
    decimalLongitude: `${w},${e}`,
  })
  const response = await fetch(`${GBIF_OCCURRENCE_SEARCH}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`GBIF ${response.status}`)
  const body = await response.json()
  return (body?.results || [])
    .filter((record: any) => record?.decimalLatitude != null && record?.decimalLongitude != null)
    .map(normalizeGbifFeature)
}

function mergeFeatures(groups: any[][], limit: number): any[] {
  const seen = new Set<string>()
  const merged: any[] = []
  for (const group of groups) {
    for (const feature of group) {
      const coords = feature?.geometry?.coordinates
      const properties = feature?.properties || {}
      const id = String(properties.id || properties.inat_id || properties.gbif_key || coords?.join(",") || merged.length)
      if (seen.has(id)) continue
      seen.add(id)
      merged.push(feature)
      if (merged.length >= limit) return merged
    }
  }
  return merged
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = parseBbox(url.searchParams.get("bbox"))
  if (!bbox) {
    return NextResponse.json(
      { success: false, error: "bbox must be w,s,e,n" },
      { status: 400 },
    )
  }

  const requestedLimit = Number(url.searchParams.get("limit") || MAX_RESPONSE_FEATURES)
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.floor(requestedLimit), 1), MAX_RESPONSE_FEATURES)
    : MAX_RESPONSE_FEATURES

  const preloadResults = await Promise.allSettled(PRELOADS.map((preload) => loadPreloadFeatures(preload, bbox)))
  const gbifResult = await Promise.allSettled([fetchGbifFeatures(bbox, limit)])

  const preloadFeatures = preloadResults.flatMap((result) => result.status === "fulfilled" ? result.value : [])
  const gbifFeatures = gbifResult.flatMap((result) => result.status === "fulfilled" ? result.value : [])
  const features = mergeFeatures([gbifFeatures, preloadFeatures], limit)

  const errors = [
    ...preloadResults.flatMap((result) => result.status === "rejected" ? [String(result.reason)] : []),
    ...gbifResult.flatMap((result) => result.status === "rejected" ? [String(result.reason)] : []),
  ]

  return NextResponse.json(
    {
      success: true,
      bbox,
      count: features.length,
      source_counts: {
        gbif: gbifFeatures.length,
        preload: preloadFeatures.length,
      },
      errors,
      features,
      generated_at: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    },
  )
}
