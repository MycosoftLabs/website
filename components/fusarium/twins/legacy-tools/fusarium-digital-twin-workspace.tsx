"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Activity, Clock, Cpu, Droplets, Network, Radio, Thermometer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SensorData {
  temperature?: number
  humidity?: number
  co2?: number
  light?: number
  ph?: number
  conductivity?: number
  timestamp: string
}

interface TwinPayload {
  device_id: string
  sensor_readings: SensorData
  current_state: null
  contract: {
    state: "available" | "stale"
    evidence_series: number
    source_ids: string[]
  }
}

const METRICS = [
  { key: "temperature", label: "Temperature", suffix: "°C", Icon: Thermometer, color: "text-amber-500" },
  { key: "humidity", label: "Humidity", suffix: "%", Icon: Droplets, color: "text-blue-500" },
  { key: "co2", label: "CO₂", suffix: " ppm", Icon: Radio, color: "text-green-500" },
  { key: "conductivity", label: "Conductivity", suffix: " mS/cm", Icon: Cpu, color: "text-purple-500" },
  { key: "ph", label: "pH", suffix: "", Icon: Activity, color: "text-rose-500" },
  { key: "light", label: "Light", suffix: " lux", Icon: Activity, color: "text-yellow-500" },
] as const

function isFiniteReading(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function exactIso(value: unknown): string | null {
  if (typeof value !== "string") return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/)
  if (!match) return null
  const [, year, month, day, hour, minute, second, fraction = "0", zone] = match
  const [y, mo, d, h, mi, s] = [year, month, day, hour, minute, second].map(Number)
  const ms = Number(fraction.padEnd(3, "0"))
  const wallClock = new Date(Date.UTC(y, mo - 1, d, h, mi, s, ms))
  if (wallClock.getUTCFullYear() !== y || wallClock.getUTCMonth() !== mo - 1 || wallClock.getUTCDate() !== d || wallClock.getUTCHours() !== h || wallClock.getUTCMinutes() !== mi || wallClock.getUTCSeconds() !== s || wallClock.getUTCMilliseconds() !== ms) return null
  if (zone !== "Z") {
    const [zoneHour, zoneMinute] = zone.slice(1).split(":").map(Number)
    if (zoneHour > 23 || zoneMinute > 59) return null
  }
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

function parsePayload(value: unknown, requestedDeviceId: string): TwinPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const payload = value as Record<string, unknown>
  if (payload.device_id !== requestedDeviceId || payload.current_state !== null) return null
  if (!payload.sensor_readings || typeof payload.sensor_readings !== "object" || Array.isArray(payload.sensor_readings)) return null
  if (!payload.contract || typeof payload.contract !== "object" || Array.isArray(payload.contract)) return null
  const readings = payload.sensor_readings as Record<string, unknown>
  const contract = payload.contract as Record<string, unknown>
  if (contract.state !== "available" && contract.state !== "stale") return null
  if (!Number.isInteger(contract.evidence_series) || Number(contract.evidence_series) < 1) return null
  if (!Array.isArray(contract.source_ids) || !contract.source_ids.every((item) => typeof item === "string" && item.startsWith("/api/"))) return null
  if (!exactIso(readings.timestamp)) return null
  if (!METRICS.some(({ key }) => isFiniteReading(readings[key]))) return null
  return value as TwinPayload
}

/**
 * Fusarium-local adapter for the immutable NatureOS Digital Twin payload.
 * Evidence is cleared as soon as the requested identity changes, every request
 * is abortable, and a late response can update the view only when both its
 * generation and returned device identity still match the current input.
 */
export function FusariumDigitalTwinWorkspace() {
  const [deviceId, setDeviceId] = useState("")
  const deviceIdRef = useRef("")
  const generationRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [autoUpdate, setAutoUpdate] = useState(false)
  const [boundDeviceId, setBoundDeviceId] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [sensorData, setSensorData] = useState<SensorData | null>(null)
  const [contract, setContract] = useState<TwinPayload["contract"] | null>(null)

  const clearEvidence = useCallback(() => {
    setBoundDeviceId(null)
    setSensorData(null)
    setContract(null)
  }, [])

  const changeDeviceId = useCallback((value: string) => {
    generationRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    deviceIdRef.current = value
    setDeviceId(value)
    setIsLoading(false)
    setLastError(null)
    clearEvidence()
  }, [clearEvidence])

  const fetchTwinData = useCallback(async () => {
    const requestedDeviceId = deviceIdRef.current.trim()
    if (!requestedDeviceId) return

    const generation = generationRef.current + 1
    generationRef.current = generation
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setIsLoading(true)
    setLastError(null)
    clearEvidence()

    try {
      const response = await fetch(`/api/natureos/devices/twin?deviceId=${encodeURIComponent(requestedDeviceId)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
      if (generationRef.current !== generation || deviceIdRef.current.trim() !== requestedDeviceId) return
      if (!response.ok) {
        setLastError(`Twin data unavailable (${response.status})`)
        return
      }
      const payload = parsePayload(await response.json(), requestedDeviceId)
      if (generationRef.current !== generation || deviceIdRef.current.trim() !== requestedDeviceId) return
      if (!payload) {
        setLastError("Twin data unavailable (invalid selected-device contract)")
        return
      }
      setBoundDeviceId(requestedDeviceId)
      setSensorData(payload.sensor_readings)
      setContract(payload.contract)
    } catch (error) {
      if (controller.signal.aborted || generationRef.current !== generation) return
      setLastError(error instanceof Error ? error.message : "Twin data unavailable")
    } finally {
      if (generationRef.current === generation) {
        if (abortRef.current === controller) abortRef.current = null
        setIsLoading(false)
      }
    }
  }, [clearEvidence])

  useEffect(() => {
    if (!autoUpdate || !deviceId.trim()) return
    const interval = window.setInterval(() => void fetchTwinData(), 10_000)
    return () => window.clearInterval(interval)
  }, [autoUpdate, deviceId, fetchTwinData])

  useEffect(() => () => abortRef.current?.abort(), [])

  const hasSensorData = useMemo(
    () => Boolean(sensorData && boundDeviceId === deviceId.trim()),
    [boundDeviceId, deviceId, sensorData],
  )

  return (
    <div className="space-y-6" data-fusarium-digital-twin-adapter="selected-device-v1">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Network className="h-5 w-5" /> Digital Twin Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="fusarium-digital-twin-device-id">Device ID</Label>
            <Input
              id="fusarium-digital-twin-device-id"
              value={deviceId}
              onChange={(event) => changeDeviceId(event.target.value)}
              placeholder="mycobrain-01"
              className="h-12"
            />
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={() => void fetchTwinData()} disabled={!deviceId.trim() || isLoading} className="min-h-[44px]">
              {isLoading ? "Checking same-origin read..." : "Check read seam"}
            </Button>
            <div className="flex items-center gap-2">
              <Switch id="fusarium-digital-twin-auto-update" checked={autoUpdate} onCheckedChange={setAutoUpdate} />
              <Label htmlFor="fusarium-digital-twin-auto-update" className="text-sm font-normal text-muted-foreground">Repeat passive read</Label>
            </div>
          </div>
          <Badge variant={hasSensorData ? "default" : "outline"}>
            {hasSensorData ? contract?.state === "stale" ? "VALIDATED STALE EVIDENCE" : "VALIDATED LIVE EVIDENCE" : "UNBOUND / NOT PROBED"}
          </Badge>
        </CardContent>
        {lastError ? <div className="px-6 pb-4 text-sm text-red-500">{lastError}</div> : null}
      </Card>

      <Tabs defaultValue="telemetry">
        <TabsList className="w-full flex-wrap justify-start">
          <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
          <TabsTrigger value="twin-state">Twin State</TabsTrigger>
        </TabsList>
        <TabsContent value="telemetry" className="space-y-4">
          {hasSensorData ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {METRICS.filter(({ key }) => isFiniteReading(sensorData?.[key])).map(({ key, label, suffix, Icon, color }) => (
                  <Card key={key}>
                    <CardContent className="flex items-center gap-3 pt-6">
                      <Icon className={`h-5 w-5 ${color}`} />
                      <div>
                        <div className="text-sm text-muted-foreground">{label}</div>
                        <div className="text-lg font-semibold">{sensorData?.[key]}{suffix}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Card>
                  <CardContent className="flex items-center gap-3 pt-6">
                    <Clock className="h-5 w-5 text-slate-500" />
                    <div>
                      <div className="text-sm text-muted-foreground">Last update</div>
                      <div className="text-sm font-medium">{sensorData?.timestamp}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <p className="text-xs text-muted-foreground">
                Selected device: {boundDeviceId} · {contract?.evidence_series} evidence series · {contract?.state.toUpperCase()}
              </p>
            </>
          ) : (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No validated telemetry is present. A successful, typed same-origin read is required before values render.</CardContent></Card>
          )}
        </TabsContent>
        <TabsContent value="twin-state">
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No validated twin state is present. Provider reachability does not prove synchronization.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
