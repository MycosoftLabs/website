import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { listActiveChannels } from "@/lib/mindex/streaming/sse-manager"

export const dynamic = "force-dynamic"

export async function GET() {
  if (!env.integrationsEnabled) {
    return NextResponse.json(
      {
        error: "Integrations disabled",
        code: "INTEGRATIONS_DISABLED",
        requiredEnv: ["INTEGRATIONS_ENABLED=true"],
      },
      { status: 503 },
    )
  }

  return NextResponse.json({
    channel_types: ["device", "aggregate", "computed", "alert"],
    active: listActiveChannels(),
  })
}

