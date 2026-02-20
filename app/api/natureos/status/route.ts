/**
 * NatureOS Status API
 *
 * Returns ecosystem health for MAS NatureOSSensor integration.
 * Fetches real data from MINDEX and system metrics.
 */

import { NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

async function fetchStatus() {
  const mindexUrl = env.mindexApiBaseUrl
  const masUrl = process.env.MAS_API_URL || "http://192.168.0.188:8001"
  const apiKey = env.mindexApiKey || "local-dev-key"

  const status: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    ecosystem: {
      speciesCount: 0,
      observationCount: 0,
      dataSource: "unavailable",
    },
    mas: { connected: false },
  }

  try {
    const [mindexRes, masRes] = await Promise.allSettled([
      fetch(`${mindexUrl}/api/mindex/stats`, {
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
      }),
      fetch(`${masUrl}/health`, { signal: AbortSignal.timeout(3000) }),
    ])

    if (mindexRes.status === "fulfilled" && mindexRes.value.ok) {
      const stats = await mindexRes.value.json()
      ;(status.ecosystem as Record<string, unknown>).speciesCount =
        stats.total_taxa ?? stats.taxa_with_observations ?? 0
      ;(status.ecosystem as Record<string, unknown>).observationCount =
        stats.total_observations ?? 0
      ;(status.ecosystem as Record<string, unknown>).dataSource = "live"
    }

    if (masRes.status === "fulfilled" && masRes.value.ok) {
      ;(status.mas as Record<string, unknown>).connected = true
    }
  } catch (error) {
    console.error("NatureOS status fetch error:", error)
  }

  return status
}

export async function GET() {
  const status = await fetchStatus()
  return NextResponse.json(status)
}
