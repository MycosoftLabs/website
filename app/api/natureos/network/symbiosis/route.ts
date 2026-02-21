/**
 * NatureOS Symbiosis Network API
 *
 * Proxies to NatureOS FUNGA network analysis.
 * NO MOCK DATA - requires NatureOS backend.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const NATUREOS_URL =
  process.env.NATUREOS_API_BASE_URL || env.natureosApiBaseUrl

function parseNumber(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function fetchNetworkAnalysis(latitude: number, longitude: number, radiusMeters: number) {
  if (!NATUREOS_URL) return null

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radiusMeters: String(radiusMeters),
  })

  const res = await fetch(`${NATUREOS_URL}/api/Funga/network/analyze?${params.toString()}`, {
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) return null
  return res.json()
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const latitude = parseNumber(searchParams.get("latitude") || undefined)
  const longitude = parseNumber(searchParams.get("longitude") || undefined)
  const radiusMeters = parseNumber(searchParams.get("radiusMeters") || undefined) ?? 1000

  if (latitude === null || longitude === null) {
    return NextResponse.json(
      { error: "latitude and longitude are required" },
      { status: 400 }
    )
  }

  try {
    const data = await fetchNetworkAnalysis(latitude, longitude, radiusMeters)
    if (!data) {
      return NextResponse.json(
        { error: "NatureOS network analysis unavailable" },
        { status: 503 }
      )
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error("NatureOS symbiosis error:", error)
    return NextResponse.json(
      { error: "NatureOS network analysis unavailable" },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  const radiusMeters = Number(body.radiusMeters ?? 1000)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json(
      { error: "latitude and longitude are required" },
      { status: 400 }
    )
  }

  try {
    const data = await fetchNetworkAnalysis(latitude, longitude, radiusMeters)
    if (!data) {
      return NextResponse.json(
        { error: "NatureOS network analysis unavailable" },
        { status: 503 }
      )
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error("NatureOS symbiosis error:", error)
    return NextResponse.json(
      { error: "NatureOS network analysis unavailable" },
      { status: 503 }
    )
  }
}
