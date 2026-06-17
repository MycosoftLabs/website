import { NextRequest, NextResponse } from "next/server"

/**
 * Ocean — NOAA CO-OPS tidal currents (direction + speed "now") — Jun 15 2026
 *
 * Drives the animated current arrows in the channels for the Earth Simulator
 * "Ocean & Coastal" layer. Pulls CO-OPS `currents_predictions` for known current
 * stations (default = San Diego Bay entrance PCT0031), picks the prediction
 * nearest to now, and returns each station's velocity (knots) + set (degrees true)
 * so the frontend can draw a flow arrow oriented to the current and sized by speed.
 * No key, Tier-A. Harmonic predictions (not live ADCP), refreshed every few min.
 *
 *   GET /api/crep/ocean/currents?stations=PCT0031,...   (default SD Bay set)
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const COOPS = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter"

// Known SD-area current stations w/ coordinates (CO-OPS PCT/ current stations).
const SD_CURRENT_STATIONS: Array<{ id: string; name: string; lat: number; lng: number }> = [
  { id: "PCT0031", name: "San Diego Bay Entrance", lat: 32.6797, lng: -117.2375 },
  { id: "PCT0046", name: "San Diego Bay, off Ballast Point", lat: 32.6889, lng: -117.2333 },
  { id: "PCT0101", name: "San Diego Bay, North Island", lat: 32.7019, lng: -117.2003 },
]

function todayUTC(): string {
  // CO-OPS wants yyyyMMdd; use the live clock (route is request-time, not a worker).
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}${m}${day}`
}

async function fetchStationCurrent(st: { id: string; name: string; lat: number; lng: number }) {
  const qp = new URLSearchParams({
    begin_date: todayUTC(),
    end_date: todayUTC(),
    station: st.id,
    product: "currents_predictions",
    time_zone: "gmt",
    units: "english",
    interval: "6",
    format: "json",
  })
  try {
    const res = await fetch(`${COOPS}?${qp}`, {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    })
    if (!res.ok) return null
    const j = await res.json()
    const rows: any[] = j?.current_predictions?.cp || j?.cp || []
    if (!rows.length) return null
    const now = Date.now()
    // pick the prediction nearest to now (rows have Time "yyyy-MM-dd HH:mm", Velocity_Major, Bin/dir)
    let best: any = rows[0]
    let bestDelta = Infinity
    for (const r of rows) {
      const t = Date.parse(`${String(r.Time).replace(" ", "T")}:00Z`)
      const d = Math.abs(t - now)
      if (d < bestDelta) { bestDelta = d; best = r }
    }
    const velocity = Number(best.Velocity_Major ?? best.velocity ?? 0)
    // Set: CO-OPS gives mean flood/ebb dirs; Velocity_Major sign → flood(+)/ebb(−).
    const floodDir = Number(best.meanFloodDir ?? best.Bin ?? 0)
    const ebbDir = Number(best.meanEbbDir ?? 0)
    const setDeg = velocity >= 0 ? (floodDir || 0) : (ebbDir || ((floodDir + 180) % 360))
    return {
      station_id: st.id, name: st.name, lat: st.lat, lng: st.lng,
      velocity_knots: Math.abs(velocity),
      direction_deg: setDeg,
      phase: velocity >= 0 ? "flood" : "ebb",
      observed_at: String(best.Time || ""),
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const param = url.searchParams.get("stations")
  const stations = param
    ? param.split(",").map((id) => SD_CURRENT_STATIONS.find((s) => s.id === id) ?? { id, name: id, lat: NaN, lng: NaN }).filter((s) => Number.isFinite(s.lat))
    : SD_CURRENT_STATIONS

  const results = (await Promise.all(stations.map(fetchStationCurrent))).filter(Boolean)
  return NextResponse.json(
    {
      type: "FeatureCollection",
      source: "noaa-coops-currents",
      count: results.length,
      features: results.map((r: any) => ({
        type: "Feature",
        properties: { ...r },
        geometry: { type: "Point", coordinates: [r.lng, r.lat] },
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
  )
}
