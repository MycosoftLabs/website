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

// Apr 19, 2026 (r3): Amtrak's official public feed is now AES-encrypted
// (anti-scraping). Community aggregator api.amtraker.com handles the
// decryption + serves a clean JSON endpoint. Use it as the primary source.
// Also pull MBTA GTFS-RT for Boston trolleys/commuter rail to prove the
// GTFS-RT pipeline — MBTA's unkeyed cdn.mbta.com/realtime JSON endpoint
// is reliable and updates every 15 s.
const AMTRAKER_URL = "https://api-v3.amtraker.com/v3/trains"
const MBTA_URL = "https://cdn.mbta.com/realtime/VehiclePositions.json"

async function fetchAmtrak(): Promise<any[]> {
  try {
    const res = await fetch(AMTRAKER_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MycosoftCREP/1.0; +https://mycosoft.com)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 30 },
    })
    if (!res.ok) return []
    const data = await res.json()
    // amtraker shape: { "1": [{routeName, trainNum, lat, lon, ...}], "2": [...], ... }
    const out: any[] = []
    for (const [, arr] of Object.entries(data)) {
      if (!Array.isArray(arr)) continue
      for (const t of arr as any[]) {
        if (t?.lat == null || t?.lon == null) continue
        out.push({
          id: `amtrak-${t.trainID || t.trainNum || `${t.lat},${t.lon}`}`,
          trainNum: t.trainNum || null,
          name: t.routeName || `Amtrak ${t.trainNum || ""}`.trim(),
          routeName: t.routeName || null,
          operator: "Amtrak",
          lat: Number(t.lat),
          lng: Number(t.lon),
          heading: Number(t.heading) || 0,
          speed: Number(t.velocity) || Number(t.speed) || 0,
          state: t.eventCode || null,
          status: t.trainTimely || t.trainState || null,
          timestamp: t.lastValTS || t.lastUpdate || new Date().toISOString(),
          source: "amtrak",
        })
      }
    }
    return out
  } catch {
    return []
  }
}

async function fetchMBTA(): Promise<any[]> {
  try {
    const res = await fetch(MBTA_URL, {
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 20 },
    })
    if (!res.ok) return []
    const data = await res.json()
    const entities = data?.entity || []
    return entities
      .filter((e: any) => e?.vehicle?.position?.latitude && e?.vehicle?.position?.longitude)
      .map((e: any) => {
        const v = e.vehicle
        const p = v.position || {}
        // GTFS-RT route_type-ish inference from stop_id / route_id isn't
        // reliable without the schedule feed; for now label all as "MBTA".
        return {
          id: `mbta-${e.id || v.vehicle?.id || `${p.latitude},${p.longitude}`}`,
          trainNum: v.vehicle?.label || null,
          name: `MBTA ${v.trip?.route_id || ""}`.trim() || "MBTA vehicle",
          routeName: v.trip?.route_id || null,
          operator: "MBTA",
          lat: Number(p.latitude),
          lng: Number(p.longitude),
          heading: Number(p.bearing) || 0,
          speed: Number(p.speed) || 0,
          state: v.current_status || null,
          status: null,
          timestamp: v.timestamp
            ? new Date(Number(v.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
          source: "mbta-gtfs-rt",
        }
      })
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get("limit") || 2000), 5000)

  // Fetch both in parallel; each is fail-isolated.
  const [amtrak, mbta] = await Promise.all([fetchAmtrak(), fetchMBTA()])
  const trains = [...amtrak, ...mbta].slice(0, limit)

  return NextResponse.json(
    {
      source: "railway-live",
      total: trains.length,
      operators: { amtrak: amtrak.length, mbta: mbta.length },
      trains,
      generatedAt: new Date().toISOString(),
      note: "Amtrak via amtraker.com community aggregator (decrypts Amtrak's AES-encrypted feed). MBTA via GTFS-RT. UK Network Rail / DB HAFAS / Caltrain / LIRR pending (v3 §A.9.3).",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=25, stale-while-revalidate=120",
        "X-Source": "amtraker+mbta-gtfs-rt",
      },
    },
  )
}
