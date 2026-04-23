import { NextRequest, NextResponse } from "next/server"
import type { TransitVehicle } from "@/lib/transit/gtfs-realtime"

/**
 * BART — SF Bay Area rapid transit.
 *
 * BART doesn't publish GTFS-realtime protobuf. Their live-train API is
 * JSON (ETD = estimated times of departure). We derive approximate vehicle
 * positions by joining station coords with live train ETDs so the CREP map
 * can still animate dots.
 *
 * GET /api/transit/bart?bbox=w,s,e,n
 *
 * Uses BART_API_KEY env var. `MW9S-E7SL-26DU-VV8V` is BART's longstanding
 * public sandbox key — we fall back to it when the env key is missing so
 * the endpoint still works at dev time (BART explicitly allows sandbox key
 * use for prototyping).
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SANDBOX_FALLBACK = "MW9S-E7SL-26DU-VV8V"

// BART station coords (canonical subset — used when ETD doesn't carry lat/lng)
const STATIONS: Record<string, { name: string; lat: number; lng: number }> = {
  "12TH": { name: "12th St Oakland", lat: 37.8034, lng: -122.2720 },
  "16TH": { name: "16th St Mission", lat: 37.7654, lng: -122.4194 },
  "19TH": { name: "19th St Oakland", lat: 37.8084, lng: -122.2687 },
  "24TH": { name: "24th St Mission", lat: 37.7523, lng: -122.4184 },
  "ANTC": { name: "Antioch", lat: 37.9955, lng: -121.7805 },
  "ASHB": { name: "Ashby", lat: 37.8528, lng: -122.2697 },
  "BALB": { name: "Balboa Park", lat: 37.7217, lng: -122.4473 },
  "BAYF": { name: "Bay Fair", lat: 37.6970, lng: -122.1266 },
  "BERY": { name: "Berryessa/North San Jose", lat: 37.3683, lng: -121.8743 },
  "CAST": { name: "Castro Valley", lat: 37.6906, lng: -122.0757 },
  "CIVC": { name: "Civic Center/UN Plaza", lat: 37.7795, lng: -122.4136 },
  "COLM": { name: "Colma", lat: 37.6843, lng: -122.4661 },
  "COLS": { name: "Coliseum", lat: 37.7537, lng: -122.1976 },
  "CONC": { name: "Concord", lat: 37.9738, lng: -122.0295 },
  "DALY": { name: "Daly City", lat: 37.7063, lng: -122.4691 },
  "DBRK": { name: "Downtown Berkeley", lat: 37.8700, lng: -122.2683 },
  "DELN": { name: "El Cerrito del Norte", lat: 37.9253, lng: -122.3168 },
  "DUBL": { name: "Dublin/Pleasanton", lat: 37.7017, lng: -121.9004 },
  "EMBR": { name: "Embarcadero", lat: 37.7929, lng: -122.3974 },
  "FRMT": { name: "Fremont", lat: 37.5577, lng: -121.9765 },
  "FTVL": { name: "Fruitvale", lat: 37.7748, lng: -122.2241 },
  "GLEN": { name: "Glen Park", lat: 37.7331, lng: -122.4336 },
  "HAYW": { name: "Hayward", lat: 37.6694, lng: -122.0876 },
  "LAFY": { name: "Lafayette", lat: 37.8933, lng: -122.1247 },
  "LAKE": { name: "Lake Merritt", lat: 37.7974, lng: -122.2655 },
  "MCAR": { name: "MacArthur", lat: 37.8285, lng: -122.2670 },
  "MLBR": { name: "Millbrae", lat: 37.5997, lng: -122.3873 },
  "MLPT": { name: "Milpitas", lat: 37.4102, lng: -121.8924 },
  "MONT": { name: "Montgomery St", lat: 37.7892, lng: -122.4015 },
  "NBRK": { name: "North Berkeley", lat: 37.8740, lng: -122.2833 },
  "NCON": { name: "North Concord/Martinez", lat: 38.0031, lng: -122.0246 },
  "OAKL": { name: "Oakland Intl Airport", lat: 37.7134, lng: -122.2124 },
  "ORIN": { name: "Orinda", lat: 37.8787, lng: -122.1838 },
  "PCTR": { name: "Pittsburg Center", lat: 38.0169, lng: -121.8899 },
  "PITT": { name: "Pittsburg/Bay Point", lat: 38.0189, lng: -121.9457 },
  "PHIL": { name: "Pleasant Hill/Contra Costa Centre", lat: 37.9286, lng: -122.0561 },
  "POWL": { name: "Powell St", lat: 37.7844, lng: -122.4080 },
  "RICH": { name: "Richmond", lat: 37.9368, lng: -122.3530 },
  "ROCK": { name: "Rockridge", lat: 37.8443, lng: -122.2515 },
  "SANL": { name: "San Leandro", lat: 37.7227, lng: -122.1610 },
  "SBRN": { name: "San Bruno", lat: 37.6376, lng: -122.4160 },
  "SFIA": { name: "San Francisco Intl Airport", lat: 37.6156, lng: -122.3929 },
  "SHAY": { name: "South Hayward", lat: 37.6348, lng: -122.0575 },
  "SSAN": { name: "South San Francisco", lat: 37.6642, lng: -122.4437 },
  "UCTY": { name: "Union City", lat: 37.5912, lng: -122.0174 },
  "WARM": { name: "Warm Springs/South Fremont", lat: 37.5026, lng: -121.9395 },
  "WCRK": { name: "Walnut Creek", lat: 37.9055, lng: -122.0676 },
  "WDUB": { name: "West Dublin/Pleasanton", lat: 37.6996, lng: -121.9282 },
  "WOAK": { name: "West Oakland", lat: 37.8050, lng: -122.2946 },
}

export async function GET(req: NextRequest) {
  const key = (process.env.BART_API_KEY?.trim()) || SANDBOX_FALLBACK
  const bboxStr = req.nextUrl.searchParams.get("bbox")
  const bbox = parseBbox(bboxStr)

  try {
    const url = `https://api.bart.gov/api/etd.aspx?cmd=etd&orig=ALL&key=${encodeURIComponent(key)}&json=y`
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" })
    if (!r.ok) return NextResponse.json({ ok: false, error: `upstream ${r.status}` }, { status: 502 })
    const j = await r.json()
    const stations: any[] = j?.root?.station || []
    const vehicles: TransitVehicle[] = []
    for (const s of stations) {
      const abbr = s.abbr
      const meta = STATIONS[abbr]
      if (!meta) continue
      const etds: any[] = s.etd || []
      for (const etd of etds) {
        const est: any[] = etd.estimate || []
        for (const e of est) {
          const mins = Number(e.minutes)
          if (!Number.isFinite(mins) && e.minutes !== "Leaving") continue
          // Derive an approximate "leaving X in N minutes" vehicle at the station
          vehicles.push({
            id: `bart:${abbr}:${etd.destination}:${e.minutes}:${e.platform || "?"}`,
            agency: "o-9q9-bart",
            agency_name: "BART",
            route_id: etd.abbreviation || undefined,
            trip_id: `bart-${abbr}-${etd.destination}`,
            lat: meta.lat,
            lng: meta.lng,
            timestamp: Date.now(),
            vehicle_type: "rail",
            current_status: mins === 0 || e.minutes === "Leaving" ? "STOPPED_AT" : "INCOMING_AT",
            stop_id: abbr,
            // Use route color + destination as metadata
          })
        }
      }
    }
    const filtered = bbox
      ? vehicles.filter((v) => v.lng >= bbox[0] && v.lng <= bbox[2] && v.lat >= bbox[1] && v.lat <= bbox[3])
      : vehicles

    return NextResponse.json({
      ok: true,
      agency: "BART",
      agency_onestop: "o-9q9-bart",
      vehicles_total: vehicles.length,
      vehicles_in_bbox: filtered.length,
      vehicles: filtered,
      generated_at: new Date().toISOString(),
      note: "BART doesn't expose GTFS-rt protobuf; this endpoint derives vehicle-like dots from ETDs.",
    }, { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "fetch failed" }, { status: 502 })
  }
}

function parseBbox(s: string | null): [number, number, number, number] | null {
  if (!s) return null
  const parts = s.split(",").map(Number)
  return parts.length === 4 && parts.every(Number.isFinite) ? [parts[0], parts[1], parts[2], parts[3]] as [number, number, number, number] : null
}
