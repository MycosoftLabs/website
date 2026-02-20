/**
 * Time-Series Analytics API
 *
 * Returns aggregated event counts over time from MINDEX observations.
 * NO MOCK DATA - all data from real MINDEX backend.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

interface TimeSeriesPoint {
  timestamp: string
  value: number
}

interface TimeSeriesResult {
  metric: string
  dataPoints: TimeSeriesPoint[]
  start: string
  end: string
}

async function fetchTimeSeries(
  metric: string,
  start?: string,
  end?: string
): Promise<TimeSeriesResult> {
  const mindexUrl = env.mindexApiBaseUrl
  const apiKey = env.mindexApiKey || "local-dev-key"

  const endDate = end ? new Date(end) : new Date()
  const startDate = start
    ? new Date(start)
    : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)

  const dataPoints: TimeSeriesPoint[] = []

  try {
    if (metric === "event_count" || metric === "observation_count") {
      const res = await fetch(
        `${mindexUrl}/api/mindex/observations?limit=1000`,
        {
          headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000),
        }
      )
      if (res.ok) {
        const data = await res.json()
        const observations =
          data.observations ?? data.data ?? data.results ?? []
        const hourly: Record<string, number> = {}
        for (const obs of observations) {
          const ts = obs.observed_at ?? obs.created_at ?? obs.timestamp
          if (!ts) continue
          const d = new Date(ts)
          if (d >= startDate && d <= endDate) {
            const key = d.toISOString().slice(0, 13) + ":00:00.000Z"
            hourly[key] = (hourly[key] ?? 0) + 1
          }
        }
        dataPoints.push(
          ...Object.entries(hourly)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([timestamp, value]) => ({ timestamp, value }))
        )
      }
    }
  } catch (error) {
    console.error("Time-series fetch error:", error)
  }

  return {
    metric,
    dataPoints,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const metric = searchParams.get("metric") || "event_count"
  const start = searchParams.get("start") || undefined
  const end = searchParams.get("end") || undefined

  const result = await fetchTimeSeries(metric, start, end)
  return NextResponse.json(result)
}
