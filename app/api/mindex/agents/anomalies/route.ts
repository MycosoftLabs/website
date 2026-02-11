import { NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

/**
 * Agent Anomalies API - Fetch detected anomalies from MAS or MINDEX
 *
 * Proxies to MAS agents API for anomaly detection results,
 * or MINDEX telemetry processing pipeline.
 */

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"
const MINDEX_API_URL = process.env.MINDEX_API_URL || env.mindexApiBaseUrl.replace(/\/api\/v1$/, "")

export async function GET() {
  // Try MAS API first for agent-detected anomalies
  try {
    const masRes = await fetch(`${MAS_API_URL}/api/agents/anomalies`, {
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    })

    if (masRes.ok) {
      const data = await masRes.json()
      return NextResponse.json({
        source: "mas",
        anomalies: Array.isArray(data) ? data : data.anomalies ?? [],
        timestamp: new Date().toISOString(),
      })
    }
  } catch {
    // MAS not available, try MINDEX
  }

  // Try MINDEX telemetry anomalies
  try {
    const mindexRes = await fetch(`${MINDEX_API_URL}/api/telemetry/anomalies`, {
      headers: {
        "X-API-Key": env.mindexApiKey || "",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    })

    if (mindexRes.ok) {
      const data = await mindexRes.json()
      return NextResponse.json({
        source: "mindex",
        anomalies: Array.isArray(data) ? data : data.anomalies ?? [],
        timestamp: new Date().toISOString(),
      })
    }
  } catch {
    // MINDEX not available either
  }

  // Return empty anomalies with info when backends unavailable
  return NextResponse.json({
    source: "none",
    anomalies: [],
    timestamp: new Date().toISOString(),
    status: "coming_soon",
    message: "Anomaly detection feed is being configured. Connect MAS (192.168.0.188:8001) or MINDEX (192.168.0.189:8000) for real data.",
    code: "FEATURE_COMING_SOON",
  })
}

