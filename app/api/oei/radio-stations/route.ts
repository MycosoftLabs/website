/**
 * OEI Radio Stations — Global AM/FM/TV/SDR multi-source registry.
 *
 * Fuses Radio-Browser (35k internet streams with geo) + KiwiSDR (600 public SDR nodes)
 * + FCC LMS (US AM/FM/TV) + MINDEX.
 *
 * Returns stations with `streamUrl` or `sdrUrl` where available so the
 * SDR/radio widget can tune live audio.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAllRadioStations } from "@/lib/crep/registries/radio-station-registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox")?.split(",").map(Number) as [number, number, number, number] | undefined
  const band = url.searchParams.get("band")   // AM|FM|TV|PUBLIC_SDR|SW|CB
  const country = url.searchParams.get("country")
  const streamable = url.searchParams.get("streamable") === "true"
  // Apr 19, 2026 (Morgan: "need more am fm cell tower data alot missing").
  // Raised hard cap from 20k → 60k to cover the global registry in one call
  // (Radio-Browser 35k + KiwiSDR 600 + FCC LMS US AM/FM/TV ~15k).
  const limit = Math.min(Number(url.searchParams.get("limit") || 20000), 60000)

  try {
    const baseUrl = `${url.protocol}//${url.host}`
    const r = await getAllRadioStations({
      baseUrl,
      bbox: bbox && bbox.length === 4 ? bbox : undefined,
    })

    let stations = r.stations
    if (band) stations = stations.filter((s) => s.band === band)
    if (country) stations = stations.filter((s) => s.country === country.toUpperCase())
    if (streamable) stations = stations.filter((s) => !!s.streamUrl || !!s.sdrUrl)
    stations = stations.slice(0, limit)

    return NextResponse.json({
      source: "radio-stations-multi",
      total: r.total,
      returned: stations.length,
      sources: r.sources,
      byBand: r.byBand,
      byCountry: r.byCountry,
      stations,
      generatedAt: r.generatedAt,
    }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "radio station registry failed" }, { status: 500 })
  }
}
