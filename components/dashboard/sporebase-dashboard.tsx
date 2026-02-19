"use client"

/**
 * SporeBase Dashboard – device fleet, telemetry, tape position, sample timeline, alerts.
 * Data from /api/devices/sporebase, telemetry, and samples (no mock data).
 * Created: February 12, 2026
 */

import { useState, useEffect, useCallback } from "react"
import {
  Activity,
  AlertTriangle,
  Droplets,
  RefreshCw,
  Timer,
  Wind,
  Radio,
  Gauge,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SporeBaseDevice {
  device_id: string
  device_name?: string
  device_display_name?: string | null
  status: string
  last_seen?: string
  location?: string | null
  firmware_version?: string
}

interface TelemetryPoint {
  timestamp?: string
  spore_count?: number
  voc_index?: number
  temperature?: number
  humidity?: number
  pressure?: number
  flow_rate?: number
}

interface Sample {
  id: string
  device_id: string
  segment_number?: number
  start_time?: string
  end_time?: string
  status: string
  created_at?: string
}

export function SporeBaseDashboard() {
  const [devices, setDevices] = useState<SporeBaseDevice[]>([])
  const [samples, setSamples] = useState<Sample[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([])
  const [alerts, setAlerts] = useState<string[]>([])
  const [loadingDevices, setLoadingDevices] = useState(true)
  const [loadingSamples, setLoadingSamples] = useState(true)
  const [loadingTelemetry, setLoadingTelemetry] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDevices = useCallback(async () => {
    setLoadingDevices(true)
    setError(null)
    try {
      const res = await fetch("/api/devices/sporebase", { cache: "no-store" })
      const data = await res.json()
      const list = Array.isArray(data.devices) ? data.devices : []
      setDevices(list)
      if (list.length > 0 && !selectedDeviceId) setSelectedDeviceId(list[0].device_id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load devices")
      setDevices([])
    } finally {
      setLoadingDevices(false)
    }
  }, [selectedDeviceId])

  const fetchSamples = useCallback(async () => {
    setLoadingSamples(true)
    try {
      const res = await fetch("/api/devices/sporebase/samples", { cache: "no-store" })
      const data = await res.json()
      setSamples(Array.isArray(data.samples) ? data.samples : [])
    } catch {
      setSamples([])
    } finally {
      setLoadingSamples(false)
    }
  }, [])

  const fetchTelemetry = useCallback(async (deviceId: string) => {
    setLoadingTelemetry(true)
    try {
      const res = await fetch(
        `/api/devices/sporebase/telemetry?device_id=${encodeURIComponent(deviceId)}&limit=50`,
        { cache: "no-store" }
      )
      const data = await res.json()
      setTelemetry(Array.isArray(data.telemetry) ? data.telemetry : [])
    } catch {
      setTelemetry([])
    } finally {
      setLoadingTelemetry(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
    fetchSamples()
  }, [fetchDevices, fetchSamples])

  useEffect(() => {
    if (selectedDeviceId) fetchTelemetry(selectedDeviceId)
    else setTelemetry([])
  }, [selectedDeviceId, fetchTelemetry])

  const selectedDevice = devices.find((d) => d.device_id === selectedDeviceId)
  const latestTelemetry = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">SporeBase Fleet</h2>
        <Button variant="outline" size="sm" onClick={() => { fetchDevices(); fetchSamples(); if (selectedDeviceId) fetchTelemetry(selectedDeviceId); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-2 pt-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Device list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Devices
            </CardTitle>
            <CardDescription>SporeBase units from device registry</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDevices ? (
              <Skeleton className="h-32 w-full" />
            ) : devices.length === 0 ? (
              <p className="text-muted-foreground text-sm">No SporeBase devices registered.</p>
            ) : (
              <ScrollArea className="h-40">
                <ul className="space-y-2">
                  {devices.map((d) => (
                    <li key={d.device_id}>
                      <button
                        type="button"
                        className={`flex w-full items-center justify-between rounded-md border p-2 text-left text-sm transition-colors ${
                          selectedDeviceId === d.device_id
                            ? "border-primary bg-muted"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedDeviceId(d.device_id)}
                      >
                        <span className="font-medium">
                          {d.device_display_name || d.device_name || d.device_id}
                        </span>
                        <Badge variant={d.status === "online" ? "default" : "secondary"}>
                          {d.status}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Telemetry */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Telemetry
            </CardTitle>
            <CardDescription>
              {selectedDevice
                ? `Latest for ${selectedDevice.device_display_name || selectedDevice.device_id}`
                : "Select a device"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedDeviceId ? (
              <p className="text-muted-foreground text-sm">Select a device to view telemetry.</p>
            ) : loadingTelemetry ? (
              <Skeleton className="h-24 w-full" />
            ) : !latestTelemetry ? (
              <p className="text-muted-foreground text-sm">No telemetry data yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {latestTelemetry.spore_count != null && (
                  <div className="flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    <span>Spore count: {latestTelemetry.spore_count}</span>
                  </div>
                )}
                {latestTelemetry.flow_rate != null && (
                  <div className="flex items-center gap-1">
                    <Wind className="h-4 w-4" />
                    <span>Flow: {latestTelemetry.flow_rate} L/min</span>
                  </div>
                )}
                {latestTelemetry.temperature != null && (
                  <div className="flex items-center gap-1">
                    <Gauge className="h-4 w-4" />
                    <span>Temp: {latestTelemetry.temperature}°C</span>
                  </div>
                )}
                {latestTelemetry.humidity != null && (
                  <div className="flex items-center gap-1">
                    <Droplets className="h-4 w-4" />
                    <span>RH: {latestTelemetry.humidity}%</span>
                  </div>
                )}
                {!latestTelemetry.spore_count && !latestTelemetry.flow_rate && !latestTelemetry.temperature && !latestTelemetry.humidity && (
                  <p className="text-muted-foreground col-span-2">No numeric fields in latest point.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tape / sample timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Sample timeline
            </CardTitle>
            <CardDescription>Recent tape segments and samples</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSamples ? (
              <Skeleton className="h-32 w-full" />
            ) : samples.length === 0 ? (
              <p className="text-muted-foreground text-sm">No samples yet.</p>
            ) : (
              <ScrollArea className="h-40">
                <ul className="space-y-2">
                  {samples.slice(0, 20).map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <span>
                        {s.device_id} · seg {s.segment_number ?? "—"} · {s.status}
                      </span>
                      {s.start_time && (
                        <span className="text-muted-foreground">
                          {new Date(s.start_time).toLocaleDateString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alerts
          </CardTitle>
          <CardDescription>SporeBase alerts (from n8n when configured)</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active alerts.</p>
          ) : (
            <ul className="space-y-1">
              {alerts.map((a, i) => (
                <li key={i} className="text-sm text-amber-600 dark:text-amber-400">{a}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
