import { NextRequest, NextResponse } from "next/server"
import { FEED_REGISTRY, type FeedConfig } from "@/lib/crep/feeds/registry"

/**
 * Earth Simulator — generic feed proxy. ONE route for every registry data source.
 *
 *   GET /api/crep/feed/{id}?bbox=west,south,east,north
 *
 * Looks up the FeedConfig, substitutes {bbox}/{minlat..}/{key} into its endpoint,
 * fetches, and normalizes to a GeoJSON FeatureCollection — passthrough when the
 * upstream is already GeoJSON, else maps each record via the config's
 * items_path / lat_path / lng_path / props. CORS + key-hiding happen here so the
 * browser only ever sees same-origin GeoJSON. Tier-A only (no protobuf/websocket).
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getPath(obj: any, path?: string): any {
  if (path == null || path === "") return obj
  let cur = obj
  for (const seg of String(path).split(".")) {
    if (cur == null) return undefined
    cur = cur[seg as any]
  }
  return cur
}

/** Try each "|"-separated path and return the first finite number (e.g. "lat|center.lat" for OSM nodes vs ways). */
function firstFiniteNum(obj: any, paths?: string): number {
  if (!paths) return NaN
  for (const p of String(paths).split("|")) {
    const v = Number(getPath(obj, p.trim()))
    if (Number.isFinite(v)) return v
  }
  return NaN
}

function buildUrl(cfg: FeedConfig, bbox: [number, number, number, number] | null): string | null {
  let url = cfg.endpoint
  if (url.includes("{key}")) {
    const varName = cfg.auth.startsWith("key:") ? cfg.auth.slice(4) : ""
    const key = (varName && process.env[varName]) || ""
    if (!key) return null // keyed source with no key available
    url = url.replaceAll("{key}", encodeURIComponent(key))
  }
  if (bbox) {
    const [w, s, e, n] = bbox
    url = url
      .replaceAll("{bbox}", `${w},${s},${e},${n}`)
      .replaceAll("{minlng}", String(w)).replaceAll("{minlat}", String(s))
      .replaceAll("{maxlng}", String(e)).replaceAll("{maxlat}", String(n))
  }
  return url
}

function passesWhere(cfg: FeedConfig, it: any): boolean {
  if (!cfg.where) return true
  const v = Number(getPath(it, cfg.where.path))
  if (!Number.isFinite(v)) return false
  if (cfg.where.gte != null && v < cfg.where.gte) return false
  if (cfg.where.lte != null && v > cfg.where.lte) return false
  return true
}

function toFeatures(cfg: FeedConfig, body: any): any[] {
  const cap = cfg.max_features ?? 50000
  if (cfg.is_geojson) {
    const feats = Array.isArray(body?.features) ? body.features : Array.isArray(body) ? body : []
    return feats
      .filter((f: any) => (f?.geometry?.coordinates || f?.geometry?.type) && passesWhere(cfg, f?.properties ?? f))
      .slice(0, cap)
  }
  // items_path "" on an object (not array) = a single Feature/record → wrap as one-item list
  const raw = getPath(body, cfg.items_path)
  const items = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : []
  if (!items.length) return []
  const out: any[] = []
  for (const it of items) {
    if (out.length >= cap) break
    if (!passesWhere(cfg, it)) continue
    const lat = firstFiniteNum(it, cfg.lat_path)
    const lng = firstFiniteNum(it, cfg.lng_path)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (lat === 0 && lng === 0) continue // null-island = missing coords sentinel
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue
    const props: Record<string, unknown> = {}
    for (const p of cfg.props || []) props[p] = getPath(it, p)
    out.push({ type: "Feature", properties: props, geometry: { type: "Point", coordinates: [lng, lat] } })
  }
  return out
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const cfg = FEED_REGISTRY.find((f) => f.id === id)
  if (!cfg) return NextResponse.json({ error: "unknown feed", id }, { status: 404 })

  const url = new URL(req.url)
  let bbox: [number, number, number, number] | null = null
  const bs = url.searchParams.get("bbox")
  if (bs) { const p = bs.split(",").map(Number); if (p.length === 4 && p.every(Number.isFinite)) bbox = p as any }

  const target = buildUrl(cfg, bbox)
  if (!target) {
    return NextResponse.json({ type: "FeatureCollection", features: [], error: "missing key", id }, { status: 200 })
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), cfg.timeout_ms ?? 12_000)
  try {
    const res = await fetch(target, {
      headers: { Accept: "application/geo+json,application/json,*/*", "User-Agent": "MycosoftCREP/1.0 (support@mycosoft.com)" },
      signal: controller.signal,
      cache: "no-store",
    })
    if (!res.ok) {
      return NextResponse.json({ type: "FeatureCollection", features: [], error: `upstream ${res.status}`, id }, { status: 200, headers: { "Cache-Control": "public, s-maxage=120" } })
    }
    const body = await res.json()
    const features = toFeatures(cfg, body)
    return NextResponse.json(
      { type: "FeatureCollection", source: cfg.id, count: features.length, features },
      { headers: { "Cache-Control": `public, s-maxage=${Math.max(30, cfg.refresh_s || 300)}, stale-while-revalidate=900` } },
    )
  } catch (err: any) {
    return NextResponse.json({ type: "FeatureCollection", features: [], error: err?.message || "fetch failed", id }, { status: 200 })
  } finally {
    clearTimeout(timer)
  }
}
