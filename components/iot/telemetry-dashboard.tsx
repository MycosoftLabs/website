"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"

import { TelemetryGrid, telemetryGridFetcher, telemetryGridKey, TelemetryGridResponse } from "@/components/iot/telemetry-grid"
import { TelemetryCompare } from "@/components/iot/telemetry-compare"
import { TelemetryChart } from "@/components/iot/telemetry-chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TrendPoint {
  timestamp: string
  metrics: Record<string, any>
}

interface TrendSeries {
  points: TrendPoint[]
}

const METRIC_KEYS = ["temperature", "humidity", "pressure", "iaq"]

function formatTimestamp(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function TelemetryDashboard() {
  const { data, error, isLoading } = useSWR<TelemetryGridResponse>(
    telemetryGridKey,
    telemetryGridFetcher,
    { refreshInterval: 15000 }
  )

  const rows = useMemo(() => data?.rows ?? [], [data])
  const deviceOptions = useMemo(
    () =>
      rows.map((row) => ({
        id: row.device.device_id,
        label:
          row.device.device_display_name ||
          row.device.device_name ||
          row.device.device_id,
      })),
    [rows]
  )

  const [selectedId, setSelectedId] = useState<string>("")

  useEffect(() => {
    if (!selectedId && deviceOptions.length) {
      setSelectedId(deviceOptions[0].id)
    } else if (selectedId && deviceOptions.length) {
      const exists = deviceOptions.some((option) => option.id === selectedId)
      if (!exists) setSelectedId(deviceOptions[0].id)
    }
  }, [deviceOptions, selectedId])

  const trendsKey = selectedId
    ? `/api/iot/insights/trends?device_id=${encodeURIComponent(selectedId)}`
    : "/api/iot/insights/trends"

  const { data: trendsData } = useSWR<TrendSeries>(trendsKey, async (url) => {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) return { points: [] }
    return response.json()
  })

  const trendSeries = useMemo(() => {
    if (!trendsData?.points?.length) return []
    return trendsData.points.map((point) => ({
      timestamp: formatTimestamp(point.timestamp),
      ...point.metrics,
    }))
  }, [trendsData])

  if (isLoading) {
    return <div className="rounded-lg border p-6">Loading telemetry...</div>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        Unable to load telemetry data.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TelemetryGrid />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Telemetry Trends</h2>
            <p className="text-sm text-muted-foreground">
              Historical sensor trends from the analytics pipeline.
            </p>
          </div>
          {deviceOptions.length ? (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="h-11 w-full text-base md:w-60">
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                {deviceOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {METRIC_KEYS.map((metric) => (
            <TelemetryChart
              key={metric}
              title={metric}
              data={trendSeries}
              dataKey={metric}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Device Comparison</h2>
        <TelemetryCompare rows={rows} />
      </div>
    </div>
  )
}
