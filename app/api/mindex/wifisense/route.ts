import { NextResponse } from "next/server"
import { env } from "@/lib/env"

/**
 * WiFiSense API - presence sensing (real backend required)
 *
 * This endpoint is a placeholder contract. Mock/demo responses are not allowed.
 * Wire this to a real WiFiSense service or MINDEX telemetry pipeline.
 */

export const dynamic = "force-dynamic"

export async function GET() {
  if (!env.integrationsEnabled) {
    return NextResponse.json(
      { error: "Integrations disabled", code: "INTEGRATIONS_DISABLED", requiredEnv: ["INTEGRATIONS_ENABLED=true"] },
      { status: 503 },
    )
  }

  return NextResponse.json(
    { error: "WiFiSense backend not implemented", code: "NOT_IMPLEMENTED" },
    { status: 501 },
  )
}

export async function POST() {
  if (!env.integrationsEnabled) {
    return NextResponse.json(
      { error: "Integrations disabled", code: "INTEGRATIONS_DISABLED", requiredEnv: ["INTEGRATIONS_ENABLED=true"] },
      { status: 503 },
    )
  }

  return NextResponse.json(
    { error: "WiFiSense backend not implemented", code: "NOT_IMPLEMENTED" },
    { status: 501 },
  )
}
