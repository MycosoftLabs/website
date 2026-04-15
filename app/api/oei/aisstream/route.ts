/**
 * AISStream Vessel API Route - Feb 18, 2026 (updated Apr 2026)
 * Real-time AIS vessel tracking via WebSocket with multi-source fallback
 *
 * Source priority:
 *   1. AISStream WebSocket (primary — live AIS data)
 *   2. MINDEX cache (/api/mindex/proxy/vessels — PostGIS cached vessel data)
 *   3. MarineTraffic API (if MARINETRAFFIC_API_KEY env var exists)
 *
 * Results cached for 30 seconds to prevent overwhelming the dev server
 */

import { NextRequest, NextResponse } from "next/server"
import { getAISStreamClient } from "@/lib/oei/connectors/aisstream-ships"
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"
import { ingestVessels } from "@/lib/oei/mindex-ingest"

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

// ── Fallback: MINDEX cache ────────────────────────────────────────────────────

const MINDEX_URL =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_URL ||
  "http://192.168.0.189:8000"

const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

/**
 * Fetch cached vessel data from MINDEX PostGIS earth layer.
 * Returns normalised vessel array or empty array on failure.
 */
async function fetchMINDEXVessels(): Promise<{ vessels: unknown[]; ok: boolean }> {
  try {
    const url = `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=vessels&lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&limit=2000`
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json", "X-API-Key": MINDEX_API_KEY },
    })
    if (!res.ok) return { vessels: [], ok: false }
    const data = await res.json()
    // MINDEX returns { features: [...] } or { entities: [...] }
    const entities: unknown[] = data.features ?? data.entities ?? data.vessels ?? []
    return { vessels: entities, ok: entities.length > 0 }
  } catch {
    return { vessels: [], ok: false }
  }
}

// ── Fallback: MarineTraffic API ──────────────────────────────────────────────

const MARINETRAFFIC_API_KEY = process.env.MARINETRAFFIC_API_KEY || ""

/**
 * Fetch vessel positions from MarineTraffic PS07 endpoint (if API key exists).
 * Only called when AISStream and MINDEX both return 0 results.
 */
async function fetchMarineTrafficVessels(): Promise<{ vessels: unknown[]; ok: boolean }> {
  if (!MARINETRAFFIC_API_KEY) return { vessels: [], ok: false }
  try {
    // PS07 = vessel positions export service (JSON format)
    const url = `https://services.marinetraffic.com/api/exportvessels/v:8/${MARINETRAFFIC_API_KEY}/timespan:60/protocol:jsono`
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return { vessels: [], ok: false }
    const data = await res.json()
    const rawVessels: unknown[] = Array.isArray(data) ? data : []
    // Normalise MarineTraffic fields to match AISStream schema
    const normalised = rawVessels.map((v: any) => ({
      id: v.MMSI || `mt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mmsi: v.MMSI,
      name: v.SHIPNAME,
      location: { type: "Point" as const, coordinates: [parseFloat(v.LON), parseFloat(v.LAT)] },
      sog: parseFloat(v.SPEED) / 10, // MT gives speed in 1/10 knot
      cog: parseFloat(v.COURSE) / 10,
      heading: parseFloat(v.HEADING),
      shipType: parseInt(v.SHIPTYPE) || 0,
      destination: v.DESTINATION,
      navStatus: parseInt(v.STATUS) || null,
      lastSeen: v.TIMESTAMP || new Date().toISOString(),
      provenance: { source: "marinetraffic", timestamp: new Date().toISOString() },
    }))
    return { vessels: normalised, ok: normalised.length > 0 }
  } catch {
    return { vessels: [], ok: false }
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

/**
 * GET /api/oei/aisstream
 * Returns real-time AIS vessel positions with multi-source fallback.
 *
 * Source priority:
 *   1. AISStream WebSocket (primary)
 *   2. MINDEX cache (fallback 1)
 *   3. MarineTraffic API (fallback 2, requires MARINETRAFFIC_API_KEY env var)
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

    const query = {
      bounds: lamin && lamax && lomin && lomax
        ? { south: parseFloat(lamin), north: parseFloat(lamax), west: parseFloat(lomin), east: parseFloat(lomax) }
        : undefined,
      mmsi: mmsi ? mmsi.split(",") : undefined,
      limit,
    }

    // ── Source 1: AISStream WebSocket ──────────────────────────────────────
    let vessels = client.getCachedVessels(query)
    let activeSource = "aisstream"

    if (vessels.length === 0 && client.hasApiKey()) {
      const waited = Date.now() - startTime
      const remaining = INIT_WAIT_MS - waited
      if (remaining > 500) {
        await new Promise(resolve => setTimeout(resolve, remaining))
        vessels = client.getCachedVessels(query)
      }
    }

    // ── Source 2: MINDEX cache (fallback) ─────────────────────────────────
    if (vessels.length === 0) {
      console.log("[AISStream] 0 vessels from WebSocket -- trying MINDEX cache...")
      const mindexResult = await fetchMINDEXVessels()
      if (mindexResult.ok) {
        vessels = mindexResult.vessels as typeof vessels
        activeSource = "mindex-cache"
        console.log(`[AISStream] MINDEX cache returned ${vessels.length} vessels`)
      }
    }

    // ── Source 3: MarineTraffic API (fallback 2) ──────────────────────────
    if (vessels.length === 0 && MARINETRAFFIC_API_KEY) {
      console.log("[AISStream] 0 vessels from MINDEX -- trying MarineTraffic API...")
      const mtResult = await fetchMarineTrafficVessels()
      if (mtResult.ok) {
        vessels = mtResult.vessels as typeof vessels
        activeSource = "marinetraffic"
        console.log(`[AISStream] MarineTraffic returned ${vessels.length} vessels`)
      }
    }

    const latency = Date.now() - startTime

    if (publish) {
      const result = await client.publishCachedVessels(query)
      logDataCollection("aisstream", "aisstream.com", result.entities.length, latency, true, "memory")
      ingestVessels("aisstream", result.entities as any)
      const responseData = {
        success: true,
        published: result.published,
        total: result.entities.length,
        vessels: result.entities,
        isLive: streamRunning,
        available: result.entities.length > 0,
        source: activeSource,
        timestamp: new Date().toISOString(),
        cached: false,
      }
      return NextResponse.json(responseData)
    } else {
      logDataCollection(activeSource, activeSource === "aisstream" ? "aisstream.com" : activeSource, vessels.length, latency, true, "memory")
      if (activeSource === "aisstream") ingestVessels("aisstream", vessels as any)
      const responseData = {
        success: true,
        total: vessels.length,
        vessels,
        isLive: streamRunning,
        source: activeSource,
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
      console.log(`[AISStream] Cache SET (TTL: ${CACHE_TTL_MS / 1000}s, source: ${activeSource})`)

      return NextResponse.json(responseData)
    }
  } catch (error) {
    console.error("[AISStream] Error:", error)
    logAPIError("aisstream", "aisstream.com", String(error))

    // Last-resort: try MINDEX even on exception path
    try {
      const mindexResult = await fetchMINDEXVessels()
      if (mindexResult.ok) {
        console.log(`[AISStream] Error recovery: MINDEX cache returned ${mindexResult.vessels.length} vessels`)
        return NextResponse.json({
          success: true,
          total: mindexResult.vessels.length,
          vessels: mindexResult.vessels,
          isLive: false,
          source: "mindex-cache-recovery",
          available: true,
          timestamp: new Date().toISOString(),
          cached: false,
        })
      }
    } catch {}

    // Return empty data on error instead of error status (graceful fallback)
    return NextResponse.json({
      success: false,
      total: 0,
      vessels: [],
      isLive: false,
      source: "aisstream",
      available: false,
      timestamp: new Date().toISOString(),
      error: String(error),
    })
  }
}
