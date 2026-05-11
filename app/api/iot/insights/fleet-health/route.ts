import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MAS_API_URL = process.env.MAS_API_URL

function unavailableFleetHealth(message: string) {
  return NextResponse.json(
    {
      total_devices: 0,
      online_devices: 0,
      stale_devices: 0,
      offline_devices: 0,
      uptime_pct: 0,
      by_role: {},
      timestamp: new Date().toISOString(),
      available: false,
      message,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-IoT-Insights-Source": "unavailable",
      },
    }
  )
}

function buildMasUrl(path: string, request?: NextRequest) {
  if (!MAS_API_URL) return null
  const url = new URL(path, MAS_API_URL)
  if (request?.nextUrl?.search) url.search = request.nextUrl.search
  return url.toString()
}

export async function GET(request: NextRequest) {
  const target = buildMasUrl("/api/iot/analytics/fleet-health", request)
  if (!target) {
    return unavailableFleetHealth("MAS_API_URL is not configured")
  }

  try {
    const response = await fetch(target, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      return unavailableFleetHealth(`MAS returned ${response.status}`)
    }
    const text = await response.text()
    const contentType = response.headers.get("content-type") || "application/json"
    return new NextResponse(text, { status: response.status, headers: { "content-type": contentType } })
  } catch (error) {
    return unavailableFleetHealth(error instanceof Error ? error.message : "MAS is unreachable")
  }
}
