"use client"

import { useMemo, useState } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TelemetryCompareRow {
  device: {
    device_id: string
    device_name?: string
    device_display_name?: string
  }
  telemetry?: Record<string, any>
}

interface TelemetryCompareProps {
  rows: TelemetryCompareRow[]
}

const METRICS = ["temperature", "humidity", "pressure", "iaq"]

function formatValue(value: unknown) {
  if (typeof value === "number") return value.toFixed(2)
  if (typeof value === "string" && value.trim()) return value
  return "—"
}

export function TelemetryCompare({ rows }: TelemetryCompareProps) {
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

  const [leftId, setLeftId] = useState(deviceOptions[0]?.id ?? "")
  const [rightId, setRightId] = useState(deviceOptions[1]?.id ?? "")

  const left = rows.find((row) => row.device.device_id === leftId)
  const right = rows.find((row) => row.device.device_id === rightId)

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No devices available for comparison.
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Select value={leftId} onValueChange={setLeftId}>
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
        <Select value={rightId} onValueChange={setRightId}>
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
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[left, right].map((row, index) => (
          <div key={row?.device.device_id ?? index} className="rounded-md border p-4">
            <div className="text-sm font-semibold">
              {row?.device.device_display_name ||
                row?.device.device_name ||
                row?.device.device_id ||
                "Select a device"}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              {METRICS.map((metric) => (
                <div key={metric} className="rounded-md bg-muted/20 px-3 py-2">
                  <div className="text-xs text-muted-foreground">{metric}</div>
                  <div className="font-semibold">
                    {formatValue(row?.telemetry?.[metric])}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
