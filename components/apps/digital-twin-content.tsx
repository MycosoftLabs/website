"use client"

import { useEffect, useMemo, useState } from "react"
import { Network, Cpu, Radio, Thermometer, Droplets, Activity, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface MyceliumState {
  biomass?: number
  networkDensity?: number
  resourceLevel?: number
  signalActivity?: number
  age?: number
  growthRate?: number
}

interface SensorData {
  temperature?: number
  humidity?: number
  co2?: number
  light?: number
  ph?: number
  conductivity?: number
  timestamp?: string
}

function normalizeSensorData(payload: any): SensorData | null {
  const sensor = payload?.sensor_readings || payload?.sensorData || payload?.data?.sensor_readings
  if (sensor && typeof sensor === "object") {
    return {
      temperature: sensor.temperature ?? sensor.temp,
      humidity: sensor.humidity,
      co2: sensor.co2 ?? sensor.co2_ppm,
      light: sensor.light,
      ph: sensor.ph,
      conductivity: sensor.conductivity,
      timestamp: sensor.timestamp ?? payload?.timestamp ?? payload?.last_sync,
    }
  }
  return null
}

function normalizeTwinState(payload: any): MyceliumState | null {
  const state = payload?.current_state || payload?.data?.current_state || payload?.twin_state
  if (state && typeof state === "object") {
    return {
      biomass: state.biomass,
      networkDensity: state.networkDensity ?? state.network_density,
      resourceLevel: state.resourceLevel ?? state.resource_level,
      signalActivity: state.signalActivity ?? state.signal_activity,
      age: state.age,
      growthRate: state.growthRate ?? state.growth_rate,
    }
  }
  return null
}

export function DigitalTwinContent() {
  const [deviceId, setDeviceId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [autoUpdate, setAutoUpdate] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [sensorData, setSensorData] = useState<SensorData | null>(null)
  const [twinState, setTwinState] = useState<MyceliumState | null>(null)

  const fetchTwinData = async () => {
    if (!deviceId) return
    setIsLoading(true)
    setLastError(null)
    try {
      const response = await fetch(`/api/natureos/devices/twin?deviceId=${encodeURIComponent(deviceId)}`, {
        cache: "no-store",
      })
      if (!response.ok) {
        setIsConnected(false)
        setLastError(`Twin data unavailable (${response.status})`)
        return
      }
      const payload = await response.json()
      setIsConnected(true)
      setSensorData(normalizeSensorData(payload))
      setTwinState(normalizeTwinState(payload))
    } catch (error) {
      setIsConnected(false)
      setLastError(error instanceof Error ? error.message : "Failed to load twin data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!autoUpdate || !deviceId) return
    const interval = setInterval(fetchTwinData, 10000)
    return () => clearInterval(interval)
  }, [autoUpdate, deviceId])

  const hasSensorData = useMemo(() => sensorData && Object.values(sensorData).some((value) => value !== undefined), [sensorData])
  const hasTwinState = useMemo(() => twinState && Object.values(twinState).some((value) => value !== undefined), [twinState])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Network className="h-5 w-5" /> Digital Twin Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="device-id">Device ID</Label>
            <Input
              id="device-id"
              value={deviceId}
              onChange={(event) => setDeviceId(event.target.value)}
              placeholder="mycobrain-01"
              className="h-12"
            />
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={fetchTwinData} disabled={!deviceId || isLoading} className="min-h-[44px]">
              {isLoading ? "Connecting..." : "Connect"}
            </Button>
            <div className="flex items-center gap-2">
              <Switch checked={autoUpdate} onCheckedChange={setAutoUpdate} />
              <span className="text-sm text-muted-foreground">Auto-update</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "outline"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </CardContent>
        {lastError ? (
          <div className="px-6 pb-4 text-sm text-red-500">{lastError}</div>
        ) : null}
      </Card>

      <Tabs defaultValue="telemetry">
        <TabsList className="w-full flex-wrap justify-start">
          <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
          <TabsTrigger value="twin-state">Twin State</TabsTrigger>
        </TabsList>
        <TabsContent value="telemetry" className="space-y-4">
          {hasSensorData ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <Thermometer className="h-5 w-5 text-amber-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">Temperature</div>
                    <div className="text-lg font-semibold">{sensorData?.temperature ?? "—"}°C</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <Droplets className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">Humidity</div>
                    <div className="text-lg font-semibold">{sensorData?.humidity ?? "—"}%</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <Radio className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">CO₂</div>
                    <div className="text-lg font-semibold">{sensorData?.co2 ?? "—"} ppm</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <Cpu className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">Conductivity</div>
                    <div className="text-lg font-semibold">{sensorData?.conductivity ?? "—"} mS/cm</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <Activity className="h-5 w-5 text-rose-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">pH</div>
                    <div className="text-lg font-semibold">{sensorData?.ph ?? "—"}</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-slate-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">Last update</div>
                    <div className="text-sm font-medium">{sensorData?.timestamp ?? "No data"}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No telemetry data available. Connect a device to view live readings.
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="twin-state">
          {hasTwinState ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Biomass</div>
                  <div className="text-xl font-semibold">{twinState?.biomass ?? "—"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Network Density</div>
                  <div className="text-xl font-semibold">{twinState?.networkDensity ?? "—"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Resource Level</div>
                  <div className="text-xl font-semibold">{twinState?.resourceLevel ?? "—"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Signal Activity</div>
                  <div className="text-xl font-semibold">{twinState?.signalActivity ?? "—"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Age</div>
                  <div className="text-xl font-semibold">{twinState?.age ?? "—"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Growth Rate</div>
                  <div className="text-xl font-semibold">{twinState?.growthRate ?? "—"}</div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No digital twin state available. Connect a device to view synchronization data.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
