import { NextResponse } from "next/server"
import { env } from "@/lib/env"

/**
 * WiFiSense API - presence sensing
 *
 * This endpoint proxies to the WiFiSense backend or MINDEX telemetry pipeline.
 * Currently in development - returns Coming Soon status.
 */

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || env.mindexApiBaseUrl.replace(/\/api\/v1$/, "")

export async function GET() {
  // Try to fetch from MINDEX WiFiSense endpoint
  try {
    const res = await fetch(`${MINDEX_API_URL}/api/wifisense`, {
      headers: {
        "X-API-Key": env.mindexApiKey || "",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }
  } catch {
    // MINDEX endpoint not available, fall through to coming soon
  }

  // Return Coming Soon response
  return NextResponse.json(
    { 
      status: "coming_soon",
      message: "WiFiSense presence detection is under development",
      code: "FEATURE_COMING_SOON",
      expectedRelease: "Q2 2026",
      documentation: "https://docs.mycosoft.com/wifisense",
    },
    { status: 503 },
  )
}

export async function POST() {
  // Try to proxy to MINDEX WiFiSense endpoint
  try {
    const res = await fetch(`${MINDEX_API_URL}/api/wifisense`, {
      method: "POST",
      headers: {
        "X-API-Key": env.mindexApiKey || "",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }
  } catch {
    // MINDEX endpoint not available, fall through to coming soon
  }

  // Return Coming Soon response
  return NextResponse.json(
    { 
      status: "coming_soon",
      message: "WiFiSense presence detection is under development",
      code: "FEATURE_COMING_SOON",
      expectedRelease: "Q2 2026",
    },
    { status: 503 },
  )
}
