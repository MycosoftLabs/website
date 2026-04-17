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

interface TxLine {
  id: string
  source: string
  voltage_kv?: number
  operator?: string
  status?: "operating" | "construction" | "retired"
  country?: string
  coordinates: [number, number][]     // LineString
}

async function fromStaticUS(baseUrl: string): Promise<TxLine[]> {
  try {
    const res = await fetch(`${baseUrl}/data/crep/transmission-lines-us-major.geojson`, { cache: "force-cache" })
    if (!res.ok) return []
    const fc = await res.json()
    return (fc?.features || []).map((f: any, i: number) => ({
      id: `hifld-${i}`, source: "HIFLD",
      voltage_kv: parseFloat(f.properties?.VOLTAGE) || parseFloat(f.properties?.voltage_kv),
      operator: f.properties?.OWNER || f.properties?.operator,
      status: f.properties?.STATUS === "IN SERVICE" ? "operating" as const : undefined,
      country: "US", coordinates: f.geometry?.coordinates || [],
    }))
  } catch { return [] }
}

async function fromOSMBBox(bbox: [number, number, number, number]): Promise<TxLine[]> {
  try {
    const [w, s, e, n] = bbox
    const q = `[out:json][timeout:30];way["power"="line"]["voltage"](${s},${w},${n},${e});out geom 2000;`
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(35_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    return (j.elements || []).map((el: any) => ({
      id: `osm-way-${el.id}`, source: "OSM",
      voltage_kv: parseFloat(el.tags?.voltage) / 1000 || undefined,
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

  const time = async <T>(name: string, fn: () => Promise<T[]>): Promise<T[]> => {
    const t0 = Date.now(); const r = await fn()
    sources.push({ name, count: r.length, durationMs: Date.now() - t0 })
    return r
  }

  try {
    const tasks: Promise<TxLine[]>[] = [
      time("Static US (HIFLD)", () => fromStaticUS(baseUrl)),
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

    return NextResponse.json({
      source: "transmission-lines-multi",
      total: lines.length, sources, byCountry, lines,
      generatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "tx-lines registry failed" }, { status: 500 })
  }
}
