import { NextRequest, NextResponse } from "next/server"
import { getAirNowApiKey } from "@/lib/airnow-key"
import fs from "node:fs"
import path from "node:path"

/**
 * CREP AirNow bbox proxy — Apr 22, 2026
 *
 * Morgan: "you need to add all airnow.gov aqi monitors live with
 * widgets showing data". This endpoint returns every AirNow monitor
 * inside a bounding box with its current PM2.5 / Ozone reading, suitable
 * for the CREP map layer.
 *
 * AirNow's /aq/data endpoint is the underlying API — it's hourly, so
 * 15 min cache is the right balance between fresh + credit-cheap.
 *
 * Contract:
 *   GET /api/crep/airnow/bbox?bbox=<w,s,e,n>&parameters=PM25,OZONE,NO2
 *   (bbox in lng/lat order, parameters comma-separated)
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CACHE_DIR = path.resolve(process.cwd(), "var", "cache", "airnow")
const TTL_MS = 15 * 60_000
type AirNowBbox = [number, number, number, number]

const US_AIRNOW_FALLBACK_BBOXES: AirNowBbox[] = [
  [-125.0, 24.0, -66.5, 50.0],
  [-170.0, 51.0, -130.0, 72.0],
  [-161.0, 18.5, -154.0, 23.0],
  [-68.5, 17.5, -64.0, 19.0],
]

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
}

function catFromAQI(aqi: number): { number: number; name: string; color: string } {
  if (aqi <= 50)  return { number: 1, name: "Good",                           color: "#00e400" }
  if (aqi <= 100) return { number: 2, name: "Moderate",                       color: "#ffff00" }
  if (aqi <= 150) return { number: 3, name: "Unhealthy for Sensitive Groups", color: "#ff7e00" }
  if (aqi <= 200) return { number: 4, name: "Unhealthy",                      color: "#ff0000" }
  if (aqi <= 300) return { number: 5, name: "Very Unhealthy",                 color: "#8f3f97" }
  return              { number: 6, name: "Hazardous",                    color: "#7e0023" }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function normalizeLng(lng: number): number {
  let out = lng
  while (out < -180) out += 360
  while (out > 180) out -= 360
  return out
}

function normalizeAirNowBboxes(parts: number[]): AirNowBbox[] {
  let [w, s, e, n] = parts
  s = clamp(s, -90, 90)
  n = clamp(n, -90, 90)
  if (s >= n) return []

  const rawWidth = Math.abs(e - w)
  const fullWorldView = rawWidth >= 360 || rawWidth === 0

  w = normalizeLng(w)
  e = normalizeLng(e)
  const span = w <= e ? e - w : 360 - (w - e)
  if (fullWorldView || span >= 170) return US_AIRNOW_FALLBACK_BBOXES
  if (w < e) return [[w, s, e, n]]
  return [[w, s, 180, n], [-180, s, e, n]]
}

export async function GET(req: NextRequest) {
  const key = getAirNowApiKey()
  if (!key) return NextResponse.json({ error: "AIRNOW_API_KEY not configured" }, { status: 501 })

  const bboxRaw = req.nextUrl.searchParams.get("bbox") || ""
  const parts = bboxRaw.split(",").map(Number)
  if (parts.length !== 4 || !parts.every(Number.isFinite)) {
    return NextResponse.json({ error: "bbox=w,s,e,n required" }, { status: 400 })
  }
  const [w, s, e, n] = parts
  const requestBboxes = normalizeAirNowBboxes(parts)
  if (requestBboxes.length === 0) {
    return NextResponse.json({ error: "invalid bbox: bbox must cover a non-empty latitude range" }, { status: 400 })
  }
  const params = (req.nextUrl.searchParams.get("parameters") || "PM25,OZONE").toUpperCase()

  const cacheKey = `bbox|${requestBboxes.map((b) => b.map((x) => x.toFixed(2)).join(",")).join("|")}|${params}`
  const cachePath = path.join(CACHE_DIR, `bbox-${Buffer.from(cacheKey).toString("base64url").slice(0, 48)}.json`)
  try {
    ensureDir()
    if (fs.existsSync(cachePath)) {
      const rec = JSON.parse(fs.readFileSync(cachePath, "utf8"))
      if (rec?.at && Date.now() - rec.at < TTL_MS) {
        return NextResponse.json(rec.payload, {
          headers: { "X-AirNow-Cache": "hit", "Cache-Control": "public, max-age=120" },
        })
      }
    }
  } catch { /* ignore */ }

  try {
    // AirNow data endpoint expects startDate/endDate as UTC datetime in
    // yyyy-mm-ddTHH format. Use the last whole hour.
    const now = new Date()
    now.setUTCMinutes(0, 0, 0)
    const end = now
    const start = new Date(end.getTime() - 60 * 60_000)
    const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}`

    const fetchBox = async (box: AirNowBbox): Promise<any[]> => {
      const url = new URL("https://www.airnowapi.org/aq/data/")
      url.searchParams.set("startDate", fmt(start))
      url.searchParams.set("endDate", fmt(end))
      url.searchParams.set("parameters", params)
      url.searchParams.set("BBOX", box.join(","))
      url.searchParams.set("dataType", "A")   // A = AQI (not raw concentration)
      url.searchParams.set("format", "application/json")
      url.searchParams.set("verbose", "1")
      url.searchParams.set("API_KEY", key)

      const res = await fetch(url.toString(), {
        headers: { "User-Agent": "MycosoftCREP/1.0", Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new Error(`airnow ${res.status}: ${body.slice(0, 180)}`)
      }
      return res.json()
    }

    const results = await Promise.allSettled(requestBboxes.map(fetchBox))
    const rows = results.flatMap((result) => result.status === "fulfilled" && Array.isArray(result.value) ? result.value : [])
    if (rows.length === 0 && results.some((result) => result.status === "rejected")) {
      const reason = results.find((result) => result.status === "rejected") as PromiseRejectedResult | undefined
      return NextResponse.json(
        { error: reason?.reason?.message || "airnow fetch failed" },
        { status: 502 },
      )
    }

    // Group by site (same LocalSiteName usually indicates one monitor
    // reporting multiple parameters). Keep the HIGHEST-AQI observation
    // per site as the "dominant" reading so map markers colour by the
    // worst pollutant at each location.
    const bySite = new Map<string, any>()
    for (const r of rows) {
      const lat = Number(r.Latitude), lng = Number(r.Longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      const aqi = Number(r.AQI)
      if (!Number.isFinite(aqi)) continue
      const siteKey = `${r.SiteName || r.LocalSiteName || r.FullAQSCode || ""}|${lat.toFixed(4)},${lng.toFixed(4)}`
      const existing = bySite.get(siteKey)
      if (!existing || aqi > existing.aqi) {
        const cat = catFromAQI(aqi)
        bySite.set(siteKey, {
          id: r.FullAQSCode || siteKey,
          name: r.SiteName || r.LocalSiteName || "AirNow monitor",
          agency: r.AgencyName || null,
          parameter: r.Parameter || r.ParameterName,
          aqi,
          category: cat,
          lat, lng,
          observed_at: r.UTC ? `${r.UTC}Z` : null,
        })
      }
    }
    const monitors = Array.from(bySite.values())

    const payload = {
      type: "FeatureCollection" as const,
      generated_at: new Date().toISOString(),
      bbox: [w, s, e, n] as [number, number, number, number],
      airnow_bboxes: requestBboxes,
      monitor_count: monitors.length,
      features: monitors.map((m) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [m.lng, m.lat] },
        properties: {
          id: m.id,
          name: m.name,
          agency: m.agency,
          parameter: m.parameter,
          aqi: m.aqi,
          aqi_category_number: m.category.number,
          aqi_category_name: m.category.name,
          aqi_color: m.category.color,
          observed_at: m.observed_at,
        },
      })),
    }

    try {
      ensureDir()
      fs.writeFileSync(cachePath, JSON.stringify({ at: Date.now(), payload }))
    } catch { /* ignore */ }

    return NextResponse.json(payload, {
      headers: { "X-AirNow-Cache": "miss", "Cache-Control": "public, max-age=120" },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "airnow fetch failed" }, { status: 502 })
  }
}
