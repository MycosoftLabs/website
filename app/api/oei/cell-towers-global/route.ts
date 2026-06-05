/**
 * OEI Global Cell Towers — 10M+ catalog via multi-source registry.
 *
 * Fuses OpenCelliD (47M) + FCC ASR (US, 300k) + OSM (global) + MINDEX.
 *
 * bbox is REQUIRED — we never serve the full catalog in one request.
 * For bulk export use /api/mindex/export/cell-towers which streams from
 * the MINDEX PostGIS table.
 *
 * Query params:
 *   bbox=w,s,e,n     — required
 *   radio=LTE|UMTS|GSM|NR   — filter by radio access technology
 *   mcc=310          — filter by Mobile Country Code
 *   limit=5000       — max rows (default 5000, hard cap 20000)
 */

import { NextRequest, NextResponse } from "next/server"
import { getCellTowers } from "@/lib/crep/registries/cell-tower-registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CELL_TOWER_CACHE_TTL_MS = 10 * 60 * 1000
const CELL_TOWER_CACHE_MAX = 80
const cellTowerBboxCache = new Map<string, { expiresAt: number; body: any }>()

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bboxStr = url.searchParams.get("bbox")
  if (!bboxStr) {
    return NextResponse.json({
      error: "bbox=w,s,e,n required — cell tower catalog is 47M+, cannot serve all",
      hint: "Provide a bbox or use /api/mindex/export/cell-towers for bulk",
    }, { status: 400 })
  }
  const bbox = bboxStr.split(",").map(Number) as [number, number, number, number]
  if (bbox.length !== 4 || bbox.some((v) => !Number.isFinite(v))) {
    return NextResponse.json({ error: "bbox malformed" }, { status: 400 })
  }
  // Apr 19, 2026 (Morgan: "need more am fm cell tower data alot missing").
  // Default bumped 5k → 15k per bbox + hard cap lifted 20k → 50k. Cell towers
  // are dense in urban areas, so without this the initial viewport was
  // missing a huge chunk.
  const limit = Math.min(Number(url.searchParams.get("limit") || 15000), 50000)
  const radio = url.searchParams.get("radio")
  const mcc = Number(url.searchParams.get("mcc"))
  const liveFallback = url.searchParams.get("liveFallback") === "true"
  const cacheKey = [
    bbox.map((value) => value.toFixed(3)).join(","),
    limit,
    radio || "",
    Number.isFinite(mcc) ? mcc : "",
  ].join("|")
  const cached = cellTowerBboxCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      ...cached.body,
      cache: "memory",
    }, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } })
  }

  try {
    const baseUrl = `${url.protocol}//${url.host}`
    const r = await getCellTowers({
      baseUrl,
      bbox,
      maxPerSource: Math.floor(limit / 4),
      mindexFirst: true,
      liveFallback,
    })
    let towers = r.towers
    if (radio) towers = towers.filter((t) => t.radio === radio)
    if (mcc) towers = towers.filter((t) => t.mcc === mcc)
    towers = towers.slice(0, limit)

    const body = {
      source: "cell-towers-multi",
      total: r.total,
      returned: towers.length,
      sources: r.sources,
      byRadio: r.byRadio,
      byCountry: r.byCountry,
      towers,
      generatedAt: r.generatedAt,
      note: r.note,
    }
    cellTowerBboxCache.set(cacheKey, { expiresAt: Date.now() + CELL_TOWER_CACHE_TTL_MS, body })
    if (cellTowerBboxCache.size > CELL_TOWER_CACHE_MAX) {
      const firstKey = cellTowerBboxCache.keys().next().value
      if (firstKey) cellTowerBboxCache.delete(firstKey)
    }

    return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "cell tower registry failed" }, { status: 500 })
  }
}
