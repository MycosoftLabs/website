/**
 * CREP Health API – Feb 11, 2026
 *
 * Health check for CREP dashboard dependencies:
 * - MINDEX (fungal observations, primary data)
 * - MAS (entity stream WebSocket, global events)
 *
 * Used by Fungi Compute control panel and CREP status widgets.
 * NO MOCK DATA – returns real connectivity status.
 */

import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"
const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"

export async function GET() {
  const services: {
    name: string
    status: "online" | "offline" | "degraded"
    latency_ms?: number
    details?: string
  }[] = []

  let status: "healthy" | "degraded" | "unhealthy" = "unhealthy"

  try {
    // 1. MAS health (entity stream, global events)
    const masStart = Date.now()
    try {
      const masRes = await fetch(`${MAS_API_URL}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })
      const masLatency = Date.now() - masStart
      services.push({
        name: "MAS",
        status: masRes.ok ? "online" : "degraded",
        latency_ms: masLatency,
        details: masRes.ok ? "Orchestrator reachable" : `HTTP ${masRes.status}`,
      })
    } catch (e) {
      services.push({
        name: "MAS",
        status: "offline",
        latency_ms: Date.now() - masStart,
        details: e instanceof Error ? e.message : "Connection failed",
      })
    }

    // 2. MINDEX health (fungal observations)
    const mindexStart = Date.now()
    try {
      const mindexRes = await fetch(`${MINDEX_API_URL}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })
      const mindexLatency = Date.now() - mindexStart
      services.push({
        name: "MINDEX",
        status: mindexRes.ok ? "online" : "degraded",
        latency_ms: mindexLatency,
        details: mindexRes.ok ? "API reachable" : `HTTP ${mindexRes.status}`,
      })
    } catch (e) {
      services.push({
        name: "MINDEX",
        status: "offline",
        latency_ms: Date.now() - mindexStart,
        details: e instanceof Error ? e.message : "Connection failed",
      })
    }

    const onlineCount = services.filter((s) => s.status === "online").length
    if (onlineCount === 2) status = "healthy"
    else if (onlineCount === 1) status = "degraded"

    return NextResponse.json({
      status,
      services,
      timestamp: new Date().toISOString(),
      crep_version: "2.0",
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
