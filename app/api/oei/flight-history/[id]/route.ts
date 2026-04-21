import { NextRequest, NextResponse } from "next/server"

/**
 * Flight history API — Apr 20, 2026
 *
 * Morgan: "https://www.airnavradar.com/data/flights/SHWK425" +
 * "all plane data on crep needs this stuff live on widget and map of
 * history".
 *
 * Returns the recent position trail + flight metadata for a single
 * aircraft so the CREP plane widget can render altitude / speed
 * profiles + a trajectory trail, matching the detail AirNavRadar,
 * FlightRadar24, Flightaware, etc. show on their detail pages.
 *
 * URL:
 *   /api/oei/flight-history/[id]
 *
 *   id may be any of:
 *     • Aircraft internal id (e.g. "fr24_3f46efee")
 *     • FR24 id (hex without prefix, e.g. "3f46efee")
 *     • ICAO24 hex code (e.g. "A1B2C3")
 *     • Callsign (e.g. "SHWK425" — AirNavRadar-style)
 *
 * Source resolution order (tries each, returns first with >= 3 points):
 *   1. FlightRadar24 clickhandler (data-live.flightradar24.com/clickhandler)
 *      Returns full trail, airline, aircraft type, origin, destination,
 *      altitude/speed profile at each point. No API key (public).
 *   2. OpenSky Network /tracks/all?icao24=&time= for historic positions.
 *      Free, no key, 1 hr window.
 *   3. AirNavRadar fallback link — we include a web URL the widget can
 *      open in a new tab when direct history isn't available.
 *
 * Response shape (normalized):
 *   {
 *     id, callsign, icao24, registration,
 *     airline, aircraft_type, aircraft_model,
 *     origin: { iata, icao, city, country, lat, lng, timezone },
 *     destination: { iata, icao, city, country, lat, lng, timezone },
 *     scheduled_departure, actual_departure,
 *     scheduled_arrival, actual_arrival,
 *     status,   // scheduled | active | landed | cancelled | unknown
 *     trail: [{ lat, lng, alt_ft, speed_kts, heading, vertical_rate, timestamp }],
 *     stats: {
 *       min_alt, max_alt, avg_alt,
 *       min_speed, max_speed, avg_speed,
 *       distance_nm, duration_sec,
 *     },
 *     external_links: { airnavradar, flightradar24, flightaware },
 *     source, // which provider actually served the trail
 *   }
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type TrailPoint = {
  lat: number
  lng: number
  alt_ft: number | null
  speed_kts: number | null
  heading: number | null
  vertical_rate: number | null
  timestamp: number
}

type FlightHistory = {
  id: string
  callsign: string | null
  icao24: string | null
  registration: string | null
  airline: string | null
  aircraft_type: string | null
  aircraft_model: string | null
  origin: any
  destination: any
  scheduled_departure: number | null
  actual_departure: number | null
  scheduled_arrival: number | null
  actual_arrival: number | null
  status: string
  trail: TrailPoint[]
  stats: {
    min_alt: number | null
    max_alt: number | null
    avg_alt: number | null
    min_speed: number | null
    max_speed: number | null
    avg_speed: number | null
    distance_nm: number | null
    duration_sec: number | null
  }
  external_links: { airnavradar: string; flightradar24: string; flightaware: string }
  source: string
  note?: string
}

function haversineNm(a: [number, number], b: [number, number]): number {
  const R = 3440.07 // nm
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function computeStats(trail: TrailPoint[]): FlightHistory["stats"] {
  if (!trail.length) {
    return { min_alt: null, max_alt: null, avg_alt: null, min_speed: null, max_speed: null, avg_speed: null, distance_nm: null, duration_sec: null }
  }
  const alts = trail.map((p) => p.alt_ft).filter((v): v is number => v != null)
  const speeds = trail.map((p) => p.speed_kts).filter((v): v is number => v != null)
  let distanceNm = 0
  for (let i = 1; i < trail.length; i++) {
    distanceNm += haversineNm([trail[i - 1].lng, trail[i - 1].lat], [trail[i].lng, trail[i].lat])
  }
  const first = trail[0].timestamp
  const last = trail[trail.length - 1].timestamp
  return {
    min_alt: alts.length ? Math.min(...alts) : null,
    max_alt: alts.length ? Math.max(...alts) : null,
    avg_alt: alts.length ? Math.round(alts.reduce((a, b) => a + b, 0) / alts.length) : null,
    min_speed: speeds.length ? Math.min(...speeds) : null,
    max_speed: speeds.length ? Math.max(...speeds) : null,
    avg_speed: speeds.length ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : null,
    distance_nm: Math.round(distanceNm),
    duration_sec: Math.max(0, Math.round((last - first) / 1000)),
  }
}

async function fromFr24ClickHandler(fr24Id: string): Promise<Partial<FlightHistory> | null> {
  // FR24 internal click handler returns full flight detail. fr24Id is the
  // short hex (e.g. "3f46efee") that appears in the flight object.
  try {
    const url = `https://data-live.flightradar24.com/clickhandler/?flight=${encodeURIComponent(fr24Id)}&version=1.5`
    const res = await fetch(url, {
      headers: { "User-Agent": "MycosoftCREP/1.0", Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return null
    const j = await res.json()
    const trailRaw: any[] = j?.trail || []
    const trail: TrailPoint[] = trailRaw.map((p: any) => ({
      lat: Number(p.lat),
      lng: Number(p.lng),
      alt_ft: typeof p.alt === "number" ? p.alt : null,
      speed_kts: typeof p.spd === "number" ? p.spd : null,
      heading: typeof p.hd === "number" ? p.hd : null,
      vertical_rate: null,
      timestamp: Number(p.ts) * 1000,
    })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    if (trail.length < 3) return null
    const identification = j?.identification || {}
    const aircraft = j?.aircraft || {}
    const airline = j?.airline || {}
    const airport = j?.airport || {}
    const status = j?.status || {}
    const time = j?.time || {}
    return {
      id: fr24Id,
      callsign: identification?.callsign || null,
      icao24: aircraft?.identification?.modes || aircraft?.hex || null,
      registration: aircraft?.registration || null,
      airline: airline?.name || airline?.code?.icao || null,
      aircraft_type: aircraft?.model?.code || null,
      aircraft_model: aircraft?.model?.text || null,
      origin: airport?.origin
        ? {
            iata: airport.origin?.code?.iata,
            icao: airport.origin?.code?.icao,
            city: airport.origin?.position?.region?.city,
            country: airport.origin?.position?.country?.name,
            lat: airport.origin?.position?.latitude,
            lng: airport.origin?.position?.longitude,
            timezone: airport.origin?.timezone?.name,
          }
        : null,
      destination: airport?.destination
        ? {
            iata: airport.destination?.code?.iata,
            icao: airport.destination?.code?.icao,
            city: airport.destination?.position?.region?.city,
            country: airport.destination?.position?.country?.name,
            lat: airport.destination?.position?.latitude,
            lng: airport.destination?.position?.longitude,
            timezone: airport.destination?.timezone?.name,
          }
        : null,
      scheduled_departure: time?.scheduled?.departure ? time.scheduled.departure * 1000 : null,
      actual_departure: time?.real?.departure ? time.real.departure * 1000 : null,
      scheduled_arrival: time?.scheduled?.arrival ? time.scheduled.arrival * 1000 : null,
      actual_arrival: time?.real?.arrival ? time.real.arrival * 1000 : null,
      status: status?.text || "unknown",
      trail,
      stats: computeStats(trail),
      source: "flightradar24",
    }
  } catch { return null }
}

async function fromOpenSkyTracks(icao24: string): Promise<Partial<FlightHistory> | null> {
  try {
    // OpenSky /tracks/all gives the last-hour track for an ICAO24.
    const url = `https://opensky-network.org/api/tracks/all?icao24=${encodeURIComponent(icao24.toLowerCase())}&time=0`
    const res = await fetch(url, {
      headers: { "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return null
    const j = await res.json()
    const path: any[] = j?.path || []
    // OpenSky path entries: [time, lat, lng, baro_alt, true_track, onGround]
    const trail: TrailPoint[] = path
      .map((p: any[]) => ({
        lat: Number(p[1]),
        lng: Number(p[2]),
        alt_ft: typeof p[3] === "number" ? Math.round(p[3] * 3.28084) : null,
        speed_kts: null,
        heading: typeof p[4] === "number" ? p[4] : null,
        vertical_rate: null,
        timestamp: Number(p[0]) * 1000,
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    if (trail.length < 3) return null
    return {
      id: icao24,
      callsign: j?.callsign || null,
      icao24,
      registration: null,
      airline: null,
      aircraft_type: null,
      aircraft_model: null,
      origin: null,
      destination: null,
      scheduled_departure: null,
      actual_departure: null,
      scheduled_arrival: null,
      actual_arrival: null,
      status: "active",
      trail,
      stats: computeStats(trail),
      source: "opensky",
    }
  } catch { return null }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params
  const idDecoded = decodeURIComponent(rawId || "")

  // Normalise. Our aircraft ids look like "fr24_3f46efee" or "osky_abc123"
  // or the bare hex / callsign. Split the prefix off before sending.
  const fr24IdMatch = idDecoded.match(/^fr24[_-](.+)$/i)
  const oskyIdMatch = idDecoded.match(/^osky[_-](.+)$/i)
  const fr24Id = fr24IdMatch ? fr24IdMatch[1] : (/^[0-9a-f]{6,8}$/i.test(idDecoded) ? idDecoded : null)
  const icao24 = oskyIdMatch ? oskyIdMatch[1] : (/^[0-9a-f]{6}$/i.test(idDecoded) ? idDecoded : null)
  const callsign = idDecoded.toUpperCase()

  // Try FR24 first (richest data), then OpenSky (broader coverage, no key)
  let result: Partial<FlightHistory> | null = null
  if (fr24Id) result = await fromFr24ClickHandler(fr24Id)
  if (!result && icao24) result = await fromOpenSkyTracks(icao24)
  if (!result) {
    // Graceful empty response + external links for the operator to click
    // through to a flight-tracking site manually.
    const empty: FlightHistory = {
      id: idDecoded,
      callsign: callsign,
      icao24,
      registration: null,
      airline: null,
      aircraft_type: null,
      aircraft_model: null,
      origin: null,
      destination: null,
      scheduled_departure: null,
      actual_departure: null,
      scheduled_arrival: null,
      actual_arrival: null,
      status: "unknown",
      trail: [],
      stats: computeStats([]),
      external_links: {
        airnavradar: `https://www.airnavradar.com/data/flights/${encodeURIComponent(callsign)}`,
        flightradar24: `https://www.flightradar24.com/${encodeURIComponent(callsign)}`,
        flightaware: `https://flightaware.com/live/flight/${encodeURIComponent(callsign)}`,
      },
      source: "none",
      note: "No trail available from FR24 / OpenSky. Use external_links to see full history.",
    }
    return NextResponse.json(empty, { status: 200 })
  }

  const resolvedCallsign = result.callsign || callsign
  const full: FlightHistory = {
    id: result.id || idDecoded,
    callsign: resolvedCallsign,
    icao24: result.icao24 ?? icao24,
    registration: result.registration ?? null,
    airline: result.airline ?? null,
    aircraft_type: result.aircraft_type ?? null,
    aircraft_model: result.aircraft_model ?? null,
    origin: result.origin ?? null,
    destination: result.destination ?? null,
    scheduled_departure: result.scheduled_departure ?? null,
    actual_departure: result.actual_departure ?? null,
    scheduled_arrival: result.scheduled_arrival ?? null,
    actual_arrival: result.actual_arrival ?? null,
    status: result.status ?? "unknown",
    trail: result.trail ?? [],
    stats: result.stats ?? computeStats([]),
    external_links: {
      airnavradar: `https://www.airnavradar.com/data/flights/${encodeURIComponent(resolvedCallsign)}`,
      flightradar24: `https://www.flightradar24.com/${encodeURIComponent(resolvedCallsign)}`,
      flightaware: `https://flightaware.com/live/flight/${encodeURIComponent(resolvedCallsign)}`,
    },
    source: result.source ?? "unknown",
  }
  return NextResponse.json(full, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  })
}
