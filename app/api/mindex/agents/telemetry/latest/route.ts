import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { getLatestTelemetry, getLatestTelemetryByDevice } from "@/lib/integrations/mindex"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (!env.integrationsEnabled) {
    return NextResponse.json(
      { error: "Integrations disabled", code: "INTEGRATIONS_DISABLED", requiredEnv: ["INTEGRATIONS_ENABLED=true"] },
      { status: 503 },
    )
  }

  const deviceId = request.nextUrl.searchParams.get("device_id") || undefined

  try {
    if (deviceId) {
      const sample = await getLatestTelemetryByDevice(deviceId)
      return NextResponse.json({ data: [sample], meta: { total: 1 } })
    }

    const result = await getLatestTelemetry()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch latest telemetry", code: "MINDEX_ERROR", details: String(error) },
      { status: 500 },
    )
  }
}

