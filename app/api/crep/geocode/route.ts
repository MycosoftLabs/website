/**
 * CREP Geocode API Route - Mar 13, 2026
 *
 * Geocodes place names for CREP map navigation (fly to location).
 * Tries /api/search/location first (species/observations), then Nominatim for place names.
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface GeocodeResult {
  lat: number
  lng: number
  displayName?: string
  source: "nominatim" | "species"
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()
  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter 'q'" },
      { status: 400 }
    )
  }

  const baseUrl =
    request.nextUrl.origin ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3010"

  // 1. Try species/location search (returns iNaturalist observation locations)
  try {
    const locRes = await fetch(
      `${baseUrl}/api/search/location?q=${encodeURIComponent(query)}&limit=1`
    )
    if (locRes.ok) {
      const data = (await locRes.json()) as { results?: Array<{ lat: number; lng: number; placeName?: string }> }
      const first = data.results?.[0]
      if (first && typeof first.lat === "number" && typeof first.lng === "number") {
        return NextResponse.json({
          results: [
            {
              lat: first.lat,
              lng: first.lng,
              displayName: first.placeName ?? query,
              source: "species",
            } satisfies GeocodeResult,
          ],
        })
      }
    }
  } catch {
    /* fall through to Nominatim */
  }

  // 2. Nominatim for place names (OpenStreetMap)
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: { "User-Agent": "Mycosoft-CREP/1.0" },
        signal: AbortSignal.timeout(5000),
      }
    )
    if (!nomRes.ok) {
      return NextResponse.json(
        { error: "Geocoding service unavailable" },
        { status: 502 }
      )
    }
    const items = (await nomRes.json()) as Array<{ lat: string; lon: string; display_name?: string }>
    if (items?.[0]) {
      const lat = parseFloat(items[0].lat)
      const lng = parseFloat(items[0].lon)
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return NextResponse.json({
          results: [
            {
              lat,
              lng,
              displayName: items[0].display_name,
              source: "nominatim",
            } satisfies GeocodeResult,
          ],
        })
      }
    }
  } catch (err) {
    console.error("[CREP geocode] Nominatim error:", err)
    return NextResponse.json(
      { error: "Geocoding failed" },
      { status: 502 }
    )
  }

  return NextResponse.json({ results: [] })
}
