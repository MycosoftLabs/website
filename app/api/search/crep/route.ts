/**
 * CREP Search API Route
 *
 * Provides bidirectional search integration between the CREP dashboard
 * and the unified search system.
 *
 * Search → CREP:
 * - Query CREP entities by keyword, location, type
 * - Returns entities formatted for search result rendering
 * - Supports the CrepWidget in search results
 *
 * CREP → Search:
 * - Entity data enriched with MINDEX/MYCA context
 * - Fungal observations with species details
 * - Global events with impact analysis
 * - Device sensor readings with environmental correlations
 *
 * GET /api/search/crep?q=query&type=aircraft&bounds=north,south,east,west&limit=50
 */

import { NextRequest, NextResponse } from "next/server"
import { API_URLS } from "@/lib/config/api-urls"

export const dynamic = "force-dynamic"

interface CREPSearchResult {
  id: string
  type: "aircraft" | "vessel" | "satellite" | "fungal" | "event" | "device"
  title: string
  description: string
  latitude: number
  longitude: number
  altitude?: number
  timestamp: string
  source: string
  properties: Record<string, unknown>
  /** Search relevance score */
  relevance: number
  /** Can be opened on CREP map */
  crepMapUrl: string
}

interface CREPSearchResponse {
  results: CREPSearchResult[]
  total: number
  query: string
  filters: Record<string, string>
  timestamp: string
  sources: string[]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || ""
  const type = searchParams.get("type") // aircraft, vessel, satellite, fungal, event, device
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
  const offset = parseInt(searchParams.get("offset") || "0")

  // Bounds-based filtering
  const north = parseFloat(searchParams.get("north") || "90")
  const south = parseFloat(searchParams.get("south") || "-90")
  const east = parseFloat(searchParams.get("east") || "180")
  const west = parseFloat(searchParams.get("west") || "-180")

  const results: CREPSearchResult[] = []
  const sources: string[] = []
  const startTime = Date.now()

  try {
    // Parallel fetch from relevant CREP data sources
    const fetchPromises: Promise<void>[] = []

    // Fungal observations (always included - primary data)
    if (!type || type === "fungal") {
      fetchPromises.push(
        fetchFungalForSearch(query, { north, south, east, west }, limit).then((items) => {
          results.push(...items)
          if (items.length > 0) sources.push("MINDEX")
        })
      )
    }

    // Aircraft
    if (!type || type === "aircraft") {
      fetchPromises.push(
        fetchAircraftForSearch(query, limit).then((items) => {
          results.push(...items)
          if (items.length > 0) sources.push("FlightRadar24")
        })
      )
    }

    // Global events
    if (!type || type === "event") {
      fetchPromises.push(
        fetchEventsForSearch(query, limit).then((items) => {
          results.push(...items)
          if (items.length > 0) sources.push("USGS/NASA")
        })
      )
    }

    // Vessels
    if (!type || type === "vessel") {
      fetchPromises.push(
        fetchVesselsForSearch(query, limit).then((items) => {
          results.push(...items)
          if (items.length > 0) sources.push("AISstream")
        })
      )
    }

    // Devices
    if (!type || type === "device") {
      fetchPromises.push(
        fetchDevicesForSearch(query, limit).then((items) => {
          results.push(...items)
          if (items.length > 0) sources.push("MycoBrain")
        })
      )
    }

    await Promise.allSettled(fetchPromises)

    // Sort by relevance (query match score)
    results.sort((a, b) => b.relevance - a.relevance)

    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit)

    return NextResponse.json({
      results: paginatedResults,
      total: results.length,
      query,
      filters: { type: type || "all", limit: String(limit), offset: String(offset) },
      timestamp: new Date().toISOString(),
      sources,
      latency_ms: Date.now() - startTime,
    } satisfies CREPSearchResponse & { latency_ms: number })
  } catch (error) {
    console.error("[CREP Search] Error:", error)
    return NextResponse.json(
      {
        results: [],
        total: 0,
        query,
        filters: {},
        timestamp: new Date().toISOString(),
        sources: [],
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// Data Fetchers
// ============================================================================

async function fetchFungalForSearch(
  query: string,
  bounds: { north: number; south: number; east: number; west: number },
  limit: number
): Promise<CREPSearchResult[]> {
  try {
    const url = new URL(`${API_URLS.LOCAL_BASE}/api/crep/fungal`)
    if (query) url.searchParams.set("q", query)
    url.searchParams.set("limit", String(limit))
    url.searchParams.set("north", String(bounds.north))
    url.searchParams.set("south", String(bounds.south))
    url.searchParams.set("east", String(bounds.east))
    url.searchParams.set("west", String(bounds.west))

    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(2500) })
    if (!response.ok) return []

    const data = await response.json()
    const observations = data.observations || data.results || []

    return observations.map((obs: Record<string, unknown>) => {
      const species = String(obs.species || obs.species_name || "Unknown species")
      const relevance = query
        ? species.toLowerCase().includes(query.toLowerCase()) ? 0.9 : 0.5
        : 0.7

      return {
        id: String(obs.id),
        type: "fungal" as const,
        title: String(obs.common_name || obs.commonName || species),
        description: `${species} observed ${obs.location ? `at ${obs.location}` : ""} on ${obs.observed_on || obs.observedOn || "unknown date"}`,
        latitude: Number(obs.latitude || obs.lat || 0),
        longitude: Number(obs.longitude || obs.lng || 0),
        timestamp: String(obs.observed_on || obs.observedOn || new Date().toISOString()),
        source: String(obs.source || "MINDEX"),
        properties: {
          scientificName: obs.scientific_name || obs.scientificName,
          commonName: obs.common_name || obs.commonName,
          imageUrl: obs.image_url || obs.imageUrl,
          thumbnailUrl: obs.thumbnail_url || obs.thumbnailUrl,
          sourceUrl: obs.source_url || obs.sourceUrl,
          isToxic: obs.is_toxic || obs.isToxic,
          qualityGrade: obs.quality_grade || obs.qualityGrade,
          observer: obs.observer,
        },
        relevance,
        crepMapUrl: `/dashboard/crep?lat=${obs.latitude || obs.lat}&lng=${obs.longitude || obs.lng}&zoom=12&highlight=${obs.id}`,
      }
    })
  } catch (error) {
    console.warn("[CREP Search] Fungal fetch error:", error)
    return []
  }
}

async function fetchAircraftForSearch(
  query: string,
  limit: number
): Promise<CREPSearchResult[]> {
  try {
    const response = await fetch(`${API_URLS.LOCAL_BASE}/api/oei/flightradar24`, {
      signal: AbortSignal.timeout(2500),
    })
    if (!response.ok) return []

    const data = await response.json()
    const aircraft = data.aircraft || []

    return aircraft
      .filter((a: Record<string, unknown>) => {
        if (!query) return true
        const searchable = `${a.callsign || ""} ${a.origin || ""} ${a.destination || ""} ${a.type || ""}`.toLowerCase()
        return searchable.includes(query.toLowerCase())
      })
      .slice(0, limit)
      .map((a: Record<string, unknown>) => ({
        id: String(a.id || a.icao24),
        type: "aircraft" as const,
        title: String(a.callsign || a.flightNumber || a.id),
        description: `${a.type || "Aircraft"} ${a.origin && a.destination ? `from ${a.origin} to ${a.destination}` : ""} at ${a.altitude || 0}ft`,
        latitude: Number(a.lat || a.latitude || 0),
        longitude: Number(a.lng || a.longitude || 0),
        altitude: Number(a.altitude || 0),
        timestamp: String(a.lastSeen || new Date().toISOString()),
        source: "FlightRadar24",
        properties: {
          callsign: a.callsign,
          aircraftType: a.type || a.aircraftType,
          origin: a.origin,
          destination: a.destination,
          speed: a.speed || a.velocity,
          heading: a.heading,
        },
        relevance: query
          ? String(a.callsign || "").toLowerCase().includes(query.toLowerCase()) ? 0.95 : 0.6
          : 0.5,
        crepMapUrl: `/dashboard/crep?lat=${a.lat || a.latitude}&lng=${a.lng || a.longitude}&zoom=8&highlight=${a.id}`,
      }))
  } catch (error) {
    console.warn("[CREP Search] Aircraft fetch error:", error)
    return []
  }
}

async function fetchEventsForSearch(
  query: string,
  limit: number
): Promise<CREPSearchResult[]> {
  try {
    const response = await fetch(`${API_URLS.LOCAL_BASE}/api/natureos/global-events`, {
      signal: AbortSignal.timeout(2500),
    })
    if (!response.ok) return []

    const data = await response.json()
    const events = data.events || []

    return events
      .filter((e: Record<string, unknown>) => {
        if (!query) return true
        const searchable = `${e.title || ""} ${e.type || ""} ${e.description || ""}`.toLowerCase()
        return searchable.includes(query.toLowerCase())
      })
      .slice(0, limit)
      .map((e: Record<string, unknown>) => ({
        id: String(e.id),
        type: "event" as const,
        title: String(e.title || e.type || "Unknown event"),
        description: String(e.description || `${e.type} event - severity: ${e.severity || "unknown"}`),
        latitude: Number(e.lat || e.latitude || 0),
        longitude: Number(e.lng || e.longitude || 0),
        timestamp: String(e.timestamp || new Date().toISOString()),
        source: String(e.source || "USGS/NASA"),
        properties: {
          severity: e.severity,
          eventType: e.type,
          magnitude: e.magnitude,
          sourceUrl: e.sourceUrl || e.link,
        },
        relevance: query
          ? String(e.title || "").toLowerCase().includes(query.toLowerCase()) ? 0.9 : 0.6
          : 0.6,
        crepMapUrl: `/dashboard/crep?lat=${e.lat || e.latitude}&lng=${e.lng || e.longitude}&zoom=8&highlight=${e.id}`,
      }))
  } catch (error) {
    console.warn("[CREP Search] Events fetch error:", error)
    return []
  }
}

async function fetchVesselsForSearch(
  query: string,
  limit: number
): Promise<CREPSearchResult[]> {
  try {
    const response = await fetch(`${API_URLS.LOCAL_BASE}/api/oei/aisstream`, {
      signal: AbortSignal.timeout(2500),
    })
    if (!response.ok) return []

    const data = await response.json()
    const vessels = data.vessels || []

    return vessels
      .filter((v: Record<string, unknown>) => {
        if (!query) return true
        const searchable = `${v.name || ""} ${v.mmsi || ""} ${v.destination || ""}`.toLowerCase()
        return searchable.includes(query.toLowerCase())
      })
      .slice(0, limit)
      .map((v: Record<string, unknown>) => ({
        id: String(v.id || v.mmsi),
        type: "vessel" as const,
        title: String(v.name || v.mmsi || "Unknown vessel"),
        description: `${v.type || "Vessel"} ${v.destination ? `bound for ${v.destination}` : ""} at ${v.speed || v.sog || 0}kts`,
        latitude: Number(v.lat || v.latitude || 0),
        longitude: Number(v.lng || v.longitude || 0),
        timestamp: String(v.lastSeen || new Date().toISOString()),
        source: "AISstream",
        properties: {
          mmsi: v.mmsi,
          shipType: v.type || v.shipType,
          destination: v.destination,
          flag: v.flag,
          speed: v.speed || v.sog,
        },
        relevance: query
          ? String(v.name || "").toLowerCase().includes(query.toLowerCase()) ? 0.9 : 0.5
          : 0.4,
        crepMapUrl: `/dashboard/crep?lat=${v.lat || v.latitude}&lng=${v.lng || v.longitude}&zoom=8&highlight=${v.id}`,
      }))
  } catch (error) {
    console.warn("[CREP Search] Vessels fetch error:", error)
    return []
  }
}

async function fetchDevicesForSearch(
  query: string,
  limit: number
): Promise<CREPSearchResult[]> {
  try {
    const response = await fetch(`${API_URLS.LOCAL_BASE}/api/mycobrain/devices`, {
      signal: AbortSignal.timeout(2500),
    })
    if (!response.ok) return []

    const data = await response.json()
    const devices = data.devices || []

    return devices
      .filter((d: Record<string, unknown>) => {
        if (!query) return true
        const searchable = `${d.name || ""} ${d.type || ""} ${d.status || ""}`.toLowerCase()
        return searchable.includes(query.toLowerCase())
      })
      .slice(0, limit)
      .map((d: Record<string, unknown>) => ({
        id: String(d.id),
        type: "device" as const,
        title: String(d.name || d.id),
        description: `${d.type || "MycoBrain"} device - ${d.status || "unknown"}`,
        latitude: Number(d.lat || d.latitude || 0),
        longitude: Number(d.lng || d.longitude || 0),
        timestamp: String(d.lastSeen || d.lastUpdate || new Date().toISOString()),
        source: "MycoBrain",
        properties: {
          deviceType: d.type,
          status: d.status,
          firmware: d.firmware,
          sensorData: d.sensorData,
        },
        relevance: query
          ? String(d.name || "").toLowerCase().includes(query.toLowerCase()) ? 0.85 : 0.5
          : 0.5,
        crepMapUrl: `/dashboard/crep?lat=${d.lat || d.latitude}&lng=${d.lng || d.longitude}&zoom=14&highlight=${d.id}`,
      }))
  } catch (error) {
    console.warn("[CREP Search] Devices fetch error:", error)
    return []
  }
}
