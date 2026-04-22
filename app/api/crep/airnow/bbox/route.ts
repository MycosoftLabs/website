import { NextRequest, NextResponse } from "next/server"
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

export async function GET(req: NextRequest) {
  const key = process.env.AIRNOW_API_KEY?.trim() || ""
  if (!key) return NextResponse.json({ error: "AIRNOW_API_KEY not configured" }, { status: 501 })

  const bboxRaw = req.nextUrl.searchParams.get("bbox") || ""
  const parts = bboxRaw.split(",").map(Number)
  if (parts.length !== 4 || !parts.every(Number.isFinite)) {
    return NextResponse.json({ error: "bbox=w,s,e,n required" }, { status: 400 })
  }
  const [w, s, e, n] = parts
  if (w >= e || s >= n) {
    return NextResponse.json({ error: "invalid bbox: w<e, s<n" }, { status: 400 })
  }
  const params = (req.nextUrl.searchParams.get("parameters") || "PM25,OZONE").toUpperCase()

  const cacheKey = `bbox|${w.toFixed(2)},${s.toFixed(2)},${e.toFixed(2)},${n.toFixed(2)}|${params}`
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

    const url = new URL("https://www.airnowapi.org/aq/data/")
    url.searchParams.set("startDate", fmt(start))
    url.searchParams.set("endDate", fmt(end))
    url.searchParams.set("parameters", params)
    url.searchParams.set("BBOX", `${w},${s},${e},${n}`)
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
      return NextResponse.json(
        { error: `airnow ${res.status}`, upstream_body: body.slice(0, 400) },
        { status: 502 },
      )
    }
    const rows: any[] = await res.json()

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
