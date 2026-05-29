import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("device_id")
  const qs = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ""
  try {
    const res = await fetch(`${MAS_API_URL}/api/devices/firmware-audit${qs}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    })
    const text = await res.text()
    let body: unknown = text
    try {
      body = text ? JSON.parse(text) : {}
    } catch {
      body = { raw: text }
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: "Firmware audit failed", mas_status: res.status, detail: body },
        { status: res.status }
      )
    }
    return NextResponse.json(body)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Firmware audit unreachable",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    )
  }
}
