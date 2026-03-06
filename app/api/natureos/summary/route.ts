/**
 * NatureOS Summary API — March 7, 2026
 *
 * High-level NatureOS state summary for MYCA context injection.
 * Proxies to NatureOS backend health; returns digest for MYCA.
 * NO MOCK DATA — uses real NatureOS API or MAS device registry.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const NATUREOS_URL =
  process.env.NATUREOS_API_BASE_URL || env.natureosApiBaseUrl
const MAS_API_URL = process.env.MAS_API_URL

export async function GET(_request: NextRequest) {
  const summary: {
    available: boolean
    source: string
    message?: string
    natureos_health?: Record<string, unknown>
    devices_count?: number
  } = {
    available: false,
    source: "unavailable",
  }

  if (NATUREOS_URL) {
    try {
      const res = await fetch(`${NATUREOS_URL}/api/health`, {
        signal: AbortSignal.timeout(5000),
      })
      const data = await res.json().catch(() => ({}))
      summary.available = res.ok
      summary.source = "natureos"
      summary.natureos_health = data
    } catch {
      summary.message = "NatureOS backend unreachable"
    }
  }

  if (!summary.available && MAS_API_URL) {
    try {
      const res = await fetch(`${MAS_API_URL}/api/devices`, {
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        const devices = Array.isArray(data) ? data : data?.devices ?? []
        summary.available = true
        summary.source = "mas"
        summary.devices_count = devices.length
      }
    } catch {
      if (!summary.message) summary.message = "MAS device registry unreachable"
    }
  }

  return NextResponse.json(summary)
}
