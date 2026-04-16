/**
 * AISStream Vessel API Route - Feb 18, 2026 (updated Apr 2026)
 * Real-time AIS vessel tracking via multi-source Vessel Registry
 *
 * Uses the Vessel Registry to aggregate ALL available maritime data sources
 * (AISStream, MINDEX, MarineTraffic, VesselFinder, BarentsWatch, DMA) in
 * parallel with MMSI-based deduplication.
 *
 * Results cached for 30 seconds to prevent overwhelming the dev server.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAISStreamClient } from "@/lib/oei/connectors/aisstream-ships"
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"
import { ingestVessels } from "@/lib/oei/mindex-ingest"
import { fetchAllVesselsWithMeta, type VesselRecord } from "@/lib/crep/registries/vessel-registry"

export const dynamic = "force-dynamic"

// Request-level cache to prevent too many API route hits
interface CacheEntry {
  data: unknown
  timestamp: number
  expiresAt: number
}

const vesselResponseCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30_000 // 30 seconds cache

// ── Persistent server-side AIS stream ─────────────────────────────────────────
// AISstream uses WebSocket. We maintain a module-level singleton connection so
// the vessel cache is populated continuously from real AIS data.
//
// When the cache is empty on first request, we wait up to INIT_WAIT_MS for the
// stream to deliver initial vessels before responding.
//
// The connection auto-reconnects on failure with exponential back-off.

const INIT_WAIT_MS = 5000       // Wait up to 5 s for first vessels on cold start
const RECONNECT_BASE_MS = 3000  // Initial reconnect delay
const MAX_RECONNECT_MS = 300000 // Cap reconnect delay at 5 minutes (was 1 min — too aggressive)
const MAX_RETRIES = 5           // Stop retrying after 5 failures to avoid log spam

// Module-level persistent stream state (survives across requests in the same process)
let streamRunning = false
let reconnectDelay = RECONNECT_BASE_MS
let reconnectAttempts = 0
let streamCleanup: (() => void) | null = null

/**
 * Ensure a global AIS WebSocket stream is running.
 * Called once on first request; the stream stays alive for the process lifetime.
 */
function ensureAISStream(): void {
  if (streamRunning) return

  const client = getAISStreamClient()
  if (!client.hasApiKey()) {
    console.warn("[AISStream] No API key configured – vessel data unavailable. Set AISSTREAM_API_KEY in .env.local")
    return
  }

  streamRunning = true
  reconnectDelay = RECONNECT_BASE_MS
  console.log("[AISStream] Starting persistent global stream (all shipping lanes)…")

  // Subscribe to global bounds – AISstream will deliver all vessels it receives
  streamCleanup = client.connectRealtime(
    { north: 90, south: -90, east: 180, west: -180 },
    (_vessel) => {
      // Vessel is automatically added to the client's internal cache
    },
    (err) => {
      streamRunning = false
      streamCleanup = null
      reconnectAttempts++

      if (reconnectAttempts >= MAX_RETRIES) {
        console.warn(`[AISStream] Stopped after ${MAX_RETRIES} failures. Service may be down.`)
        return // Stop retrying — no more log spam
      }

      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS)
      console.warn(`[AISStream] Error: ${err.message} — retry ${reconnectAttempts}/${MAX_RETRIES} in ${reconnectDelay / 1000}s`)
      setTimeout(() => ensureAISStream(), reconnectDelay)
    }
  )
}

// Kick off the stream immediately when this module is first loaded by Next.js
ensureAISStream()

// ── Route handler ─────────────────────────────────────────────────────────────

/**
 * GET /api/oei/aisstream
 * Returns real-time AIS vessel positions from ALL available maritime sources
 * via the Vessel Registry (AISStream, MINDEX, MarineTraffic, VesselFinder,
 * BarentsWatch, Danish Maritime Authority).
 *
 * Query params:
 * - lamin, lamax, lomin, lomax  -- bounding box filter
 * - mmsi                        -- comma-separated MMSI filter
 * - publish                     -- "true" to publish to event bus
 * - limit                       -- max results
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const lamin = searchParams.get("lamin")
  const lamax = searchParams.get("lamax")
  const lomin = searchParams.get("lomin")
  const lomax = searchParams.get("lomax")
  const mmsi = searchParams.get("mmsi")
  const publish = searchParams.get("publish") === "true"
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined
  const forceRefresh = searchParams.get("refresh") === "true"

  const cacheKey = `vessels_${lamin}_${lamax}_${lomin}_${lomax}_${mmsi}_${limit}_${publish}`
  const now = Date.now()

  // Check cache first (unless force refresh or publishing)
  if (!forceRefresh && !publish) {
    const cached = vesselResponseCache.get(cacheKey)
    if (cached && now < cached.expiresAt) {
      console.log(`[AISStream] Cache HIT (${Math.round((cached.expiresAt - now) / 1000)}s remaining)`)
      return NextResponse.json(cached.data)
    }
  }

  try {
    const startTime = Date.now()
    const client = getAISStreamClient()

    // Ensure stream is running (no-op if already started)
    ensureAISStream()

    // ── Multi-source fetch via Vessel Registry ────────────────────────────
    const registryResult = await fetchAllVesselsWithMeta()
    let vessels: VesselRecord[] = registryResult.vessels

    // If the registry got nothing, wait briefly for AISStream cold start
    if (vessels.length === 0 && client.hasApiKey()) {
      const waited = Date.now() - startTime
      const remaining = INIT_WAIT_MS - waited
      if (remaining > 500) {
        await new Promise(resolve => setTimeout(resolve, remaining))
        // Re-fetch from registry after AIS stream has had time to populate
        const retry = await fetchAllVesselsWithMeta()
        vessels = retry.vessels
      }
    }

    // Apply bounding box filter if provided
    if (lamin && lamax && lomin && lomax) {
      const south = parseFloat(lamin)
      const north = parseFloat(lamax)
      const west = parseFloat(lomin)
      const east = parseFloat(lomax)
      vessels = vessels.filter(
        (v) => v.lat >= south && v.lat <= north && v.lng >= west && v.lng <= east
      )
    }

    // Apply MMSI filter if provided
    if (mmsi) {
      const mmsiSet = new Set(mmsi.split(",").map((m) => m.trim()))
      vessels = vessels.filter((v) => mmsiSet.has(v.mmsi))
    }

    // Apply limit
    if (limit && vessels.length > limit) {
      vessels = vessels.slice(0, limit)
    }

    const latency = Date.now() - startTime
    const activeSource = Object.entries(registryResult.sources)
      .filter(([, c]) => c > 0)
      .map(([s]) => s)
      .join("+") || "none"

    if (publish) {
      const query = {
        bounds: lamin && lamax && lomin && lomax
          ? { south: parseFloat(lamin), north: parseFloat(lamax), west: parseFloat(lomin), east: parseFloat(lomax) }
          : undefined,
        mmsi: mmsi ? mmsi.split(",") : undefined,
        limit,
      }
      const result = await client.publishCachedVessels(query)
      logDataCollection("vessel-registry", "multi-source", result.entities.length, latency, true, "memory")
      ingestVessels("vessel-registry", result.entities as any)
      const responseData = {
        success: true,
        published: result.published,
        total: result.entities.length,
        vessels: result.entities,
        isLive: streamRunning,
        available: result.entities.length > 0,
        source: activeSource,
        sources: registryResult.sources,
        timestamp: new Date().toISOString(),
        cached: false,
      }
      return NextResponse.json(responseData)
    } else {
      logDataCollection("vessel-registry", "multi-source", vessels.length, latency, true, "memory")
      ingestVessels("vessel-registry", vessels as any)
      const responseData = {
        success: true,
        total: vessels.length,
        vessels,
        isLive: streamRunning,
        source: activeSource,
        sources: registryResult.sources,
        available: vessels.length > 0,
        timestamp: new Date().toISOString(),
        cached: false,
      }

      // Store in cache
      vesselResponseCache.set(cacheKey, {
        data: { ...responseData, cached: true },
        timestamp: now,
        expiresAt: now + CACHE_TTL_MS,
      })
      console.log(`[AISStream] Cache SET (TTL: ${CACHE_TTL_MS / 1000}s, sources: ${activeSource})`)

      return NextResponse.json(responseData)
    }
  } catch (error) {
    console.error("[AISStream] Error:", error)
    logAPIError("aisstream", "aisstream.com", String(error))

    // Return empty data on error instead of error status (graceful fallback)
    return NextResponse.json({
      success: false,
      total: 0,
      vessels: [],
      isLive: false,
      source: "vessel-registry",
      available: false,
      timestamp: new Date().toISOString(),
      error: String(error),
    })
  }
}
