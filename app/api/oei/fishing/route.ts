/**
 * Global Fishing Watch — Fishing Events API Route
 *
 * Fetches fishing events from the GFW Events API for the last 24 hours.
 * Returns events with vessel names, positions, event types, and durations.
 * Results are cached for 5 minutes. Ingests events to MINDEX under "fishing" layer.
 *
 * Requires env: GLOBAL_FISHING_WATCH_TOKEN (Bearer token)
 */

import { NextRequest, NextResponse } from "next/server"
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"
import { ingestEvents } from "@/lib/oei/mindex-ingest"

export const dynamic = "force-dynamic"

// ── Config ───────────────────────────────────────────────────────────────────

const GFW_TOKEN = process.env.GLOBAL_FISHING_WATCH_TOKEN || ""
const GFW_BASE = "https://gateway.api.globalfishingwatch.org/v3"

// ── Cache (5 minute TTL) ─────────────────────────────────────────────────────

interface CacheEntry {
  data: unknown
  expiresAt: number
}

let fishingCache: CacheEntry | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ── Types ────────────────────────────────────────────────────────────────────

interface FishingEvent {
  id: string
  type: string
  vesselId: string
  vesselName: string
  flag: string | null
  mmsi: string
  lat: number
  lng: number
  start: string
  end: string
  durationHours: number
  source: string
}

// ── Route handler ────────────────────────────────────────────────────────────

/**
 * GET /api/oei/fishing
 *
 * Returns GFW fishing events from the last 24 hours.
 *
 * Query params:
 *   - refresh   "true" to bypass cache
 *   - limit     max results (default 1000)
 *   - type      filter by event type (fishing / encounter / port_visit)
 *   - lamin, lamax, lomin, lomax  bounding box filter
 */
export async function GET(request: NextRequest) {
  if (!GFW_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        error: "GLOBAL_FISHING_WATCH_TOKEN not configured",
        events: [],
        total: 0,
      },
      { status: 503 }
    )
  }

  const sp = request.nextUrl.searchParams
  const forceRefresh = sp.get("refresh") === "true"
  const limit = sp.get("limit") ? parseInt(sp.get("limit")!) : 1000
  const typeFilter = sp.get("type") // fishing | encounter | port_visit
  const lamin = sp.get("lamin")
  const lamax = sp.get("lamax")
  const lomin = sp.get("lomin")
  const lomax = sp.get("lomax")

  // Check cache
  const now = Date.now()
  if (!forceRefresh && fishingCache && now < fishingCache.expiresAt) {
    const cached = fishingCache.data as { events: FishingEvent[] }
    let events = cached.events
    events = applyFilters(events, { typeFilter, lamin, lamax, lomin, lomax, limit })
    return NextResponse.json({
      success: true,
      total: events.length,
      events,
      cached: true,
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const startTime = Date.now()
    const events = await fetchGFWFishingEvents(limit)
    const latency = Date.now() - startTime

    // Store full result in cache before filtering
    fishingCache = {
      data: { events },
      expiresAt: now + CACHE_TTL_MS,
    }

    // Ingest to MINDEX under "fishing" layer (non-blocking)
    if (events.length > 0) {
      ingestEvents(
        "gfw-fishing",
        events.map((e) => ({
          id: e.id,
          type: e.type,
          title: `${e.vesselName} — ${e.type}`,
          severity: "info",
          latitude: e.lat,
          longitude: e.lng,
          timestamp: e.end || e.start,
          vessel_id: e.vesselId,
          vessel_name: e.vesselName,
          flag: e.flag,
          mmsi: e.mmsi,
          duration_hours: e.durationHours,
          layer: "fishing",
        }))
      )
      logDataCollection("gfw-fishing", "globalfishingwatch.org", events.length, latency, true, "memory")
    }

    // Apply user filters
    const filtered = applyFilters(events, { typeFilter, lamin, lamax, lomin, lomax, limit })

    return NextResponse.json({
      success: true,
      total: filtered.length,
      totalUnfiltered: events.length,
      events: filtered,
      cached: false,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[GFW Fishing] Error:", error)
    logAPIError("gfw-fishing", "globalfishingwatch.org", String(error))

    return NextResponse.json(
      {
        success: false,
        total: 0,
        events: [],
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 502 }
    )
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchGFWFishingEvents(limit: number): Promise<FishingEvent[]> {
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const startDate = dayAgo.toISOString().split("T")[0]
  const endDate = now.toISOString().split("T")[0]

  const url =
    `${GFW_BASE}/events` +
    `?datasets[0]=public-global-fishing-events:latest` +
    `&start-date=${startDate}&end-date=${endDate}` +
    `&limit=${Math.min(limit, 1000)}`

  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${GFW_TOKEN}`,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`GFW API ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  const raw: any[] = Array.isArray(data) ? data : data.entries ?? data.events ?? []

  return raw
    .filter((e: any) => {
      const coords = e.position ?? e.geometry?.coordinates
      return coords != null
    })
    .map((e: any): FishingEvent => {
      const lat =
        e.position?.lat ??
        (e.geometry?.coordinates ? e.geometry.coordinates[1] : 0)
      const lng =
        e.position?.lon ??
        e.position?.lng ??
        (e.geometry?.coordinates ? e.geometry.coordinates[0] : 0)

      const startTs = e.start ?? e.startDate ?? ""
      const endTs = e.end ?? e.endDate ?? ""
      const durationMs =
        startTs && endTs
          ? new Date(endTs).getTime() - new Date(startTs).getTime()
          : 0

      return {
        id: e.id ?? `gfw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: e.type ?? e.eventType ?? "fishing",
        vesselId: e.vessel?.id ?? e.vesselId ?? "",
        vesselName: e.vessel?.name ?? e.vessel?.shipname ?? "Unknown",
        flag: e.vessel?.flag ?? null,
        mmsi: String(e.vessel?.ssvid ?? e.vessel?.mmsi ?? ""),
        lat: parseFloat(String(lat)) || 0,
        lng: parseFloat(String(lng)) || 0,
        start: startTs,
        end: endTs,
        durationHours: Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100,
        source: "gfw",
      }
    })
}

function applyFilters(
  events: FishingEvent[],
  opts: {
    typeFilter: string | null
    lamin: string | null
    lamax: string | null
    lomin: string | null
    lomax: string | null
    limit: number
  }
): FishingEvent[] {
  let result = events

  // Type filter
  if (opts.typeFilter) {
    result = result.filter((e) => e.type === opts.typeFilter)
  }

  // Bounding box filter
  if (opts.lamin && opts.lamax && opts.lomin && opts.lomax) {
    const south = parseFloat(opts.lamin)
    const north = parseFloat(opts.lamax)
    const west = parseFloat(opts.lomin)
    const east = parseFloat(opts.lomax)
    result = result.filter(
      (e) => e.lat >= south && e.lat <= north && e.lng >= west && e.lng <= east
    )
  }

  // Limit
  if (opts.limit && result.length > opts.limit) {
    result = result.slice(0, opts.limit)
  }

  return result
}
