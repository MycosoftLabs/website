/**
 * NDBC buoy observation fetcher — Apr 21, 2026
 *
 * Morgan: "data from a noaa buoy on coronado needs to be in the widget
 * not link to this page full of data — www.ndbc.noaa.gov/
 * station_page.php?station=46232".
 *
 * Pulls NDBC's realtime2 .txt observation stream for any station ID
 * (46232 = Coronado), parses the last non-MM observation row into a
 * structured JSON, returns it for widget display.
 *
 * NDBC realtime2 format (space-separated, MM = missing):
 *   #YY  MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
 *   2026 04 21 19 40  245 8.0  10.0 1.2  9.1 6.2 255 1014.8 17.4 17.6 15.2 10.0 0.2  -
 *
 * Edge cache 5 min — NDBC updates every 30–60 min per station.
 *
 * @route GET /api/crep/buoy/[station]
 *   e.g. /api/crep/buoy/46232
 */

import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const NDBC_REALTIME_BASE = "https://www.ndbc.noaa.gov/data/realtime2"

interface BuoyObservation {
  station_id: string
  observed_at: string
  wind_dir_deg: number | null
  wind_speed_ms: number | null
  gust_ms: number | null
  wave_height_m: number | null
  dominant_wave_period_s: number | null
  average_wave_period_s: number | null
  mean_wave_dir_deg: number | null
  pressure_hpa: number | null
  air_temp_c: number | null
  water_temp_c: number | null
  dew_point_c: number | null
  visibility_nmi: number | null
  pressure_tendency_hpa: number | null
  tide_ft: number | null
}

function parseFloatOrNull(v: string): number | null {
  if (!v || v === "MM" || v === "-") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function parseNdbcRealtimeText(text: string, stationId: string): BuoyObservation | null {
  const lines = text.split(/\r?\n/).filter((l) => l && !l.startsWith("#"))
  if (!lines.length) return null
  // Find the most recent row that has ANY non-MM measurement value.
  for (const line of lines) {
    const cols = line.trim().split(/\s+/)
    if (cols.length < 18) continue
    const [yr, mo, dy, hr, mn, wdir, wspd, gst, wvht, dpd, apd, mwd, pres, atmp, wtmp, dewp, vis, ptdy, tide] = cols
    const isoTs = `${yr}-${mo}-${dy}T${hr}:${mn}:00Z`
    const allMissing = [wdir, wspd, gst, wvht, pres, atmp, wtmp].every((v) => v === "MM" || !v)
    if (allMissing) continue
    return {
      station_id: stationId,
      observed_at: isoTs,
      wind_dir_deg: parseFloatOrNull(wdir),
      wind_speed_ms: parseFloatOrNull(wspd),
      gust_ms: parseFloatOrNull(gst),
      wave_height_m: parseFloatOrNull(wvht),
      dominant_wave_period_s: parseFloatOrNull(dpd),
      average_wave_period_s: parseFloatOrNull(apd),
      mean_wave_dir_deg: parseFloatOrNull(mwd),
      pressure_hpa: parseFloatOrNull(pres),
      air_temp_c: parseFloatOrNull(atmp),
      water_temp_c: parseFloatOrNull(wtmp),
      dew_point_c: parseFloatOrNull(dewp),
      visibility_nmi: parseFloatOrNull(vis),
      pressure_tendency_hpa: parseFloatOrNull(ptdy),
      tide_ft: parseFloatOrNull(tide),
    }
  }
  return null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ station: string }> },
) {
  const { station } = await params
  if (!station || !/^[A-Za-z0-9]{1,10}$/.test(station)) {
    return NextResponse.json({ error: "invalid station id" }, { status: 400 })
  }

  try {
    const url = `${NDBC_REALTIME_BASE}/${station}.txt`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mycosoft CREP (support@mycosoft.com)" },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `NDBC ${res.status}`, station_id: station, observation: null },
        { status: 502, headers: { "Cache-Control": "public, s-maxage=60" } },
      )
    }
    const text = await res.text()
    const obs = parseNdbcRealtimeText(text, station)
    if (!obs) {
      return NextResponse.json(
        { error: "no observations", station_id: station, observation: null, raw_sample: text.slice(0, 400) },
        { status: 502, headers: { "Cache-Control": "public, s-maxage=60" } },
      )
    }
    return NextResponse.json(
      {
        station_id: station,
        observation: obs,
        source_url: url,
        detail_url: `https://www.ndbc.noaa.gov/station_page.php?station=${station}`,
        fetched_at: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
    )
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "fetch failed", station_id: station, observation: null },
      { status: 502, headers: { "Cache-Control": "public, s-maxage=60" } },
    )
  }
}
