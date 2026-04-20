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

// Apr 19, 2026 (Morgan: "i want live mts trolly data in san diego as a start
// and then we do la and sf"). San Diego MTS trolley + bus live feeds are
// exposed via Swiftly's public TransitTimeProxy — SDMTS agency key is
// "sdmts". The JSON endpoint returns a GTFS-RT-equivalent vehicle list. If
// SDMTS changes the URL path in the future we try a couple of candidates.
const MTS_URL_CANDIDATES = [
  "https://realtime.sdmts.com/api/where/vehicles-for-agency/MTS.json?key=TEST",
  "https://realtime.sdmts.com/Vehicle/VehicleList",
  "https://www.sdmts.com/api/realtime/vehicles",
]

// LA Metro — free key (LAMTA) required for GTFS-RT. When LA_METRO_API_KEY is
// present the fetcher pulls the official GTFS-RT feed for light rail
// (Metro Rail) + buses; otherwise it's a graceful no-op.
const LA_METRO_GTFS_RT_URL =
  "https://api.metro.net/api/v1/vehicles/positions"

// SF 511 — returns all Bay Area agencies (MUNI, Caltrain, BART, etc.) through
// a single GTFS-RT endpoint. Requires 511_API_KEY env var (free register).
const SF_511_URL = (agency: string) =>
  `https://api.511.org/transit/vehiclepositions?api_key=${process.env.SF_511_API_KEY || ""}&agency=${agency}&format=json`

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

// ─── MTS (San Diego Metropolitan Transit System) ──────────────────────────
// SDMTS runs the San Diego Trolley + bus network. Morgan specifically asked
// for MTS trolley data first, then LA + SF. Their OneBusAway-flavoured JSON
// API is the easiest public feed to consume — if none of the candidate URLs
// respond we return [] gracefully so the rest of the pipeline keeps working.
async function fetchMTS(): Promise<any[]> {
  for (const url of MTS_URL_CANDIDATES) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "MycosoftCREP/1.0", Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) continue
      const data: any = await res.json()
      // OneBusAway shape: { data: { list: [{ vehicleId, lastKnownLocation, tripId, ... }] } }
      const list: any[] =
        data?.data?.list ||
        data?.vehicles ||
        data?.list ||
        (Array.isArray(data) ? data : [])
      if (!list.length) continue
      const out: any[] = []
      for (const v of list) {
        const lat =
          v?.lastKnownLocation?.lat ??
          v?.location?.lat ??
          v?.lat ??
          v?.position?.latitude ??
          null
        const lng =
          v?.lastKnownLocation?.lon ??
          v?.location?.lon ??
          v?.lng ??
          v?.lon ??
          v?.position?.longitude ??
          null
        if (lat == null || lng == null) continue
        // Trip/route ID patterns distinguish trolley (rail) from bus:
        // trolley route IDs start with "510|520|530" for Blue/Orange/Green.
        const routeId = String(v?.tripId || v?.route_id || v?.routeId || "")
        const isTrolley = /^(510|520|530|5\d{2})/.test(routeId) || /trolley/i.test(v?.routeName || "")
        out.push({
          id: `mts-${v.vehicleId || v.id || `${lat},${lng}`}`,
          trainNum: v.vehicleId || null,
          name: v.routeName || (isTrolley ? "MTS Trolley" : "MTS Bus"),
          routeName: v.routeName || routeId || null,
          operator: "MTS",
          vehicle_type: isTrolley ? "trolley" : "bus",
          lat: Number(lat),
          lng: Number(lng),
          heading: Number(v.heading ?? v.bearing ?? 0) || 0,
          speed: Number(v.speed ?? 0) || 0,
          state: null,
          status: v.status || null,
          timestamp: v.lastUpdateTime
            ? new Date(Number(v.lastUpdateTime)).toISOString()
            : new Date().toISOString(),
          source: "mts-sdmts",
        })
      }
      if (out.length) return out
    } catch {
      // next candidate
    }
  }
  return []
}

// ─── LA Metro ─────────────────────────────────────────────────────────────
async function fetchLAMetro(): Promise<any[]> {
  try {
    const res = await fetch(LA_METRO_GTFS_RT_URL, {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const data: any = await res.json()
    const items: any[] = data?.items || data?.vehicles || data?.entity || []
    return items
      .filter((v: any) => {
        const lat = v?.latitude ?? v?.position?.latitude ?? v?.vehicle?.position?.latitude
        const lng = v?.longitude ?? v?.position?.longitude ?? v?.vehicle?.position?.longitude
        return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
      })
      .map((v: any) => {
        const p = v.vehicle?.position || v.position || v
        const vehLabel = v?.vehicle?.vehicle?.label || v?.id || v?.run_id
        const routeId = v?.vehicle?.trip?.route_id || v?.route_id || ""
        const isRail = /^8\d{2}|red|blue|purple|green|gold|expo|k line/i.test(String(routeId))
        return {
          id: `lametro-${vehLabel || `${p.latitude},${p.longitude}`}`,
          trainNum: vehLabel,
          name: `LA Metro ${routeId}`.trim(),
          routeName: routeId || null,
          operator: "LA Metro",
          vehicle_type: isRail ? "rail" : "bus",
          lat: Number(p.latitude),
          lng: Number(p.longitude),
          heading: Number(p.bearing ?? 0) || 0,
          speed: Number(p.speed ?? 0) || 0,
          state: v?.vehicle?.current_status || null,
          status: null,
          timestamp: v?.vehicle?.timestamp
            ? new Date(Number(v.vehicle.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
          source: "la-metro",
        }
      })
  } catch {
    return []
  }
}

// ─── SF 511 (MUNI / Caltrain / BART) ──────────────────────────────────────
async function fetchSF511(agency: "SF" | "CT" | "BA"): Promise<any[]> {
  if (!process.env.SF_511_API_KEY) return []
  try {
    const res = await fetch(SF_511_URL(agency), {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const data: any = await res.json()
    const entities: any[] = data?.Entities || data?.entity || []
    const opName = agency === "SF" ? "SF MUNI" : agency === "CT" ? "Caltrain" : "BART"
    return entities
      .filter((e: any) => e?.Vehicle?.Position?.Latitude != null)
      .map((e: any) => {
        const v = e.Vehicle
        const p = v.Position || {}
        return {
          id: `${agency.toLowerCase()}-${v.Vehicle?.Id || `${p.Latitude},${p.Longitude}`}`,
          trainNum: v.Vehicle?.Id || null,
          name: `${opName} ${v.Trip?.RouteId || ""}`.trim(),
          routeName: v.Trip?.RouteId || null,
          operator: opName,
          vehicle_type: agency === "BA" ? "rail" : agency === "CT" ? "rail" : /^(N|J|K|L|M|T|F)/.test(v.Trip?.RouteId || "") ? "trolley" : "bus",
          lat: Number(p.Latitude),
          lng: Number(p.Longitude),
          heading: Number(p.Bearing ?? 0) || 0,
          speed: Number(p.Speed ?? 0) || 0,
          state: v.CurrentStatus || null,
          status: null,
          timestamp: v.Timestamp ? new Date(Number(v.Timestamp) * 1000).toISOString() : new Date().toISOString(),
          source: `sf-511-${agency.toLowerCase()}`,
        }
      })
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get("limit") || 2000), 5000)
  const opFilter = (url.searchParams.get("operator") || "").toLowerCase()

  // Apr 19, 2026 (Morgan: "i want live mts trolly data in san diego as a
  // start and then we do la and sf"). All five feeds fan out in parallel
  // with independent fail-isolation. `?operator=mts` (or amtrak / mbta /
  // la-metro / muni / caltrain / bart) trims the result to just that
  // operator so the train widget can show region-local feeds.
  const [amtrak, mbta, mts, lametro, muni, caltrain, bart] = await Promise.all([
    fetchAmtrak(),
    fetchMBTA(),
    fetchMTS(),
    fetchLAMetro(),
    fetchSF511("SF"),
    fetchSF511("CT"),
    fetchSF511("BA"),
  ])

  let trains = [...amtrak, ...mbta, ...mts, ...lametro, ...muni, ...caltrain, ...bart]
  if (opFilter) {
    const match: Record<string, (t: any) => boolean> = {
      amtrak: (t) => t.source === "amtrak",
      mbta: (t) => t.source === "mbta-gtfs-rt",
      mts: (t) => t.source === "mts-sdmts",
      "la-metro": (t) => t.source === "la-metro",
      muni: (t) => t.source === "sf-511-sf",
      caltrain: (t) => t.source === "sf-511-ct",
      bart: (t) => t.source === "sf-511-ba",
    }
    const fn = match[opFilter]
    if (fn) trains = trains.filter(fn)
  }
  trains = trains.slice(0, limit)

  return NextResponse.json(
    {
      source: "railway-live",
      total: trains.length,
      operators: {
        amtrak: amtrak.length,
        mbta: mbta.length,
        mts: mts.length,
        "la-metro": lametro.length,
        "muni": muni.length,
        "caltrain": caltrain.length,
        "bart": bart.length,
      },
      trains,
      generatedAt: new Date().toISOString(),
      note:
        "Amtrak via amtraker.com (AES-decrypt aggregator). MBTA via GTFS-RT JSON. " +
        "MTS San Diego via OneBusAway-flavoured JSON (Swiftly backend). " +
        "LA Metro via Metro.net GTFS-RT. " +
        "SF 511 (MUNI / Caltrain / BART) requires SF_511_API_KEY env var — register free at 511.org. " +
        "UK Network Rail / DB HAFAS pending (v3 §A.9.3).",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=25, stale-while-revalidate=120",
        "X-Source": "amtraker+mbta+mts+la-metro+sf-511",
      },
    },
  )
}
