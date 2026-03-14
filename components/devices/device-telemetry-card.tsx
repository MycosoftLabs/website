"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeviceStatusBadge } from "@/components/iot/device-status-badge"
import { RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { getRoleConfigForDevice } from "@/lib/device-configs"

/** Metric keys from Side A MDP payload (BSEC2 + soil for hyphae1) */
const METRIC_KEYS = [
  { key: "temperature", label: "Temp", unit: "°C" },
  { key: "humidity", label: "Humidity", unit: "%" },
  { key: "pressure", label: "Pressure", unit: "hPa" },
  { key: "iaq", label: "IAQ", unit: "" },
  { key: "soil_moisture", label: "Soil", unit: "%" },
]

interface TelemetryPayload {
  temperature?: number
  humidity?: number
  pressure?: number
  iaq?: number
  soil_moisture?: number
  temperature_b?: number
  [k: string]: unknown
}

interface TelemetryEntry {
  payload?: TelemetryPayload
  received_at?: string
  envelope?: { payload?: TelemetryPayload }
}

interface DeviceTelemetryCardProps {
  deviceId: string
  deviceName?: string
  role?: string | null
  status?: string
  pollIntervalMs?: number
}

function formatValue(value: unknown): string {
  if (typeof value === "number") return value.toFixed(2)
  if (typeof value === "string" && value.trim()) return value
  return "—"
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    const now = Date.now()
    const diff = Math.floor((now - d.getTime()) / 1000)
    if (diff < 60) return "Just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return d.toLocaleString()
  } catch {
    return ""
  }
}

export function DeviceTelemetryCard({
  deviceId,
  deviceName,
  role,
  status,
  pollIntervalMs = 5000,
}: DeviceTelemetryCardProps) {
  const [telemetry, setTelemetry] = useState<TelemetryEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const roleConfig = getRoleConfigForDevice(deviceId, role)

  const fetchTelemetry = async () => {
    try {
      setError(null)
      const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}/telemetry?n=1`, {
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Telemetry fetch failed")
        setTelemetry(null)
        return
      }
      const entries = data.telemetry ?? data.readings ?? []
      setTelemetry(Array.isArray(entries) ? entries : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Telemetry unavailable")
      setTelemetry(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTelemetry()
    const id = setInterval(fetchTelemetry, pollIntervalMs)
    return () => clearInterval(id)
  }, [deviceId, pollIntervalMs])

  const latest = telemetry?.[0]
  const payload =
    latest?.payload ??
    latest?.envelope?.payload ??
    (latest as unknown as TelemetryPayload)
  const lastUpdated = latest?.received_at

  const metricsToShow = METRIC_KEYS.map((m) => ({
    ...m,
    value: payload?.[m.key as keyof TelemetryPayload],
  })).filter((m) => m.value !== undefined && m.value !== null)

  const displayName = deviceName || roleConfig?.name || deviceId

  return (
    <Card className="h-full">
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{displayName}</CardTitle>
            <p className="text-xs text-muted-foreground">{deviceId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                fetchTelemetry()
              }}
              disabled={loading}
              className="min-h-[44px] min-w-[44px] rounded-md p-2 hover:bg-muted touch-manipulation"
              aria-label="Refresh telemetry"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <DeviceStatusBadge status={status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-2 md:grid-cols-3">
        {loading && !telemetry ? (
          <div className="col-span-2 text-muted-foreground md:col-span-3">
            Loading telemetry…
          </div>
        ) : error ? (
          <div className="col-span-2 text-destructive md:col-span-3">
            {error}
          </div>
        ) : metricsToShow.length === 0 ? (
          <div className="col-span-2 text-muted-foreground md:col-span-3">
            No telemetry available yet.
          </div>
        ) : (
          metricsToShow.map((m) => (
            <div
              key={m.key}
              className="flex flex-col gap-1 rounded-md border px-3 py-2"
            >
              <div className="text-xs text-muted-foreground">{m.label}</div>
              <div className="text-base font-semibold">
                {formatValue(m.value)}
                {m.unit ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {m.unit}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        )}
        <div className="col-span-2 text-xs text-muted-foreground md:col-span-3">
          {lastUpdated ? (
            <>Updated {formatRelativeTime(lastUpdated)}</>
          ) : (
            "No telemetry available yet."
          )}
        </div>
      </CardContent>
    </Card>
  )
}
