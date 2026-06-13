/**
 * /api/crep/viewport-sensors — May 24, 2026
 *
 * Returns environmental sensors in a bbox ONLY when live upstream data
 * exists (AQI, H₂S, tide, buoy, streamflow, IBWC discharge). Empty
 * catalog rows are omitted — no placeholder readings.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAirNowApiKey } from "@/lib/airnow-key"
import { resolveInternalBaseUrl } from "@/lib/internal-base-url"
import {
  VIEWPORT_SENSOR_CATALOG,
  type ViewportSensorCatalogEntry,
  type ViewportSensorKind,
} from "@/lib/crep/viewport-sensor-catalog"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export interface ViewportSensorLive {
  value: number
  unit: string
  parameter: string
  observed_at?: string | null
  label?: string
  color?: string
}

export interface ViewportSensorResult {
  id: string
  name: string
  provider: string
  agency?: string
  lat: number
  lng: number
  kind: ViewportSensorKind
  category: string
  station_id?: string
  description?: string
  live: ViewportSensorLive
}

type Bbox = { west: number; south: number; east: number; north: number }

function parseBbox(raw: string | null): Bbox | null {
  if (!raw) return null
  const parts = raw.split(",").map(Number)
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return null
  const [west, south, east, north] = parts
  if (south >= north) return null
  return { west, south, east, north }
}

function inBbox(lat: number, lng: number, bbox: Bbox): boolean {
  if (lat < bbox.south || lat > bbox.north) return false
  if (bbox.west <= bbox.east) return lng >= bbox.west && lng <= bbox.east
  return lng >= bbox.west || lng <= bbox.east
}

function filterCatalog(bbox: Bbox): ViewportSensorCatalogEntry[] {
  return VIEWPORT_SENSOR_CATALOG.filter((s) => inBbox(s.lat, s.lng, bbox))
}

async function fetchAirNowMonitors(origin: string, bbox: Bbox): Promise<ViewportSensorResult[]> {
  const key = getAirNowApiKey()
  if (!key) return []
  try {
    const q = new URLSearchParams({
      bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
      parameters: "PM25,OZONE",
    })
    const res = await fetch(`${origin}/api/crep/airnow/bbox?${q}`, {
      signal: AbortSignal.timeout(2_800),
      cache: "no-store",
    })
    if (!res.ok) return []
    const json = await res.json()
    const features: any[] = json?.features || []
    return features.map((f) => {
      const p = f.properties || {}
      const [lng, lat] = f.geometry?.coordinates || [0, 0]
      return {
        id: String(p.id || `airnow-${lat}-${lng}`),
        name: String(p.name || "AirNow monitor"),
        provider: "airnow",
        agency: p.agency || "EPA AirNow",
        lat,
        lng,
        kind: "aqi" as const,
        category: "air-quality",
        live: {
          value: Number(p.aqi),
          unit: "AQI",
          parameter: String(p.parameter || "AQI"),
          observed_at: p.observed_at || null,
          label: String(p.aqi_category_name || ""),
          color: String(p.aqi_color || ""),
        },
      }
    }).filter((s) => Number.isFinite(s.live.value))
  } catch {
    return []
  }
}

async function fetchH2S(origin: string, catalog: ViewportSensorCatalogEntry[]): Promise<ViewportSensorResult[]> {
  const h2sIds = new Set(catalog.filter((s) => s.kind === "h2s").map((s) => s.id))
  if (!h2sIds.size) return []
  try {
    const res = await fetch(`${origin}/api/crep/sdapcd/h2s`, { signal: AbortSignal.timeout(12_000), cache: "no-store" })
    if (!res.ok) return []
    const json = await res.json()
    const stations: any[] = json?.stations || []
    const out: ViewportSensorResult[] = []
    for (const row of stations) {
      const id = String(row.id || "")
      if (!h2sIds.has(id)) continue
      const ppb = row.h2s_ppb
      if (typeof ppb !== "number" || !Number.isFinite(ppb)) continue
      const cat = catalog.find((s) => s.id === id)
      if (!cat) continue
      out.push({
        ...cat,
        live: {
          value: ppb,
          unit: "ppb",
          parameter: "H₂S",
          observed_at: row.observed_at || null,
        },
      })
    }
    return out
  } catch {
    return []
  }
}

async function fetchIbwc(catalog: ViewportSensorCatalogEntry[]): Promise<ViewportSensorResult[]> {
  const ibwc = catalog.find((s) => s.kind === "river-flow")
  if (!ibwc) return []
  try {
    const res = await fetch("https://waterdata.ibwc.gov/AQWebportal/Data/DataSet/Export/Location/11013300/DataSet/Discharge/Best%20Available/Interval/Latest?_=1", {
      headers: { Accept: "text/csv,application/json,*/*", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const txt = await res.text()
    const lines = txt.split(/\r?\n/).filter((l) => l && l.startsWith("20"))
    if (!lines.length) return []
    const [ts, val] = lines[lines.length - 1].split(",")
    const value = Number(val)
    if (!Number.isFinite(value)) return []
    return [{
      ...ibwc,
      live: {
        value,
        unit: "m³/s",
        parameter: "discharge",
        observed_at: ts || null,
      },
    }]
  } catch {
    return []
  }
}

async function fetchCoopsTide(entry: ViewportSensorCatalogEntry): Promise<ViewportSensorResult | null> {
  const station = entry.station_id
  if (!station) return null
  try {
    const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=${station}&product=water_level&datum=MLLW&units=english&time_zone=lst_ldt&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000), cache: "no-store" })
    if (!res.ok) return null
    const json = await res.json()
    const row = json?.data?.[json.data.length - 1]
    const value = Number(row?.v)
    if (!Number.isFinite(value)) return null
    return {
      ...entry,
      live: {
        value,
        unit: "ft",
        parameter: "water_level",
        observed_at: row?.t ? `${row.t}:00` : null,
        label: "MLLW tide",
      },
    }
  } catch {
    return null
  }
}

async function fetchUsgsFlow(entry: ViewportSensorCatalogEntry): Promise<ViewportSensorResult | null> {
  const site = entry.station_id
  if (!site) return null
  try {
    const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${site}&parameterCd=00060&siteStatus=all`
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000), cache: "no-store" })
    if (!res.ok) return null
    const json = await res.json()
    const series = json?.value?.timeSeries?.[0]
    const values = series?.values?.[0]?.value
    if (!Array.isArray(values) || !values.length) return null
    const latest = [...values].reverse().find((v: any) => v?.value && v.value !== "-999999")
    if (!latest) return null
    const value = Number(latest.value)
    if (!Number.isFinite(value)) return null
    const unit = series?.variable?.variableDescription?.includes("cubic feet")
      ? "ft³/s"
      : "cfs"
    return {
      ...entry,
      live: {
        value,
        unit,
        parameter: "streamflow",
        observed_at: latest.dateTime || null,
      },
    }
  } catch {
    return null
  }
}

async function fetchNdbcBuoy(entry: ViewportSensorCatalogEntry, origin: string): Promise<ViewportSensorResult | null> {
  const station = entry.station_id
  if (!station) return null
  try {
    const res = await fetch(`${origin}/api/crep/buoy/${station}`, { signal: AbortSignal.timeout(10_000), cache: "no-store" })
    if (!res.ok) return null
    const json = await res.json()
    const obs = json?.observation
    if (!obs) return null
    const value = obs.water_temp_c ?? obs.wave_height_m ?? obs.wind_speed_ms ?? obs.pressure_hpa
    if (typeof value !== "number" || !Number.isFinite(value)) return null
    const parameter = obs.water_temp_c != null ? "water_temp" : obs.wave_height_m != null ? "wave_height" : obs.wind_speed_ms != null ? "wind_speed" : "pressure"
    const unit = parameter === "water_temp" ? "°C" : parameter === "wave_height" ? "m" : parameter === "wind_speed" ? "m/s" : "hPa"
    return {
      ...entry,
      live: {
        value,
        unit,
        parameter,
        observed_at: obs.observed_at || null,
      },
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"))
  if (!bbox) {
    return NextResponse.json({ error: "bbox=west,south,east,north required" }, { status: 400 })
  }

  const limit = Math.min(24, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 12)))
  const origin = resolveInternalBaseUrl(new URL(req.url).origin)
  const catalog = filterCatalog(bbox)

  const tideEntries = catalog.filter((s) => s.kind === "tide")
  const streamEntries = catalog.filter((s) => s.kind === "streamflow")
  const buoyEntries = catalog.filter((s) => s.kind === "buoy")

  const [
    airnow,
    h2s,
    ibwc,
    tides,
    streams,
    buoys,
  ] = await Promise.all([
    fetchAirNowMonitors(origin, bbox),
    fetchH2S(origin, catalog),
    fetchIbwc(catalog),
    Promise.all(tideEntries.map(fetchCoopsTide)),
    Promise.all(streamEntries.map(fetchUsgsFlow)),
    Promise.all(buoyEntries.map((e) => fetchNdbcBuoy(e, origin))),
  ])

  const merged = new Map<string, ViewportSensorResult>()
  const allResults: ViewportSensorResult[] = [
    ...airnow,
    ...h2s,
    ...ibwc,
    ...(tides.filter(Boolean) as ViewportSensorResult[]),
    ...(streams.filter(Boolean) as ViewportSensorResult[]),
    ...(buoys.filter(Boolean) as ViewportSensorResult[]),
  ]
  for (const group of allResults) {
    if (group?.id) merged.set(group.id, group)
  }

  const sensors = Array.from(merged.values()).slice(0, limit)

  return NextResponse.json(
    {
      source: "viewport-sensors",
      generated_at: new Date().toISOString(),
      bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
      count: sensors.length,
      sensors,
    },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } },
  )
}
