import { NextRequest, NextResponse } from "next/server"

/**
 * Railway Live Trains — Apr 19, 2026 (r2: cache-bust)
 *
 * Proxies Amtrak's public Track-A-Train GeoJSON feed, normalizes the
 * per-train record shape, and caches briefly so the CREP poll loop
 * (30 s from client) doesn't hammer upstream.
 *
 * Future extensions (v3 §A.9.3):
 *   • UK Network Rail (SCHEDULE + MOVEMENT feeds via STOMP, register)
 *   • EU HAFAS (Deutsche Bahn, SNCF, etc.)
 *   • US GTFS-RT commuter rail (Caltrain, LIRR, MBTA, Metra, ...)
 *   • MINDEX union step
 *
 * Response shape:
 *   { source, total, trains: [{ id, trainNum, name, routeName, operator,
 *                               lat, lng, heading, speed, state, status,
 *                               timestamp }] }
 */

export const runtime = "nodejs"
export const revalidate = 30 // seconds of edge cache

const AMTRAK_URL = "https://www.amtrak.com/services/MapDataService/trains/getTrainsData"

async function fetchAmtrak(): Promise<any[]> {
  try {
    const res = await fetch(AMTRAK_URL, {
      headers: {
        // Amtrak's public endpoint rejects some default fetch UAs.
        "User-Agent": "Mozilla/5.0 (compatible; MycosoftCREP/1.0; +https://mycosoft.com)",
        Accept: "application/json, text/plain, */*",
      },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 30 },
    })
    if (!res.ok) return []
    const data = await res.json()
    // Amtrak returns a dict keyed by trainNum in some versions and an array
    // in others — normalize both.
    const list: any[] = Array.isArray(data) ? data : Object.values(data)
    return list
      .filter((t: any) => t && t.lat != null && t.lon != null)
      .map((t: any) => ({
        id: `amtrak-${t.TrainNum || t.trainID || t.objectID || t.lat + "," + t.lon}`,
        trainNum: t.TrainNum || t.trainID || null,
        name: t.RouteName || t.name || `Amtrak ${t.TrainNum || ""}`.trim(),
        routeName: t.RouteName || null,
        operator: "Amtrak",
        lat: Number(t.lat),
        lng: Number(t.lon),
        heading: Number(t.Heading) || 0,
        speed: Number(t.Velocity) || Number(t.speed) || 0,
        state: t.EventCode || t.eventCode || null,
        status: t.TrainState || t.state || null,
        timestamp: t.LastValTS || t.lastUpdate || new Date().toISOString(),
        source: "amtrak",
      }))
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get("limit") || 2000), 5000)

  const trains = (await fetchAmtrak()).slice(0, limit)

  return NextResponse.json(
    {
      source: "railway-live",
      total: trains.length,
      operators: { amtrak: trains.length },
      trains,
      generatedAt: new Date().toISOString(),
      note: "Amtrak starter feed. UK Network Rail / DB HAFAS / GTFS-RT commuter feeds pending (v3 §A.9.3).",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=25, stale-while-revalidate=120",
        "X-Source": "amtrak-live",
      },
    },
  )
}
