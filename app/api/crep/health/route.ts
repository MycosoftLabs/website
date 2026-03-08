/**
 * CREP Health API
 *
 * Health check for CREP dashboard dependencies:
 * - MAS (entity stream WebSocket, global events)
 * - MINDEX (fungal observations, primary data)
 *
 * Uses centralized API_URLS config — no hard-coded development IPs.
 */

import { NextResponse } from "next/server"
import { API_URLS } from "@/lib/config/api-urls"

export const dynamic = "force-dynamic"

interface ServiceHealth {
  name: string
  status: "online" | "offline" | "degraded"
  latency_ms?: number
  details?: string
  url?: string
}

export async function GET() {
  const services: ServiceHealth[] = []
  let status: "healthy" | "degraded" | "unhealthy" = "unhealthy"

  try {
    // 1. MAS health (entity stream, global events)
    const masStart = Date.now()
    try {
      const masRes = await fetch(`${API_URLS.MAS}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })
      const masLatency = Date.now() - masStart
      services.push({
        name: "MAS",
        status: masRes.ok ? "online" : "degraded",
        latency_ms: masLatency,
        details: masRes.ok ? "Orchestrator reachable" : `HTTP ${masRes.status}`,
        url: API_URLS.MAS,
      })
    } catch (e) {
      services.push({
        name: "MAS",
        status: "offline",
        latency_ms: Date.now() - masStart,
        details: e instanceof Error ? e.message : "Connection failed",
        url: API_URLS.MAS,
      })
    }

    // 2. MINDEX health (fungal observations)
    const mindexStart = Date.now()
    try {
      const mindexRes = await fetch(`${API_URLS.MINDEX}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })
      const mindexLatency = Date.now() - mindexStart
      services.push({
        name: "MINDEX",
        status: mindexRes.ok ? "online" : "degraded",
        latency_ms: mindexLatency,
        details: mindexRes.ok ? "API reachable" : `HTTP ${mindexRes.status}`,
        url: API_URLS.MINDEX,
      })
    } catch (e) {
      services.push({
        name: "MINDEX",
        status: "offline",
        latency_ms: Date.now() - mindexStart,
        details: e instanceof Error ? e.message : "Connection failed",
        url: API_URLS.MINDEX,
      })
    }

    const onlineCount = services.filter((s) => s.status === "online").length
    if (onlineCount === 2) status = "healthy"
    else if (onlineCount === 1) status = "degraded"

    return NextResponse.json({
      status,
      services,
      timestamp: new Date().toISOString(),
      crep_version: "3.0",
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        services,
        error: error instanceof Error ? error.message : "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
