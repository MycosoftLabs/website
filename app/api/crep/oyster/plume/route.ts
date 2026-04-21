/**
 * UCSD Pacific Forecast Model (PFM) sewage plume — live scrape fallback
 * Apr 21, 2026
 *
 * Morgan (deferred Item 2): "render the live sewage and contaminations
 * in the water ... based on pfmweb.ucsd.edu".
 *
 * Two paths, tried in order:
 *
 *   1. LIVE via SCCOOS OPeNDAP (if SCCOOS_PFM_ENDPOINT env is set).
 *      Cursor lane item 2.1 — Morgan emails falk-petersen@ucsd.edu for
 *      API access, sets env var when granted. Until then this returns
 *      null and falls through to #2.
 *
 *   2. HEADLESS-SCRAPE pfmweb.ucsd.edu viewer page via Playwright and
 *      extract the rendered plume contours from the Leaflet map layer.
 *      Cached 6 hr — pfmweb runs daily so we don't need sub-hour
 *      freshness.
 *
 *   3. STATIC FALLBACK — if both above fail (dev box without Playwright,
 *      SCCOOS cert expired), return the hardcoded polygon approximation
 *      that lives in /api/crep/tijuana-estuary TJ_OYSTER_PLUME. This
 *      ensures the Oyster map always paints a plume visual.
 *
 * Response shape matches what TijuanaEstuaryLayer expects:
 *   { outer: GeoJSON.Polygon, core: GeoJSON.Polygon,
 *     current_flow_m3s: number, sampled_at: ISO-8601,
 *     source: string }
 *
 * @route GET /api/crep/oyster/plume
 */

import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 45

const SCCOOS_PFM_ENDPOINT = process.env.SCCOOS_PFM_ENDPOINT
const SCCOOS_PFM_TOKEN = process.env.SCCOOS_PFM_TOKEN

// Static fallback (same as what's currently hardcoded in tijuana-estuary/
// route.ts TJ_OYSTER_PLUME). Keeps the Oyster map paint-clean when no
// live feed is available.
const STATIC_FALLBACK = {
  outer: {
    type: "Polygon" as const,
    coordinates: [[
      [-117.1600, 32.5400],
      [-117.2000, 32.5500],
      [-117.2500, 32.5800],
      [-117.2400, 32.6500],
      [-117.2000, 32.7000],
      [-117.2500, 32.7200],
      [-117.2800, 32.7400],
      [-117.2500, 32.5200],
      [-117.2000, 32.5100],
      [-117.1600, 32.5300],
      [-117.1600, 32.5400],
    ]],
  },
  core: {
    type: "Polygon" as const,
    coordinates: [[
      [-117.1400, 32.5400],
      [-117.1700, 32.5500],
      [-117.2000, 32.5600],
      [-117.2200, 32.5800],
      [-117.2100, 32.6200],
      [-117.1800, 32.6400],
      [-117.1500, 32.6200],
      [-117.1300, 32.5700],
      [-117.1300, 32.5400],
      [-117.1400, 32.5400],
    ]],
  },
  current_flow_m3s: 12.5,
  sampled_at: null as string | null,
  source: "static-approx",
}

// Memory cache — 6 hr TTL because PFM updates daily.
const CACHE_TTL_MS = 6 * 3600_000
let cache: { t: number; data: any } | null = null

async function tryScccoosOpendap(): Promise<any | null> {
  if (!SCCOOS_PFM_ENDPOINT) return null
  try {
    const url = `${SCCOOS_PFM_ENDPOINT}?time=latest&format=geojson`
    const res = await fetch(url, {
      headers: SCCOOS_PFM_TOKEN ? { Authorization: `Bearer ${SCCOOS_PFM_TOKEN}` } : {},
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const j = await res.json()
    if (!j?.outer || !j?.core) return null
    return {
      outer: j.outer,
      core: j.core,
      current_flow_m3s: j.flow_m3s ?? null,
      sampled_at: j.sampled_at ?? new Date().toISOString(),
      source: "sccoos:opendap",
    }
  } catch {
    return null
  }
}

async function tryHeadlessScrape(): Promise<any | null> {
  try {
    // Dynamic import so the Playwright module isn't pulled into bundle
    // for dev boxes that don't have it installed.
    const { chromium } = await import("playwright-core")
    const browser = await chromium.launch({ headless: true })
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    })
    const page = await ctx.newPage()
    // PFM viewer page. The actual plume is rendered as a Leaflet polyline/
    // polygon layer; we extract its coords from the page's Leaflet map
    // instance via an evaluated script.
    await page.goto("https://pfmweb.ucsd.edu/", { waitUntil: "networkidle", timeout: 20_000 })
    // Wait for the plume layer to mount.
    await page.waitForTimeout(4_000)
    // Extract Leaflet layer coordinates. This is tightly coupled to the
    // PFM viewer's JS — if they reorganize, bump the accessor path or
    // fall through to static.
    const coords = await page.evaluate(() => {
      const w = window as any
      if (!w.map || !w.map._layers) return null
      const polygons: Array<{ kind: string; latlngs: Array<{ lat: number; lng: number }> }> = []
      Object.values(w.map._layers).forEach((layer: any) => {
        if (layer?._latlngs && Array.isArray(layer._latlngs)) {
          const flat = Array.isArray(layer._latlngs[0]) ? layer._latlngs[0] : layer._latlngs
          const kind = layer.options?.fillColor === "#dc2626" ? "core"
                     : layer.options?.fillColor === "#b91c1c" ? "outer"
                     : "other"
          polygons.push({ kind, latlngs: flat.map((p: any) => ({ lat: p.lat, lng: p.lng })) })
        }
      })
      return polygons
    })
    await browser.close().catch(() => undefined)
    if (!coords || coords.length === 0) return null
    const outer = coords.find((p) => p.kind === "outer") || coords[0]
    const core  = coords.find((p) => p.kind === "core")  || coords[1] || coords[0]
    return {
      outer: {
        type: "Polygon",
        coordinates: [outer.latlngs.map((p) => [p.lng, p.lat])],
      },
      core: {
        type: "Polygon",
        coordinates: [core.latlngs.map((p) => [p.lng, p.lat])],
      },
      current_flow_m3s: null,
      sampled_at: new Date().toISOString(),
      source: "pfmweb:scrape",
    }
  } catch (e: any) {
    console.warn("[oyster/plume] scrape failed:", e?.message)
    return null
  }
}

// Apr 21, 2026 refactor (Morgan iteration): stale-while-revalidate
// pattern. Every request returns IMMEDIATELY with cached or static
// data (<50 ms). A background task refreshes the cache — Playwright
// scrape + SCCOOS OPeNDAP — so subsequent requests get fresher data
// without ever blocking the current one.
let refreshInFlight = false
async function refreshCacheBackground() {
  if (refreshInFlight) return
  refreshInFlight = true
  try {
    let plume = await tryScccoosOpendap()
    if (!plume) plume = await tryHeadlessScrape()
    if (plume) {
      cache = { t: Date.now(), data: plume }
    }
  } catch (e: any) {
    console.warn("[oyster/plume] bg refresh failed:", e?.message)
  } finally {
    refreshInFlight = false
  }
}

export async function GET() {
  const now = Date.now()
  const fresh = cache && now - cache.t < CACHE_TTL_MS
  const stale = cache && now - cache.t >= CACHE_TTL_MS

  // Serve cached if fresh
  if (fresh) {
    return NextResponse.json(
      { ...cache!.data, cached: true },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600" } },
    )
  }

  // Serve stale immediately + refresh in background (fire-and-forget)
  if (stale) {
    void refreshCacheBackground()
    return NextResponse.json(
      { ...cache!.data, cached: true, stale: true },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600" } },
    )
  }

  // Cold start: return STATIC_FALLBACK NOW (<5 ms), kick bg refresh.
  const initial = { ...STATIC_FALLBACK, sampled_at: new Date().toISOString() }
  cache = { t: now, data: initial }
  void refreshCacheBackground()

  return NextResponse.json(
    { ...initial, cached: false, cold: true },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600" } },
  )
}
