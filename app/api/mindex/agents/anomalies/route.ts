import { NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

/**
 * Agent contract: fetch detected anomalies.
 *
 * This endpoint is a contract surface; the authoritative anomaly detection
 * should be implemented by MINDEX/Supabase telemetry processing and then exposed here.
 */
export async function GET() {
  if (!env.integrationsEnabled) {
    return NextResponse.json(
      { error: "Integrations disabled", code: "INTEGRATIONS_DISABLED", requiredEnv: ["INTEGRATIONS_ENABLED=true"] },
      { status: 503 },
    )
  }

  return NextResponse.json(
    {
      error: "Anomalies feed not implemented yet. Wire Supabase telemetry processing or MINDEX anomaly endpoints.",
      code: "NOT_IMPLEMENTED",
    },
    { status: 501 },
  )
}

