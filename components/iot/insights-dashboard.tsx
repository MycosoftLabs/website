"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TelemetryChart } from "@/components/iot/telemetry-chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FleetHealthResponse {
  total_devices: number
  online_devices: number
  stale_devices: number
  offline_devices: number
  uptime_pct: number
  by_role: Record<string, number>
  timestamp: string
}

interface TrendPoint {
  timestamp: string
  metrics: Record<string, any>
}

interface TrendSeries {
  points: TrendPoint[]
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Failed to load insights")
  return response.json()
}

const METRIC_KEYS = ["temperature", "humidity", "pressure", "iaq"]

function formatTimestamp(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function InsightsDashboard() {
  const { data: fleetHealth, error: healthError, isLoading: healthLoading } =
    useSWR<FleetHealthResponse>("/api/iot/insights/fleet-health", fetcher, {
      refreshInterval: 30000,
    })

  const [metric, setMetric] = useState(METRIC_KEYS[0])
  const { data: trendsData } = useSWR<TrendSeries>(
    `/api/iot/insights/trends?metric=${metric}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const trendSeries = useMemo(() => {
    if (!trendsData?.points?.length) return []
    return trendsData.points.map((point) => ({
      timestamp: formatTimestamp(point.timestamp),
      ...point.metrics,
    }))
  }, [trendsData])

  if (healthLoading) {
    return <div className="rounded-lg border p-6">Loading insights...</div>
  }

  if (healthError || !fleetHealth) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        Unable to load insights data.
      </div>
    )
  }

  const roleEntries = Object.entries(fleetHealth.by_role || {}).sort(
    (a, b) => b[1] - a[1]
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {fleetHealth.total_devices}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Online</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-500">
            {fleetHealth.online_devices}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Stale</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-500">
            {fleetHealth.stale_devices}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-rose-500">
            {fleetHealth.offline_devices}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {fleetHealth.uptime_pct}%
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Telemetry Trends</CardTitle>
              <p className="text-sm text-muted-foreground">
                Aggregated fleet trends from analytics storage.
              </p>
            </div>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="h-10 w-full text-sm sm:w-44">
                <SelectValue placeholder="Metric" />
              </SelectTrigger>
              <SelectContent>
                {METRIC_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <TelemetryChart title={`${metric} trend`} data={trendSeries} dataKey={metric} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fleet Health by Role</CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribution of devices across roles.
            </p>
          </CardHeader>
          <CardContent>
            {roleEntries.length ? (
              <div className="space-y-2 text-sm">
                {roleEntries.map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="capitalize">{role}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No role data available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
