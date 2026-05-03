import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MAS_API_URL =
  process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || "http://localhost:8001"

/** Proxies MAS Safecast-backed probe — 503 with structured body when upstream unavailable (no fake µSv/h). */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const lat = url.searchParams.get("lat") ?? "37.7749"
  const lon = url.searchParams.get("lon") ?? "-122.4194"
  const distance = url.searchParams.get("distance") ?? "25000"
  const qs = new URLSearchParams({ lat, lon, distance }).toString()
  try {
    const res = await fetch(`${MAS_API_URL}/api/natureos/feeds/radiation/status?${qs}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    })
    const body = await res.json().catch(() => ({}))
    return NextResponse.json({ layer: "radiation", upstream: body }, { status: res.status })
  } catch (e) {
    const message = e instanceof Error ? e.message : "mas_unreachable"
    return NextResponse.json(
      {
        layer: "radiation",
        upstream: {
          available: false,
          message: "Could not reach MAS radiation feed proxy.",
          detail: message,
        },
      },
      { status: 502 },
    )
  }
}
