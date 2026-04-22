import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"

/**
 * CREP AirNow current-observations proxy — Apr 22, 2026
 *
 * Morgan: "you need to add all airnow.gov aqi monitors live with
 * widgets showing data all aqi widgets even ones we added for project
 * oyster and goffs need live data in widget no refresh needed".
 *
 * Pulls live AQI readings (PM2.5 / O3 / PM10 / CO / NO2 / SO2) from
 * EPA AirNow for the monitor nearest a lat/lng. Upstream cadence is
 * hourly so we cache 10 min to keep credits + bandwidth low while still
 * feeling live.
 *
 * Endpoint: https://www.airnowapi.org/aq/observation/latLong/current/
 * Docs:    https://docs.airnowapi.org/
 *
 * Contract:
 *   GET /api/crep/airnow/current?lat=&lng=&distance=25&ttl=600
 *   distance in miles (AirNow native unit), 1..100
 *
 * Env:
 *   AIRNOW_API_KEY — free key from https://docs.airnowapi.org/account/request/
 *
 * Response shape:
 *   { reporting_area, state, observations: [{
 *       parameter, aqi, category: {number,name},
 *       observed_at, lat, lng, agency }],
 *     dominant: {parameter, aqi, category},
 *     site_count: N, cached_at, ttl_s }
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CACHE_DIR = path.resolve(process.cwd(), "var", "cache", "airnow")
const MEM: Map<string, { at: number; payload: any; ttlMs: number }> = new Map()

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
}

function cacheKey(lat: number, lng: number, distanceMi: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}|${distanceMi}`
}

function cachePath(key: string): string {
  return path.join(CACHE_DIR, `current-${Buffer.from(key).toString("base64url").slice(0, 40)}.json`)
}

function readCache(key: string, ttlMs: number): any | null {
  const m = MEM.get(key)
  if (m && Date.now() - m.at < m.ttlMs) return m.payload
  try {
    ensureDir()
    const p = cachePath(key)
    if (!fs.existsSync(p)) return null
    const rec = JSON.parse(fs.readFileSync(p, "utf8"))
    if (!rec?.at || Date.now() - rec.at > ttlMs) return null
    MEM.set(key, { at: rec.at, payload: rec.payload, ttlMs })
    return rec.payload
  } catch {
    return null
  }
}

function writeCache(key: string, payload: any, ttlMs: number): void {
  MEM.set(key, { at: Date.now(), payload, ttlMs })
  try {
    ensureDir()
    fs.writeFileSync(cachePath(key), JSON.stringify({ at: Date.now(), payload }))
  } catch { /* ignore */ }
}

// AQI category by number (EPA scale).
function categoryFromAQI(aqi: number): { number: number; name: string; color: string } {
  if (aqi <= 50)  return { number: 1, name: "Good",                           color: "#00e400" }
  if (aqi <= 100) return { number: 2, name: "Moderate",                       color: "#ffff00" }
  if (aqi <= 150) return { number: 3, name: "Unhealthy for Sensitive Groups", color: "#ff7e00" }
  if (aqi <= 200) return { number: 4, name: "Unhealthy",                      color: "#ff0000" }
  if (aqi <= 300) return { number: 5, name: "Very Unhealthy",                 color: "#8f3f97" }
  return              { number: 6, name: "Hazardous",                    color: "#7e0023" }
}

const PARAM_LABELS: Record<string, string> = {
  O3:    "Ozone",
  PM25:  "PM2.5",
  "PM2.5": "PM2.5",
  PM10:  "PM10",
  CO:    "CO",
  NO2:   "NO₂",
  SO2:   "SO₂",
}

export async function GET(req: NextRequest) {
  const key = process.env.AIRNOW_API_KEY?.trim() || ""
  if (!key) {
    return NextResponse.json({ error: "AIRNOW_API_KEY not configured" }, { status: 501 })
  }

  const lat = Number(req.nextUrl.searchParams.get("lat"))
  const lng = Number(req.nextUrl.searchParams.get("lng"))
  const distanceMi = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("distance") || 25)))
  const ttlSecOverride = Number(req.nextUrl.searchParams.get("ttl") || 0)
  const ttlMs = Math.min(60 * 60_000, Math.max(60_000, ttlSecOverride * 1000 || 10 * 60_000)) // 10 min default, cap 1 h

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 })
  }

  const ckey = cacheKey(lat, lng, distanceMi)
  const cached = readCache(ckey, ttlMs)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-AirNow-Cache": "hit", "Cache-Control": "public, max-age=60" },
    })
  }

  try {
    const url = new URL("https://www.airnowapi.org/aq/observation/latLong/current/")
    url.searchParams.set("format", "application/json")
    url.searchParams.set("latitude", String(lat))
    url.searchParams.set("longitude", String(lng))
    url.searchParams.set("distance", String(distanceMi))
    url.searchParams.set("API_KEY", key)

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "MycosoftCREP/1.0", Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return NextResponse.json(
        { error: `airnow ${res.status}`, upstream_body: body.slice(0, 400) },
        { status: 502 },
      )
    }
    const items: any[] = await res.json()
    const observations = items.map((it) => ({
      parameter: PARAM_LABELS[it.ParameterName] || it.ParameterName,
      parameter_raw: it.ParameterName,
      aqi: Number(it.AQI),
      category: {
        number: Number(it.Category?.Number ?? categoryFromAQI(Number(it.AQI)).number),
        name:  String(it.Category?.Name   ?? categoryFromAQI(Number(it.AQI)).name),
        color: categoryFromAQI(Number(it.AQI)).color,
      },
      observed_at: `${it.DateObserved}T${String(it.HourObserved).padStart(2, "0")}:00:00${it.LocalTimeZone ? ` ${it.LocalTimeZone}` : ""}`,
      lat: Number(it.Latitude),
      lng: Number(it.Longitude),
      agency: it.ReportingArea || null,
      state: it.StateCode || null,
    })).filter((o) => Number.isFinite(o.aqi))

    const dominant = observations.reduce<typeof observations[number] | null>((best, o) => {
      if (!best || o.aqi > best.aqi) return o
      return best
    }, null)

    const payload = {
      reporting_area: dominant?.agency ?? items[0]?.ReportingArea ?? null,
      state: dominant?.state ?? items[0]?.StateCode ?? null,
      observations,
      dominant: dominant
        ? { parameter: dominant.parameter, aqi: dominant.aqi, category: dominant.category }
        : null,
      site_count: observations.length,
      cached_at: new Date().toISOString(),
      ttl_s: Math.floor(ttlMs / 1000),
      coordinates: { lat, lng, radius_mi: distanceMi },
    }
    writeCache(ckey, payload, ttlMs)
    return NextResponse.json(payload, {
      headers: { "X-AirNow-Cache": "miss", "Cache-Control": "public, max-age=60" },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "airnow fetch failed" }, { status: 502 })
  }
}
