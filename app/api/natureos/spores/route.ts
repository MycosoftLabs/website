/**
 * NatureOS Spore Dispersal API
 *
 * Proxies to NatureOS FUNGA spore dispersal endpoint.
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

async function fetchSporeDispersal(
  latitude: number,
  longitude: number,
  startTime: string,
  endTime: string
) {
  if (!NATUREOS_URL) return null

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    startTime,
    endTime,
  })

  const res = await fetch(`${NATUREOS_URL}/api/Funga/spores/dispersal?${params.toString()}`, {
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) return null
  return res.json()
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const latitude = parseNumber(searchParams.get("latitude") || undefined)
  const longitude = parseNumber(searchParams.get("longitude") || undefined)
  const startTime = searchParams.get("startTime") || ""
  const endTime = searchParams.get("endTime") || ""

  if (latitude === null || longitude === null || !startTime || !endTime) {
    return NextResponse.json(
      { error: "latitude, longitude, startTime, and endTime are required" },
      { status: 400 }
    )
  }

  try {
    const data = await fetchSporeDispersal(latitude, longitude, startTime, endTime)
    if (!data) {
      return NextResponse.json(
        { error: "NatureOS spore dispersal unavailable" },
        { status: 503 }
      )
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error("NatureOS spore dispersal error:", error)
    return NextResponse.json(
      { error: "NatureOS spore dispersal unavailable" },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  const startTime = body.startTime ?? ""
  const endTime = body.endTime ?? ""

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !startTime || !endTime) {
    return NextResponse.json(
      { error: "latitude, longitude, startTime, and endTime are required" },
      { status: 400 }
    )
  }

  try {
    const data = await fetchSporeDispersal(latitude, longitude, startTime, endTime)
    if (!data) {
      return NextResponse.json(
        { error: "NatureOS spore dispersal unavailable" },
        { status: 503 }
      )
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error("NatureOS spore dispersal error:", error)
    return NextResponse.json(
      { error: "NatureOS spore dispersal unavailable" },
      { status: 503 }
    )
  }
}
