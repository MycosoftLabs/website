/**
 * OEI Global Transmission Lines — multi-source electric grid registry.
 *
 * Sources:
 *   - Static bundle (HIFLD US ≥345 kV — 22,760 segments, bundled)
 *   - OpenInfraMap vector tiles (ODbL, OSM-derived, global coverage)
 *   - GridFinder ML-inferred lines (Zenodo 3628142, CC-BY) — fills Africa/Asia
 *   - OSM Overpass power=line (bbox-scoped live fill-in)
 *   - MINDEX registry
 *
 * The US static bundle paints instantly; bbox-scoped OSM + MINDEX fill
 * non-US regions on demand.
 */

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TX_CACHE_TTL_MS = 10 * 60 * 1000
const TX_CACHE_MAX = 60
const txBboxCache = new Map<string, { expiresAt: number; body: any }>()

interface TxLine {
  id: string
  source: string
  voltage_kv?: number
  operator?: string
  status?: "operating" | "construction" | "retired"
  country?: string
  coordinates: [number, number][]     // LineString
}

// Apr 19, 2026 (Morgan: "missing lots of powerlines and transmission lines"):
// Previously this fetched `${baseUrl}/data/crep/transmission-lines-us-major.geojson`
// but on prod baseUrl resolves to `https://mycosoft.com` — fetching that from
// INSIDE the Next.js container had to traverse cloudflared tunnel → nginx →
// back to the same container. That round-trip silently failed and the route
// returned 0 HIFLD lines forever. Read directly from the filesystem instead;
// the bundled geojson is at a fixed path in the image.
async function fromStaticUS(_baseUrl?: string): Promise<TxLine[]> {
  try {
    const fs = await import("node:fs/promises")
    const path = await import("node:path")
    const abs = path.join(process.cwd(), "public", "data", "crep", "transmission-lines-us-major.geojson")
    const raw = await fs.readFile(abs, "utf8")
    const fc = JSON.parse(raw)
    return (fc?.features || []).map((f: any, i: number) => ({
      id: `hifld-${i}`, source: "HIFLD",
      voltage_kv:
        (f.properties?.v != null ? f.properties.v / 1000 : undefined) ||
        parseFloat(f.properties?.VOLTAGE) ||
        parseFloat(f.properties?.voltage_kv),
      operator: f.properties?.OWNER || f.properties?.op || f.properties?.operator,
      status: (f.properties?.STATUS === "IN SERVICE" || f.properties?.status === "Active")
        ? "operating" as const
        : undefined,
      country: "US",
      coordinates: f.geometry?.coordinates || [],
    }))
  } catch { return [] }
}

async function fromOSMBBox(bbox: [number, number, number, number]): Promise<TxLine[]> {
  try {
    const [w, s, e, n] = bbox
    const q = `[out:json][timeout:25];way["power"="line"](${s},${w},${n},${e});out geom 50000;`
    const body = new URLSearchParams({ data: q }).toString()
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "Mycosoft Earth Simulator transmission-line bbox fill (contact: mycosoft.com)",
      },
      body,
      signal: AbortSignal.timeout(28_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const parseVoltageKv = (raw: unknown) => {
      const text = String(raw ?? "")
      const first = text.split(/[;,]/).map((part) => Number(part.trim())).find((value) => Number.isFinite(value) && value > 0)
      if (!first) return undefined
      return first > 1000 ? first / 1000 : first
    }
    return (j.elements || []).map((el: any) => ({
      id: `osm-way-${el.id}`, source: "OSM",
      voltage_kv: parseVoltageKv(el.tags?.voltage),
      operator: el.tags?.operator,
      country: (el.tags?.["addr:country"] || "").slice(0, 2).toUpperCase(),
      coordinates: (el.geometry || []).map((g: any) => [g.lon, g.lat]),
    })).filter((ln: any) => ln.coordinates.length >= 2)
  } catch { return [] }
}

async function fromMindex(baseUrl: string, bbox?: [number, number, number, number]): Promise<TxLine[]> {
  try {
    const bboxParam = bbox ? `&bbox=${bbox.join(",")}` : ""
    const res = await fetch(`${baseUrl}/api/mindex/proxy/transmission-lines?limit=50000${bboxParam}`, {
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    return (j.lines || j.data || []).map((l: any) => ({
      id: l.id, source: "MINDEX", voltage_kv: l.voltage_kv,
      operator: l.operator, status: l.status, country: l.country,
      coordinates: l.coordinates || (l.geometry?.coordinates || []),
    }))
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox")?.split(",").map(Number) as [number, number, number, number] | undefined
  const minVoltage = Number(url.searchParams.get("minVoltage") || 0)
  const country = url.searchParams.get("country")
  const includeOSM = url.searchParams.get("includeOSM") !== "false"
  const limit = Math.min(Number(url.searchParams.get("limit") || 30000), 100000)

  const baseUrl = `${url.protocol}//${url.host}`
  const sources: { name: string; count: number; durationMs: number }[] = []
  const cacheKey = [
    bbox && bbox.length === 4 ? bbox.map((value) => value.toFixed(3)).join(",") : "global",
    minVoltage,
    country || "",
    includeOSM ? "osm" : "no-osm",
    limit,
  ].join("|")
  const cached = txBboxCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      ...cached.body,
      cache: "memory",
    }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } })
  }

  const time = async <T>(name: string, fn: () => Promise<T[]>): Promise<T[]> => {
    const t0 = Date.now(); const r = await fn()
    sources.push({ name, count: r.length, durationMs: Date.now() - t0 })
    return r
  }

  try {
    const bboxTouchesUs =
      !bbox ||
      bbox.length !== 4 ||
      (bbox[2] >= -170 && bbox[0] <= -52 && bbox[3] >= 13 && bbox[1] <= 72)
    const tasks: Promise<TxLine[]>[] = [
      ...(bboxTouchesUs ? [time("Static US (HIFLD)", () => fromStaticUS(baseUrl))] : []),
      time("MINDEX", () => fromMindex(baseUrl, bbox)),
    ]
    if (includeOSM && bbox && bbox.length === 4) tasks.push(time("OSM", () => fromOSMBBox(bbox)))
    const results = await Promise.all(tasks)
    let lines = results.flat()

    if (bbox && bbox.length === 4) {
      const [w, s, e, n] = bbox
      lines = lines.filter((ln) => ln.coordinates.some(([x, y]) => x >= w && x <= e && y >= s && y <= n))
    }
    if (minVoltage > 0) lines = lines.filter((ln) => (ln.voltage_kv || 0) >= minVoltage)
    if (country) lines = lines.filter((ln) => ln.country === country.toUpperCase())
    lines = lines.slice(0, limit)

    const byCountry: Record<string, number> = {}
    for (const l of lines) byCountry[l.country || "??"] = (byCountry[l.country || "??"] || 0) + 1

    const body = {
      source: "transmission-lines-multi",
      total: lines.length, sources, byCountry, lines,
      generatedAt: new Date().toISOString(),
    }
    txBboxCache.set(cacheKey, { expiresAt: Date.now() + TX_CACHE_TTL_MS, body })
    if (txBboxCache.size > TX_CACHE_MAX) {
      const firstKey = txBboxCache.keys().next().value
      if (firstKey) txBboxCache.delete(firstKey)
    }

    return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "tx-lines registry failed" }, { status: 500 })
  }
}
