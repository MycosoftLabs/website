/**
 * OEI Debris — catalogued tracked debris + statistical 1.2M sub-catalog.
 *
 * Query params:
 *   mode=catalogued      (default) — returns real CelesTrak-tracked debris
 *   mode=statistical     — returns Monte-Carlo synthesized 1–10 cm sub-catalog
 *   samplesPerBand       (statistical) default 20k
 *   totalBudget          (statistical) default 120k
 *   randomSeed           (statistical) for stable visualisation
 *   band                 filter by altitude band (200-400, 400-700, etc.)
 *
 * Statistical output: clearly labelled {isStatistical: true, bandCounts, note}
 * so downstream consumers NEVER mistake it for tracked positions.
 */

import { NextRequest, NextResponse } from "next/server"
import { getCataloguedDebris, generateStatisticalDebris, DEBRIS_STAT_DISTRIBUTION } from "@/lib/crep/registries/debris-registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const mode = url.searchParams.get("mode") || "catalogued"
  const band = url.searchParams.get("band")

  try {
    if (mode === "catalogued") {
      const baseUrl = `${url.protocol}//${url.host}`
      const r = await getCataloguedDebris({ baseUrl })
      return NextResponse.json({
        mode: "catalogued",
        source: "CelesTrak + SatCat + analyst",
        total: r.total,
        byBand: r.byBand,
        sources: r.sources,
        objects: r.objects,
        generatedAt: r.generatedAt,
        note: "Real tracked debris with TLEs from USSPACECOM 18th SDS via CelesTrak.",
      }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } })
    }

    if (mode === "statistical") {
      const samplesPerBand = Number(url.searchParams.get("samplesPerBand") || 20_000)
      const totalBudget = Number(url.searchParams.get("totalBudget") || 120_000)
      const randomSeed = Number(url.searchParams.get("randomSeed") || 0) || undefined
      let points = generateStatisticalDebris({ samplesPerBand, totalBudget, randomSeed })
      if (band) points = points.filter((p) => p.band === band)

      return NextResponse.json({
        mode: "statistical",
        source: "NASA ODPO ORDEM 3.2 / MASTER-8 distribution (Monte-Carlo sample)",
        isStatistical: true,
        realPopulationEstimate: Object.values(DEBRIS_STAT_DISTRIBUTION).reduce((s, b) => s + b.count, 0),
        bandCounts: Object.fromEntries(Object.entries(DEBRIS_STAT_DISTRIBUTION).map(([k, v]) => [k, v.count])),
        sampleCount: points.length,
        samples: points,
        note: "These are SYNTHETIC positions matching the ODPO altitude-band statistical distribution. They represent the ~1.2 M sub-catalog debris population (1–10 cm) that is not individually tracked. Do not treat as real per-object positions.",
        generatedAt: new Date().toISOString(),
      }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } })
    }

    return NextResponse.json({ error: `unknown mode: ${mode}` }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "debris registry failed" }, { status: 500 })
  }
}
