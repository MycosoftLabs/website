"use client"

import { memo, useCallback } from "react"
import {
  Activity,
  Droplets,
  Gauge,
  Loader2,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react"
import type { ViewportSensorSource } from "@/lib/crep/viewport-sensor-sources"
import type { MapBoundsLike } from "@/lib/crep/viewport-revision"

interface ViewportSensorGridProps {
  sensors: ViewportSensorSource[]
  loading?: boolean
  onFlyTo?: (lng: number, lat: number, zoom?: number) => void
  limit?: number
  mapBounds?: MapBoundsLike | null
}

function sensorIcon(kind: string) {
  switch (kind) {
    case "aqi":
    case "h2s":
      return Wind
    case "tide":
      return Waves
    case "buoy":
      return Droplets
    case "streamflow":
    case "river-flow":
      return Gauge
    default:
      return Activity
  }
}

function formatLive(sensor: ViewportSensorSource): string {
  const { live } = sensor
  const v = live.value
  const digits = live.unit === "AQI" || live.unit === "ppb" ? 0 : 1
  const main = `${v.toFixed(digits)} ${live.unit}`
  if (live.label) return `${main} · ${live.label}`
  return main
}

export function openViewportSensor(
  sensor: ViewportSensorSource,
  onFlyTo?: (lng: number, lat: number, zoom?: number) => void,
) {
  onFlyTo?.(sensor.lng, sensor.lat, 14)
  window.dispatchEvent(
    new CustomEvent("crep:oyster:site-click", {
      detail: {
        id: sensor.id,
        name: sensor.name,
        provider: sensor.provider,
        agency: sensor.agency,
        lat: sensor.lat,
        lng: sensor.lng,
        kind: sensor.kind,
        category: sensor.category,
        station_id: sensor.station_id,
        live: sensor.live,
      },
    }),
  )
}

function ViewportSensorGrid({
  sensors,
  loading = false,
  onFlyTo,
  limit = 8,
}: ViewportSensorGridProps) {
  const visible = sensors.slice(0, limit)

  const openSensor = useCallback(
    (sensor: ViewportSensorSource) => {
      openViewportSensor(sensor, onFlyTo)
    },
    [onFlyTo],
  )

  if (!loading && visible.length === 0) {
    return null
  }

  const statusLabel = loading && visible.length === 0
    ? "checking live feeds…"
    : loading
      ? `${visible.length} · updating…`
      : `${visible.length} live`

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Thermometer className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-200">
            Environmental sensors
          </span>
        </div>
        <span className="text-[8px] text-gray-500">{statusLabel}</span>
      </div>

      {loading && visible.length === 0 ? (
        <div className="flex items-center gap-2 rounded border border-emerald-500/20 bg-black/30 px-2 py-2 text-[8px] text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin text-emerald-500/60" />
          Loading AQI, H₂S, tide, buoy, and flow monitors…
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {visible.map((sensor) => {
            const Icon = sensorIcon(sensor.kind)
            const accent = sensor.live.color || "#34d399"
            return (
              <button
                key={sensor.id}
                type="button"
                onClick={() => openSensor(sensor)}
                className="group flex min-h-[52px] flex-col justify-between rounded border border-emerald-500/25 bg-black/45 p-1.5 text-left transition-colors hover:border-emerald-400/55 touch-manipulation"
                title={`${sensor.name} — ${formatLive(sensor)}`}
                aria-label={`Fly to ${sensor.name}`}
              >
                <div className="flex items-start justify-between gap-1">
                  <Icon className="h-3 w-3 shrink-0 text-emerald-400/90" />
                  <span
                    className="truncate text-[8px] font-mono font-semibold"
                    style={{ color: accent }}
                  >
                    {formatLive(sensor)}
                  </span>
                </div>
                <div className="mt-1 truncate text-[7px] font-medium text-white/90">{sensor.name}</div>
                <div className="truncate text-[6px] text-emerald-300/70">{sensor.provider}</div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default memo(ViewportSensorGrid)
