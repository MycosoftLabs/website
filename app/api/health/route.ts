/**
 * Health Check API Route
 *
 * Returns combined health status of all backend services
 */

import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { getMindexHealth } from "@/lib/integrations/mindex"
import { getMasHealth } from "@/lib/integrations/myca-mas"
import type { SystemHealth } from "@/lib/integrations/types"

export async function GET() {
  // If integrations are disabled, return mock healthy status
  if (!env.integrationsEnabled) {
    const mockHealth: SystemHealth = {
      ok: true,
      timestamp: new Date().toISOString(),
      services: {
        mindex: {
          service: "mindex",
          status: "unknown",
          message: "Integrations disabled - using mock data",
          lastChecked: new Date().toISOString(),
        },
        mycaMas: {
          service: "myca-mas",
          status: "unknown",
          message: "Integrations disabled - using mock data",
          lastChecked: new Date().toISOString(),
        },
      },
    }
    return NextResponse.json(mockHealth)
  }

  // Check all services in parallel
  const [mindexHealth, masHealth] = await Promise.all([getMindexHealth(), getMasHealth()])

  const systemHealth: SystemHealth = {
    ok: mindexHealth.status === "healthy" && masHealth.status === "healthy",
    timestamp: new Date().toISOString(),
    services: {
      mindex: mindexHealth,
      mycaMas: masHealth,
    },
  }

  // Return appropriate status code based on health
  const status = systemHealth.ok ? 200 : 503
  return NextResponse.json(systemHealth, { status })
}
