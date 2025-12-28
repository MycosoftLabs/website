"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  RefreshCw,
  Thermometer,
  Droplets,
  Wind,
  Activity,
  Cpu,
  Radio,
  Volume2,
  VolumeX,
  Lightbulb,
  LightbulbOff,
  Palette,
  Zap,
  Wifi,
  WifiOff,
  Settings,
  Terminal,
  ChevronRight,
  CircleDot,
} from "lucide-react"

interface BME688Data {
  temperature: number
  humidity: number
  pressure: number
  gas_resistance: number
  iaq?: number
  iaq_accuracy?: number
}

interface MycoBrainDevice {
  port: string
  connected: boolean
  device_info: {
    side?: string
    mdp_version?: number
    status?: string
    lora_status?: string
  }
  sensor_data: {
    bme688_1?: BME688Data
    bme688_2?: BME688Data
    last_update?: string
  }
  last_message_time?: string
}

interface MycoBrainDeviceCardProps {
  port?: string
  onDeviceSelect?: (port: string) => void
}

export function MycoBrainDeviceCard({ port = "COM4", onDeviceSelect }: MycoBrainDeviceCardProps) {
  const [device, setDevice] = useState<MycoBrainDevice | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [neopixelColor, setNeopixelColor] = useState({ r: 0, g: 255, b: 0 })
  const [neopixelBrightness, setNeopixelBrightness] = useState(128)
  const [buzzerFrequency, setBuzzerFrequency] = useState(1000)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchDevice = useCallback(async () => {
    try {
      const response = await fetch("/api/mycobrain")
      if (response.ok) {
        const data = await response.json()
        const foundDevice = data.devices?.find((d: MycoBrainDevice) => d.port === port)
        setDevice(foundDevice || data.devices?.[0] || null)
      }
    } catch (error) {
      console.error("Failed to fetch device:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [port])

  const fetchSensors = useCallback(async () => {
    if (!device?.port) return
    try {
      const response = await fetch(`/api/mycobrain/${encodeURIComponent(device.port)}/sensors`)
      if (response.ok) {
        const data = await response.json()
        setDevice((prev) =>
          prev ? { ...prev, sensor_data: data.sensors } : null
        )
      }
    } catch (error) {
      console.error("Failed to fetch sensors:", error)
    }
  }, [device?.port])

  useEffect(() => {
    fetchDevice()
    const interval = setInterval(fetchDevice, 5000)
    return () => clearInterval(interval)
  }, [fetchDevice])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDevice()
    fetchSensors()
  }

  const sendControl = async (peripheral: string, action: string, data: Record<string, unknown> = {}) => {
    if (!device?.port) return
    setActionLoading(`${peripheral}-${action}`)
    try {
      await fetch(`/api/mycobrain/${encodeURIComponent(device.port)}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peripheral, action, ...data }),
      })
    } catch (error) {
      console.error("Control failed:", error)
    } finally {
      setActionLoading(null)
    }
  }

  const getIAQLabel = (iaq?: number): { label: string; color: string } => {
    if (!iaq) return { label: "Unknown", color: "text-gray-500" }
    if (iaq <= 50) return { label: "Excellent", color: "text-green-500" }
    if (iaq <= 100) return { label: "Good", color: "text-green-400" }
    if (iaq <= 150) return { label: "Moderate", color: "text-yellow-500" }
    if (iaq <= 200) return { label: "Poor", color: "text-orange-500" }
    return { label: "Unhealthy", color: "text-red-500" }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading MycoBrain...</span>
        </CardContent>
      </Card>
    )
  }

  if (!device) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No MycoBrain Connected</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Connect a MycoBrain device via USB to get started.
          </p>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Scan for Devices
          </Button>
        </CardContent>
      </Card>
    )
  }

  const bme1 = device.sensor_data?.bme688_1
  const bme2 = device.sensor_data?.bme688_2
  const iaq1 = getIAQLabel(bme1?.iaq)
  const iaq2 = getIAQLabel(bme2?.iaq)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">MycoBrain Gateway</CardTitle>
              <CardDescription className="text-green-100">
                {device.port} • {device.device_info?.status || "ready"}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={device.connected ? "default" : "secondary"} className="bg-white/20">
              {device.connected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" /> Online
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" /> Offline
                </>
              )}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <Radio className="h-4 w-4 mx-auto mb-1" />
            <div className="text-xs opacity-80">LoRa</div>
            <div className="text-sm font-medium">
              {device.device_info?.lora_status === "ok" ? "Active" : "Init"}
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <Activity className="h-4 w-4 mx-auto mb-1" />
            <div className="text-xs opacity-80">MDP</div>
            <div className="text-sm font-medium">v{device.device_info?.mdp_version || 1}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <Thermometer className="h-4 w-4 mx-auto mb-1" />
            <div className="text-xs opacity-80">Sensors</div>
            <div className="text-sm font-medium">2x BME688</div>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <Zap className="h-4 w-4 mx-auto mb-1" />
            <div className="text-xs opacity-80">Status</div>
            <div className="text-sm font-medium capitalize">{device.device_info?.side || "gateway"}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs defaultValue="sensors" className="w-full">
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="sensors" className="flex-1">
              <Thermometer className="h-4 w-4 mr-2" />
              Sensors
            </TabsTrigger>
            <TabsTrigger value="controls" className="flex-1">
              <Settings className="h-4 w-4 mr-2" />
              Controls
            </TabsTrigger>
            <TabsTrigger value="console" className="flex-1">
              <Terminal className="h-4 w-4 mr-2" />
              Console
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sensors" className="p-4 space-y-6">
            {/* BME688 Sensor 1 */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-blue-500" />
                BME688 Sensor 1
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Thermometer className="h-4 w-4" />
                    <span className="text-xs">Temperature</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {bme1?.temperature?.toFixed(1) || "--"}°C
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Droplets className="h-4 w-4" />
                    <span className="text-xs">Humidity</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {bme1?.humidity?.toFixed(1) || "--"}%
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Wind className="h-4 w-4" />
                    <span className="text-xs">Pressure</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {bme1?.pressure?.toFixed(0) || "--"}
                    <span className="text-sm font-normal">hPa</span>
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs">Air Quality</span>
                  </div>
                  <div className={`text-2xl font-bold ${iaq1.color}`}>
                    {bme1?.iaq || "--"}
                  </div>
                  <div className="text-xs text-muted-foreground">{iaq1.label}</div>
                </div>
              </div>
            </div>

            {/* BME688 Sensor 2 */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-purple-500" />
                BME688 Sensor 2
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Thermometer className="h-4 w-4" />
                    <span className="text-xs">Temperature</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {bme2?.temperature?.toFixed(1) || "--"}°C
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Droplets className="h-4 w-4" />
                    <span className="text-xs">Humidity</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {bme2?.humidity?.toFixed(1) || "--"}%
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Wind className="h-4 w-4" />
                    <span className="text-xs">Pressure</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {bme2?.pressure?.toFixed(0) || "--"}
                    <span className="text-sm font-normal">hPa</span>
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs">Air Quality</span>
                  </div>
                  <div className={`text-2xl font-bold ${iaq2.color}`}>
                    {bme2?.iaq || "--"}
                  </div>
                  <div className="text-xs text-muted-foreground">{iaq2.label}</div>
                </div>
              </div>
            </div>

            {/* Gas Resistance Comparison */}
            <div>
              <h4 className="font-semibold mb-3">Gas Resistance Comparison</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Sensor 1</span>
                    <span>{((bme1?.gas_resistance || 0) / 1000).toFixed(1)} kΩ</span>
                  </div>
                  <Progress value={Math.min(((bme1?.gas_resistance || 0) / 100000) * 100, 100)} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Sensor 2</span>
                    <span>{((bme2?.gas_resistance || 0) / 1000).toFixed(1)} kΩ</span>
                  </div>
                  <Progress value={Math.min(((bme2?.gas_resistance || 0) / 100000) * 100, 100)} className="h-2" />
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-right">
              Last updated: {device.sensor_data?.last_update ? new Date(device.sensor_data.last_update).toLocaleTimeString() : "Never"}
            </div>
          </TabsContent>

          <TabsContent value="controls" className="p-4 space-y-6">
            {/* NeoPixel Controls */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                NeoPixel LEDs
              </h4>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => sendControl("neopixel", "solid", { ...neopixelColor, brightness: neopixelBrightness })}
                    disabled={actionLoading === "neopixel-solid"}
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Set Color
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => sendControl("neopixel", "rainbow")}
                    disabled={actionLoading === "neopixel-rainbow"}
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Rainbow
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => sendControl("neopixel", "off")}
                    disabled={actionLoading === "neopixel-off"}
                  >
                    <LightbulbOff className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Red</label>
                    <Slider
                      value={[neopixelColor.r]}
                      onValueChange={([v]) => setNeopixelColor((c) => ({ ...c, r: v }))}
                      max={255}
                      className="mt-2"
                    />
                    <div className="text-center text-sm mt-1">{neopixelColor.r}</div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Green</label>
                    <Slider
                      value={[neopixelColor.g]}
                      onValueChange={([v]) => setNeopixelColor((c) => ({ ...c, g: v }))}
                      max={255}
                      className="mt-2"
                    />
                    <div className="text-center text-sm mt-1">{neopixelColor.g}</div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Blue</label>
                    <Slider
                      value={[neopixelColor.b]}
                      onValueChange={([v]) => setNeopixelColor((c) => ({ ...c, b: v }))}
                      max={255}
                      className="mt-2"
                    />
                    <div className="text-center text-sm mt-1">{neopixelColor.b}</div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Brightness</label>
                  <Slider
                    value={[neopixelBrightness]}
                    onValueChange={([v]) => setNeopixelBrightness(v)}
                    max={255}
                    className="mt-2"
                  />
                  <div className="text-center text-sm mt-1">{Math.round((neopixelBrightness / 255) * 100)}%</div>
                </div>

                {/* Color Preview */}
                <div
                  className="h-8 rounded-lg border"
                  style={{
                    backgroundColor: `rgb(${neopixelColor.r}, ${neopixelColor.g}, ${neopixelColor.b})`,
                    opacity: neopixelBrightness / 255,
                  }}
                />
              </div>
            </div>

            {/* Buzzer Controls */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-blue-500" />
                Buzzer
              </h4>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => sendControl("buzzer", "beep", { frequency: buzzerFrequency, duration_ms: 100 })}
                    disabled={actionLoading === "buzzer-beep"}
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Beep
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => sendControl("buzzer", "melody")}
                    disabled={actionLoading === "buzzer-melody"}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Melody
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => sendControl("buzzer", "off")}
                    disabled={actionLoading === "buzzer-off"}
                  >
                    <VolumeX className="h-4 w-4" />
                  </Button>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Frequency: {buzzerFrequency} Hz</label>
                  <Slider
                    value={[buzzerFrequency]}
                    onValueChange={([v]) => setBuzzerFrequency(v)}
                    min={200}
                    max={5000}
                    step={100}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="console" className="p-4">
            <div className="bg-black rounded-lg p-4 font-mono text-sm text-green-400 h-64 overflow-auto">
              <div className="opacity-50">MycoBrain Console - {device.port}</div>
              <div className="opacity-50">----------------------------</div>
              {device.device_info?.lora_status && (
                <div>{">"} LoRa init: {device.device_info.lora_status}</div>
              )}
              {device.device_info?.side && (
                <div>{">"} Side: {device.device_info.side}</div>
              )}
              {device.device_info?.mdp_version && (
                <div>{">"} MDP version: {device.device_info.mdp_version}</div>
              )}
              {device.device_info?.status && (
                <div>{">"} Status: {device.device_info.status}</div>
              )}
              <div className="opacity-50 mt-4">Last message: {device.last_message_time || "None"}</div>
              <div className="animate-pulse mt-2">_</div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => sendControl("command", "ping", { cmd_id: 1 })}>
                Ping
              </Button>
              <Button variant="outline" size="sm" onClick={fetchSensors}>
                Request Sensors
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
