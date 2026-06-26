/**
 * GET /api/psathyrella/telemetry — proxy to MAS fused BuoyTelemetry envelope.
 */

import { NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const res = await fetch(`${MAS_API_URL}/api/psathyrella/telemetry`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    })
    const body = await res.json()
    return NextResponse.json(body, { status: res.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message, status: "unavailable" }, { status: 502 })
  }
}
