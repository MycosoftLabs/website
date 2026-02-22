"use client"

import { useMemo } from "react"
import useSWR from "swr"

import { TelemetryCard } from "@/components/iot/telemetry-card"

interface DeviceRecord {
  device_id: string
  device_name?: string
  device_display_name?: string
  status?: string
}

interface TelemetryRow {
  device: DeviceRecord
  telemetry?: Record<string, any>
  lastUpdated?: string
  error?: string
}

export interface TelemetryGridResponse {
  rows: TelemetryRow[]
}

export const telemetryGridKey = "telemetry-grid"

export const telemetryGridFetcher = async () => {
  const devicesRes = await fetch("/api/devices?include_offline=true", {
    cache: "no-store",
  })
  if (!devicesRes.ok) throw new Error("Failed to load devices")
  const deviceData = await devicesRes.json()
  const devices: DeviceRecord[] = deviceData.devices || []

  const telemetryResults = await Promise.allSettled(
    devices.map(async (device) => {
      const response = await fetch(
        `/api/natureos/devices/${encodeURIComponent(device.device_id)}/telemetry`,
        {
        cache: "no-store",
        }
      )
      if (!response.ok) {
        const errorText = await response.text()
        return { device, error: errorText }
      }
      const telemetry = await response.json()
      return {
        device,
        telemetry: telemetry.metrics || telemetry.telemetry || telemetry.data || {},
        lastUpdated: telemetry.timestamp || new Date().toISOString(),
      }
    })
  )

  const rows: TelemetryRow[] = telemetryResults.map((result, index) => {
    if (result.status === "fulfilled") return result.value as TelemetryRow
    return {
      device: devices[index],
      error: result.reason?.message || "Telemetry unavailable",
    }
  })

  return { rows } satisfies TelemetryGridResponse
}

export function TelemetryGrid() {
  const { data, error, isLoading } = useSWR<TelemetryGridResponse>(
    telemetryGridKey,
    telemetryGridFetcher,
    { refreshInterval: 15000 }
  )

  const rows = useMemo(() => data?.rows ?? [], [data])

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

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No telemetry data available. Connect devices to begin streaming.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <TelemetryCard
          key={row.device.device_id}
          deviceId={row.device.device_id}
          deviceName={
            row.device.device_display_name || row.device.device_name
          }
          status={row.device.status}
          telemetry={row.telemetry}
          lastUpdated={row.lastUpdated}
        />
      ))}
    </div>
  )
}
