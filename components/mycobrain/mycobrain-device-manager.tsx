"use client"

import { useState, useEffect, useCallback } from "react"
import { useMycoBrain, getIAQLabel, formatUptime, formatGasResistance } from "@/hooks/use-mycobrain"
import { FirmwareUpdater } from "./firmware-updater"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Cpu,
  Thermometer,
  Droplets,
  Wind,
  Activity,
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap,
  Timer,
  MapPin,
  Lightbulb,
  LightbulbOff,
  Palette,
  Volume2,
  VolumeX,
  Settings,
  Terminal,
  Play,
  Square,
  CircleDot,
  BarChart3,
  Gauge,
  Usb,
  Power,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Plug,
  History,
} from "lucide-react"

interface SensorHistoryPoint {
  timestamp: Date
  bme1_temp: number
  bme1_humidity: number
  bme1_iaq: number
  bme2_temp: number
  bme2_humidity: number
  bme2_iaq: number
}

interface MycoBrainDeviceManagerProps {
  initialPort?: string
}

export function MycoBrainDeviceManager({ initialPort }: MycoBrainDeviceManagerProps = {}) {
  const {
    devices,
    loading,
    error,
    isConnected,
    lastUpdate,
    refresh,
    setNeoPixel,
    neoPixelRainbow,
    neoPixelOff,
    buzzerBeep,
    buzzerMelody,
    buzzerOff,
    sendControl,
  } = useMycoBrain(2000)

  const [selectedPort, setSelectedPort] = useState<string | null>(initialPort || null)
  const [neopixelColor, setNeopixelColor] = useState({ r: 0, g: 255, b: 0 })
  const [neopixelBrightness, setNeopixelBrightness] = useState(128)
  const [buzzerFrequency, setBuzzerFrequency] = useState(1000)
  const [commandLoading, setCommandLoading] = useState<string | null>(null)
  const [consoleOutput, setConsoleOutput] = useState<string[]>([])
  const [sensorHistory, setSensorHistory] = useState<SensorHistoryPoint[]>([])

  const device = devices.find((d) => d.port === selectedPort) || devices[0]

  // Select device on load - prefer initialPort, then first available device
  useEffect(() => {
    if (devices.length > 0) {
      if (initialPort && devices.find((d) => d.port === initialPort)) {
        setSelectedPort(initialPort)
      } else if (!selectedPort) {
        setSelectedPort(devices[0].port)
      }
    }
  }, [devices, selectedPort, initialPort])

  // Track sensor history
  useEffect(() => {
    if (device?.sensor_data?.bme688_1) {
      const newPoint: SensorHistoryPoint = {
        timestamp: new Date(),
        bme1_temp: device.sensor_data.bme688_1.temperature || 0,
        bme1_humidity: device.sensor_data.bme688_1.humidity || 0,
        bme1_iaq: device.sensor_data.bme688_1.iaq || 0,
        bme2_temp: device.sensor_data.bme688_2?.temperature || 0,
        bme2_humidity: device.sensor_data.bme688_2?.humidity || 0,
        bme2_iaq: device.sensor_data.bme688_2?.iaq || 0,
      }
      setSensorHistory((prev) => [...prev.slice(-59), newPoint])
    }
  }, [device?.sensor_data?.bme688_1?.temperature])

  const logToConsole = (message: string) => {
    setConsoleOutput((prev) => [
      ...prev.slice(-49),
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ])
  }

  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [serviceStatus, setServiceStatus] = useState<"checking" | "online" | "offline">("checking")

  const handleCommand = async (name: string, action: () => Promise<unknown>) => {
    setCommandLoading(name)
    logToConsole(`> Sending ${name}...`)
    try {
      await action()
      logToConsole(`✓ ${name} success`)
    } catch (error) {
      logToConsole(`✗ ${name} failed: ${error}`)
    } finally {
      setCommandLoading(null)
    }
  }

  // Check service status on mount and periodically
  useEffect(() => {
    const checkService = async () => {
      try {
        // First check the service status API
        const statusRes = await fetch("/api/services/status", {
          signal: AbortSignal.timeout(2000),
        })
        
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          const mycobrainService = statusData.services?.find((s: any) => s.id === "mycobrain")
          if (mycobrainService && mycobrainService.status === "online") {
            setServiceStatus("online")
            return
          }
        }
        
        // Fallback: check mycobrain API directly
        const res = await fetch("/api/mycobrain", {
          signal: AbortSignal.timeout(3000),
        })
        const data = await res.json()
        // Service is healthy if we get a response without the specific error
        const isOnline = !data.error || data.error !== "MycoBrain service not running"
        setServiceStatus(isOnline ? "online" : "offline")
      } catch (error) {
        console.error("Service check error:", error)
        setServiceStatus("offline")
      }
    }
    checkService()
    const interval = setInterval(checkService, 10000) // Check every 10 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading && devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Loading devices...</p>
        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </div>
    )
  }

  const handleScanForDevices = async () => {
    setScanning(true)
    setScanResult(null)
    logToConsole("> Scanning for MycoBrain devices...")
    
    try {
      // First check if service is running
      const healthRes = await fetch("/api/mycobrain")
      const healthData = await healthRes.json()
      
      if (healthData.error) {
        setScanResult(`MycoBrain service not running: ${healthData.message}`)
        logToConsole(`✗ Service error: ${healthData.error}`)
        return
      }
      
      // Get available ports
      const portsRes = await fetch("/api/mycobrain/ports")
      if (!portsRes.ok) {
        const errorData = await portsRes.json().catch(() => ({}))
        setScanResult(`Failed to scan ports: ${errorData.message || "Service unavailable"}`)
        logToConsole("✗ Failed to get ports")
        return
      }
      
      const portsData = await portsRes.json()
      const ports = portsData.ports || []
      
      logToConsole(`> Found ${ports.length} serial port(s)`)
      
      // Prioritize COM4, then any MycoBrain-like ports
      const com4Port = ports.find((p: any) => p.port === "COM4")
      const mycobrainPorts = ports.filter((p: any) => 
        p.is_mycobrain || 
        (p.port?.startsWith("COM") && p.port !== "COM4") ||
        p.port?.startsWith("/dev/tty")
      )
      
      const targetPorts = com4Port ? [com4Port, ...mycobrainPorts] : mycobrainPorts
      
      if (targetPorts.length === 0) {
        setScanResult("No MycoBrain devices found. Make sure device is connected via USB.")
        logToConsole("✗ No MycoBrain devices found")
        return
      }
      
      // Try to connect to each port (prioritize COM4)
      for (const portInfo of targetPorts) {
        const port = portInfo.port
        logToConsole(`> Attempting to connect to ${port}...`)
        
        try {
          const connectRes = await fetch("/api/mycobrain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "connect", port }),
          })
          
          const result = await connectRes.json()
          
          if (result.success) {
            setScanResult(`Successfully connected to ${port}!`)
            logToConsole(`✓ Connected to ${port}`)
            // Wait a moment then refresh
            await new Promise(resolve => setTimeout(resolve, 500))
            await refresh()
            return
          } else {
            logToConsole(`✗ Connection failed: ${result.message || result.error}`)
          }
        } catch (error) {
          logToConsole(`✗ Failed to connect to ${port}: ${error}`)
        }
      }
      
      setScanResult("Found ports but could not connect. Check device is powered on and not in use by another application.")
      logToConsole("✗ Could not connect to any device")
    } catch (error) {
      setScanResult(`Scan failed: ${error}`)
      logToConsole(`✗ Scan error: ${error}`)
    } finally {
      setScanning(false)
    }
  }

  if (!device) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Cpu className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No MycoBrain Connected</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Connect a MycoBrain device via USB to monitor sensors, control peripherals, and view real-time data.
          </p>
          
          {/* Service Status */}
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
            serviceStatus === "online" 
              ? "bg-green-500/20 text-green-500 border border-green-500/50" 
              : serviceStatus === "offline"
              ? "bg-red-500/20 text-red-500 border border-red-500/50"
              : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50"
          }`}>
            {serviceStatus === "online" ? (
              <>
                <CheckCircle className="h-4 w-4" />
                MycoBrain service is running
              </>
            ) : serviceStatus === "offline" ? (
              <>
                <AlertCircle className="h-4 w-4" />
                MycoBrain service not running - Start: python services/mycobrain/mycobrain_service.py
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking service status...
              </>
            )}
          </div>
          
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm bg-red-500/20 text-red-500 border border-red-500/50">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              {error}
            </div>
          )}
          
          {scanResult && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              scanResult.includes("Successfully") 
                ? "bg-green-500/20 text-green-500 border border-green-500/50" 
                : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50"
            }`}>
              {scanResult}
            </div>
          )}
          
          <div className="flex gap-3">
            <Button onClick={handleScanForDevices} disabled={scanning || serviceStatus === "offline"}>
              <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning..." : "Scan for Devices"}
            </Button>
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Quick connect to common ports:</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {["COM4", "COM3", "COM5", "COM6"].map((port) => (
                <Button
                  key={port}
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setScanning(true)
                    setScanResult(null)
                    logToConsole(`> Connecting to ${port}...`)
                    try {
                      const res = await fetch("/api/mycobrain", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "connect", port }),
                      })
                      const result = await res.json()
                      if (result.success) {
                        setScanResult(`Successfully connected to ${port}!`)
                        logToConsole(`✓ Connected to ${port}`)
                        await new Promise(resolve => setTimeout(resolve, 500))
                        await refresh()
                      } else {
                        setScanResult(`Failed to connect to ${port}: ${result.message || result.error}`)
                        logToConsole(`✗ Connection failed: ${result.message || result.error}`)
                      }
                    } catch (error) {
                      setScanResult(`Error connecting to ${port}: ${error}`)
                      logToConsole(`✗ Error: ${error}`)
                    } finally {
                      setScanning(false)
                    }
                  }}
                  disabled={scanning || serviceStatus === "offline"}
                >
                  {port}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const bme1 = device.sensor_data?.bme688_1
  const bme2 = device.sensor_data?.bme688_2
  const iaq1 = getIAQLabel(bme1?.iaq)
  const iaq2 = getIAQLabel(bme2?.iaq)

  return (
    <div className="space-y-6">
      {/* Device Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Cpu className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">MycoBrain Gateway</h2>
                <p className="text-green-100 flex items-center gap-2">
                  <Usb className="h-4 w-4" />
                  {device.port}
                  <span className="mx-1">•</span>
                  <span>MDP v{device.device_info?.mdp_version || 1}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={device.connected ? "bg-green-500" : "bg-red-500"}>
                {device.connected ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Disconnected
                  </>
                )}
              </Badge>
              <span className="text-xs text-green-100">
                Last update: {lastUpdate?.toLocaleTimeString() || "—"}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-100 mb-1">
                <Timer className="h-4 w-4" />
                <span className="text-xs">Uptime</span>
              </div>
              <p className="text-lg font-bold">{formatUptime(device.device_info?.uptime)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-100 mb-1">
                <Radio className="h-4 w-4" />
                <span className="text-xs">LoRa</span>
              </div>
              <p className="text-lg font-bold">
                {device.device_info?.lora_status === "ok" ? "Active" : "Init"}
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-100 mb-1">
                <CircleDot className="h-4 w-4" />
                <span className="text-xs">Sensors</span>
              </div>
              <p className="text-lg font-bold">2x BME688</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-100 mb-1">
                <Zap className="h-4 w-4" />
                <span className="text-xs">Status</span>
              </div>
              <p className="text-lg font-bold capitalize">{device.device_info?.status || "ready"}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="sensors" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="sensors" className="gap-2">
            <Thermometer className="h-4 w-4" />
            <span className="hidden sm:inline">Sensors</span>
          </TabsTrigger>
          <TabsTrigger value="controls" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Controls</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="console" className="gap-2">
            <Terminal className="h-4 w-4" />
            <span className="hidden sm:inline">Console</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Diagnostics</span>
          </TabsTrigger>
        </TabsList>

        {/* Sensors Tab */}
        <TabsContent value="sensors" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* BME688 Sensor 1 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <CircleDot className="h-5 w-5 text-blue-500" />
                    </div>
                    BME688 Sensor 1
                  </CardTitle>
                  <Badge variant="outline" className="text-green-500">
                    <Activity className="h-3 w-3 mr-1 animate-pulse" />
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Thermometer className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-muted-foreground">Temperature</span>
                    </div>
                    <p className="text-3xl font-bold">{bme1?.temperature?.toFixed(1) || "--"}°C</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Humidity</span>
                    </div>
                    <p className="text-3xl font-bold">{bme1?.humidity?.toFixed(1) || "--"}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-muted-foreground">Pressure</span>
                    </div>
                    <p className="text-3xl font-bold">{bme1?.pressure?.toFixed(0) || "--"}</p>
                    <p className="text-xs text-muted-foreground">hPa</p>
                  </div>
                  <div className={`p-4 rounded-lg ${iaq1.bgColor} border`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className={`h-4 w-4 ${iaq1.color}`} />
                      <span className="text-sm text-muted-foreground">Air Quality</span>
                    </div>
                    <p className={`text-3xl font-bold ${iaq1.color}`}>{bme1?.iaq || "--"}</p>
                    <p className="text-xs text-muted-foreground">{iaq1.label}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Gas Resistance</span>
                      <span className="font-mono">{formatGasResistance(bme1?.gas_resistance)}</span>
                    </div>
                    <Progress value={Math.min(((bme1?.gas_resistance || 0) / 500000) * 100, 100)} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BME688 Sensor 2 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <CircleDot className="h-5 w-5 text-purple-500" />
                    </div>
                    BME688 Sensor 2
                  </CardTitle>
                  <Badge variant="outline" className="text-green-500">
                    <Activity className="h-3 w-3 mr-1 animate-pulse" />
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Thermometer className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-muted-foreground">Temperature</span>
                    </div>
                    <p className="text-3xl font-bold">{bme2?.temperature?.toFixed(1) || "--"}°C</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Humidity</span>
                    </div>
                    <p className="text-3xl font-bold">{bme2?.humidity?.toFixed(1) || "--"}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-muted-foreground">Pressure</span>
                    </div>
                    <p className="text-3xl font-bold">{bme2?.pressure?.toFixed(0) || "--"}</p>
                    <p className="text-xs text-muted-foreground">hPa</p>
                  </div>
                  <div className={`p-4 rounded-lg ${iaq2.bgColor} border`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className={`h-4 w-4 ${iaq2.color}`} />
                      <span className="text-sm text-muted-foreground">Air Quality</span>
                    </div>
                    <p className={`text-3xl font-bold ${iaq2.color}`}>{bme2?.iaq || "--"}</p>
                    <p className="text-xs text-muted-foreground">{iaq2.label}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Gas Resistance</span>
                      <span className="font-mono">{formatGasResistance(bme2?.gas_resistance)}</span>
                    </div>
                    <Progress value={Math.min(((bme2?.gas_resistance || 0) / 500000) * 100, 100)} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sensor Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Sensor Comparison</CardTitle>
              <CardDescription>Real-time differential between both BME688 sensors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">ΔTemp</p>
                  <p className="text-xl font-mono font-bold">
                    {bme1 && bme2 ? `${Math.abs(bme1.temperature - bme2.temperature).toFixed(2)}°` : "—"}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">ΔHumidity</p>
                  <p className="text-xl font-mono font-bold">
                    {bme1 && bme2 ? `${Math.abs(bme1.humidity - bme2.humidity).toFixed(1)}%` : "—"}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">ΔPressure</p>
                  <p className="text-xl font-mono font-bold">
                    {bme1 && bme2 ? `${Math.abs(bme1.pressure - bme2.pressure).toFixed(1)}` : "—"}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">ΔIAQ</p>
                  <p className="text-xl font-mono font-bold">
                    {bme1?.iaq && bme2?.iaq ? Math.abs(bme1.iaq - bme2.iaq) : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Future Sensors Placeholder */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5 text-muted-foreground" />
                Additional Sensors
              </CardTitle>
              <CardDescription>
                Connect more sensors to the I2C bus or analog/digital pins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["Soil Moisture", "CO2 Sensor", "Light Level", "pH Sensor"].map((sensor) => (
                  <div key={sensor} className="p-4 rounded-lg border border-dashed text-center">
                    <Plug className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{sensor}</p>
                    <p className="text-xs text-muted-foreground">Not connected</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Controls Tab */}
        <TabsContent value="controls" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* NeoPixel Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  NeoPixel LED Control
                </CardTitle>
                <CardDescription>Control the RGB LED strip on MycoBrain</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleCommand("neopixel-color", () => 
                      setNeoPixel(device.port, neopixelColor.r, neopixelColor.g, neopixelColor.b, neopixelBrightness)
                    )}
                    disabled={commandLoading === "neopixel-color"}
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Set Color
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCommand("neopixel-rainbow", () => neoPixelRainbow(device.port))}
                    disabled={commandLoading === "neopixel-rainbow"}
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Rainbow
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCommand("neopixel-off", () => neoPixelOff(device.port))}
                    disabled={commandLoading === "neopixel-off"}
                  >
                    <LightbulbOff className="h-4 w-4" />
                  </Button>
                </div>

                {/* Color Sliders */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-red-500">Red: {neopixelColor.r}</Label>
                    <Slider
                      value={[neopixelColor.r]}
                      onValueChange={([v]) => setNeopixelColor((c) => ({ ...c, r: v }))}
                      max={255}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-green-500">Green: {neopixelColor.g}</Label>
                    <Slider
                      value={[neopixelColor.g]}
                      onValueChange={([v]) => setNeopixelColor((c) => ({ ...c, g: v }))}
                      max={255}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-blue-500">Blue: {neopixelColor.b}</Label>
                    <Slider
                      value={[neopixelColor.b]}
                      onValueChange={([v]) => setNeopixelColor((c) => ({ ...c, b: v }))}
                      max={255}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Brightness: {Math.round((neopixelBrightness / 255) * 100)}%</Label>
                    <Slider
                      value={[neopixelBrightness]}
                      onValueChange={([v]) => setNeopixelBrightness(v)}
                      max={255}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Color Preview */}
                <div
                  className="h-12 rounded-lg border-2"
                  style={{
                    backgroundColor: `rgb(${neopixelColor.r}, ${neopixelColor.g}, ${neopixelColor.b})`,
                    opacity: neopixelBrightness / 255,
                  }}
                />

                {/* Preset Colors */}
                <div>
                  <Label className="mb-2 block">Presets</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { name: "Red", r: 255, g: 0, b: 0 },
                      { name: "Green", r: 0, g: 255, b: 0 },
                      { name: "Blue", r: 0, g: 0, b: 255 },
                      { name: "Yellow", r: 255, g: 255, b: 0 },
                      { name: "Cyan", r: 0, g: 255, b: 255 },
                      { name: "Magenta", r: 255, g: 0, b: 255 },
                      { name: "White", r: 255, g: 255, b: 255 },
                      { name: "Warm", r: 255, g: 180, b: 100 },
                    ].map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        style={{ backgroundColor: `rgb(${preset.r}, ${preset.g}, ${preset.b})` }}
                        onClick={() => setNeopixelColor({ r: preset.r, g: preset.g, b: preset.b })}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Buzzer Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-blue-500" />
                  Buzzer Control
                </CardTitle>
                <CardDescription>Audio feedback and alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleCommand("buzzer-beep", () => 
                      buzzerBeep(device.port, buzzerFrequency, 200)
                    )}
                    disabled={commandLoading === "buzzer-beep"}
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Beep
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCommand("buzzer-melody", () => buzzerMelody(device.port))}
                    disabled={commandLoading === "buzzer-melody"}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Melody
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCommand("buzzer-off", () => buzzerOff(device.port))}
                    disabled={commandLoading === "buzzer-off"}
                  >
                    <VolumeX className="h-4 w-4" />
                  </Button>
                </div>

                {/* Frequency Slider */}
                <div>
                  <Label>Frequency: {buzzerFrequency} Hz</Label>
                  <Slider
                    value={[buzzerFrequency]}
                    onValueChange={([v]) => setBuzzerFrequency(v)}
                    min={200}
                    max={5000}
                    step={100}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>200 Hz (Low)</span>
                    <span>2000 Hz</span>
                    <span>5000 Hz (High)</span>
                  </div>
                </div>

                {/* Preset Tones */}
                <div>
                  <Label className="mb-2 block">Preset Tones</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: "C4", freq: 262 },
                      { name: "E4", freq: 330 },
                      { name: "G4", freq: 392 },
                      { name: "C5", freq: 523 },
                      { name: "Alert", freq: 880 },
                      { name: "Warning", freq: 1000 },
                      { name: "Success", freq: 1500 },
                      { name: "Error", freq: 200 },
                    ].map((tone) => (
                      <Button
                        key={tone.name}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBuzzerFrequency(tone.freq)
                          handleCommand(`tone-${tone.name}`, () => buzzerBeep(device.port, tone.freq, 100))
                        }}
                      >
                        {tone.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Raw Command Interface */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Raw Command Interface
              </CardTitle>
              <CardDescription>Send custom MDP commands to the device</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => handleCommand("ping", () => sendControl(device.port, "command", "ping", { cmd_id: 1, dst: 0xA1, data: [] }))}
                  disabled={commandLoading === "ping"}
                >
                  {commandLoading === "ping" ? "..." : "Ping"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCommand("get-sensors", () => sendControl(device.port, "command", "get_sensors", { cmd_id: 2, dst: 0xA1, data: [] }))}
                  disabled={commandLoading === "get-sensors"}
                >
                  {commandLoading === "get-sensors" ? "..." : "Get Sensors"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCommand("get-bme1", () => sendControl(device.port, "command", "get_bme1", { cmd_id: 30, dst: 0xA1, data: [] }))}
                  disabled={commandLoading === "get-bme1"}
                >
                  {commandLoading === "get-bme1" ? "..." : "BME688-1"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCommand("get-bme2", () => sendControl(device.port, "command", "get_bme2", { cmd_id: 31, dst: 0xA1, data: [] }))}
                  disabled={commandLoading === "get-bme2"}
                >
                  {commandLoading === "get-bme2" ? "..." : "BME688-2"}
                </Button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Raw MDP commands sent directly to device. Check console for responses.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sensor History (Last {sensorHistory.length} readings)</CardTitle>
              <CardDescription>Real-time sensor data trends</CardDescription>
            </CardHeader>
            <CardContent>
              {sensorHistory.length > 0 ? (
                <div className="h-64 flex items-end gap-1">
                  {sensorHistory.map((point, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-green-500 to-green-400 rounded-t"
                      style={{ height: `${(point.bme1_temp / 50) * 100}%` }}
                      title={`${point.bme1_temp.toFixed(1)}°C at ${point.timestamp.toLocaleTimeString()}`}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Collecting data...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Console Tab */}
        <TabsContent value="console">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Device Console
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setConsoleOutput([])}>
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 rounded-lg bg-black p-4 font-mono text-sm text-green-400">
                {consoleOutput.length === 0 ? (
                  <div className="text-muted-foreground">
                    <p>MycoBrain Console - {device.port}</p>
                    <p>---</p>
                    <p>Ready for commands...</p>
                  </div>
                ) : (
                  consoleOutput.map((line, i) => <div key={i}>{line}</div>)
                )}
                <div className="animate-pulse">_</div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Device Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Port</p>
                  <p className="font-mono">{device.port}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">MDP Version</p>
                  <p className="font-mono">v{device.device_info?.mdp_version || 1}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Firmware</p>
                  <p className="font-mono">{device.device_info?.firmware_version || "1.0.0"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Board Type</p>
                  <p className="font-mono">{device.device_info?.board_type || "ESP32-S3"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">MAC Address</p>
                  <p className="font-mono">{device.device_info?.mac_address || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-mono capitalize">{device.device_info?.status || "ready"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {device.capabilities?.bme688_count && (
                  <Badge>BME688 x{device.capabilities.bme688_count}</Badge>
                )}
                {device.capabilities?.has_lora && <Badge>LoRa SX1262</Badge>}
                {device.capabilities?.has_neopixel && <Badge>NeoPixel RGB</Badge>}
                {device.capabilities?.has_buzzer && <Badge>Buzzer</Badge>}
                {device.capabilities?.i2c_bus && <Badge>I2C Bus</Badge>}
                {device.capabilities?.analog_inputs && (
                  <Badge variant="outline">Analog x{device.capabilities.analog_inputs}</Badge>
                )}
                {device.capabilities?.digital_io && (
                  <Badge variant="outline">Digital IO x{device.capabilities.digital_io}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location (GPS)</CardTitle>
              <CardDescription>
                {device.location?.source === "gps" 
                  ? "Location from onboard GPS" 
                  : "Manual location (GPS not connected)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Latitude</p>
                  <p className="font-mono">{device.location?.lat?.toFixed(6) || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Longitude</p>
                  <p className="font-mono">{device.location?.lng?.toFixed(6) || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p className="font-mono capitalize">{device.location?.source || "unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Accuracy</p>
                  <p className="font-mono">{device.location?.accuracy ? `${device.location.accuracy}m` : "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Firmware Tab */}
        <TabsContent value="firmware" className="space-y-4">
          <FirmwareUpdater />
        </TabsContent>
      </Tabs>
    </div>
  )
}
