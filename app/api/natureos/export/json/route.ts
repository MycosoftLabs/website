/**
 * Data Export API (JSON)
 *
 * Exports event/observation data as JSON.
 * Proxies to NatureOS backend when available, otherwise fetches from MINDEX.
 * NO MOCK DATA - all data from real backends.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const NATUREOS_URL =
  process.env.NATUREOS_API_BASE_URL || env.natureosApiBaseUrl

async function fetchExportData() {
  if (NATUREOS_URL) {
    try {
      const res = await fetch(
        `${NATUREOS_URL}/api/Export/json?limit=1000`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (res.ok) return await res.json()
    } catch {
      // Fall through to MINDEX
    }
  }

  const mindexUrl = env.mindexApiBaseUrl
  const apiKey = env.mindexApiKey || "local-dev-key"

  try {
    const res = await fetch(
      `${mindexUrl}/api/mindex/observations?limit=500`,
      {
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return { events: [], observations: [], total: 0 }
    const data = await res.json()
    const observations = data.observations ?? data.data ?? data.results ?? []
    return {
      events: [],
      observations,
      total: observations.length,
      exportedAt: new Date().toISOString(),
    }
  } catch {
    return { events: [], observations: [], total: 0 }
  }
}

export async function GET(_request: NextRequest) {
  const data = await fetchExportData()
  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": `attachment; filename="natureos-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
