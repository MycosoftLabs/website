import { NextRequest } from "next/server"

export const runtime = "nodejs"

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function readMapboxToken() {
  return (
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    ""
  ).replace(/\s+/g, "")
}

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams
  const lat = Number(search.get("lat"))
  const lng = Number(search.get("lng"))
  const mag = Number(search.get("mag") ?? "0")
  const zoom = clamp(Number(search.get("zoom") ?? "6"), 3, 12)
  const safeLat = Number.isFinite(lat) ? clamp(lat, -85.05112878, 85.05112878) : 0
  const safeLng = Number.isFinite(lng) ? clamp(lng, -180, 180) : 0
  const safeMag = Number.isFinite(mag) ? clamp(mag, 0, 10) : 0
  const token = readMapboxToken()

  if (!token) {
    return Response.json({ error: "Map token unavailable" }, { status: 503 })
  }

  const markerSize = safeMag >= 5 ? "l" : safeMag >= 3 ? "m" : "s"
  const marker = `pin-${markerSize}+ef4444(${safeLng.toFixed(6)},${safeLat.toFixed(6)})`
  const mapUrl = new URL(
    `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${marker}/${safeLng.toFixed(6)},${safeLat.toFixed(6)},${zoom.toFixed(2)},0/420x180@2x`,
  )
  mapUrl.searchParams.set("access_token", token)
  mapUrl.searchParams.set("attribution", "false")
  mapUrl.searchParams.set("logo", "false")

  const response = await fetch(mapUrl, {
    headers: { Accept: "image/jpeg,image/png,image/*" },
    next: { revalidate: 900 },
  })
  if (!response.ok) {
    return Response.json({ error: `Mapbox static map failed (${response.status})` }, { status: 502 })
  }

  const bytes = await response.arrayBuffer()
  return new Response(bytes, {
    headers: {
      "Content-Type": response.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=86400",
    },
  })
}
