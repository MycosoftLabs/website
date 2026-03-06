/**
 * NatureOS Summary API — March 7, 2026
 *
 * MYCA-friendly machine-readable summary: device count, workflow status,
 * last telemetry. For MYCA context injection.
 */

import { NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

export async function GET() {
  const masUrl = process.env.MAS_API_URL || "http://192.168.0.188:8001"

  const summary: {
    device_count: number
    workflow_status: string
    last_telemetry_at: string | null
    ecosystem_species: number
    mas_connected: boolean
    timestamp: string
  } = {
    device_count: 0,
    workflow_status: "unknown",
    last_telemetry_at: null,
    ecosystem_species: 0,
    mas_connected: false,
    timestamp: new Date().toISOString(),
  }

  const mindexUrl = env.mindexApiBaseUrl
  const apiKey = env.mindexApiKey || "local-dev-key"

  try {
    const [devicesRes, masRes, mindexRes] = await Promise.allSettled([
      fetch(`${masUrl}/api/devices/network`, {
        signal: AbortSignal.timeout(5000),
      }),
      fetch(`${masUrl}/health`, { signal: AbortSignal.timeout(3000) }),
      fetch(`${mindexUrl}/api/mindex/stats`, {
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
      }),
    ])

    if (devicesRes.status === "fulfilled" && devicesRes.value.ok) {
      const data = await devicesRes.value.json()
      const devices = Array.isArray(data) ? data : data?.devices ?? data?.items ?? []
      summary.device_count = devices.length
    }

    if (masRes.status === "fulfilled" && masRes.value.ok) {
      summary.mas_connected = true
    }

    if (mindexRes.status === "fulfilled" && mindexRes.value.ok) {
      const stats = await mindexRes.value.json()
      summary.ecosystem_species = stats?.total_taxa ?? stats?.taxa_with_observations ?? 0
    }

    summary.workflow_status = summary.mas_connected ? "available" : "unreachable"
  } catch (error) {
    console.error("NatureOS summary fetch error:", error)
  }

  return NextResponse.json(summary)
}
