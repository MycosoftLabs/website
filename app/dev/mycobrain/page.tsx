"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Thermometer, Droplets, Gauge, Wind, Wifi, WifiOff, Activity, Cpu, Volume2, Lightbulb, Zap, Music, Palette } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Device {
  port: string
  device_id: string
  connected: boolean
  sensor_data?: {
    temperature: number
    humidity: number
    pressure: number
    gas_resistance: number
    iaq: number
    co2_equivalent: number
    voc_equivalent: number
    bme688_count: number
    uptime_seconds: number
    firmware_version: string
    health?: {
      heap: number
      i2c_ok: boolean
    }
    last_update: string
  }
}

interface ApiResponse {
  devices: Device[]
  timestamp: string
}

export default function MycoBrainDevTestPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const [serviceHealth, setServiceHealth] = useState<{ healthy: boolean; version: string } | null>(null)
  const [controlStatus, setControlStatus] = useState<string>("")

  const sendCommand = async (port: string, cmd: string) => {
    try {
      setControlStatus(`Sending: ${cmd}...`)
      const res = await fetch(`/api/mycobrain/${port}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peripheral: "buzzer", action: cmd })
      })
      if (res.ok) {
        setControlStatus(`✅ ${cmd} sent!`)
      } else {
        setControlStatus(`❌ Failed: ${cmd}`)
      }
      setTimeout(() => setControlStatus(""), 2000)
    } catch {
      setControlStatus(`❌ Error sending ${cmd}`)
      setTimeout(() => setControlStatus(""), 2000)
    }
  }

  const sendLED = async (port: string, mode: string, color?: number[]) => {
    try {
      setControlStatus(`LED: ${mode}...`)
      const body: Record<string, unknown> = { peripheral: "neopixel", action: mode }
      if (color) {
        body.r = color[0]
        body.g = color[1]
        body.b = color[2]
      }
      const res = await fetch(`/api/mycobrain/${port}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        setControlStatus(`✅ LED ${mode}!`)
      } else {
        setControlStatus(`❌ LED failed`)
      }
      setTimeout(() => setControlStatus(""), 2000)
    } catch {
      setControlStatus(`❌ LED error`)
      setTimeout(() => setControlStatus(""), 2000)
    }
  }

  const sendBuzzer = async (port: string, frequency: number, duration: number) => {
    try {
      setControlStatus(`Beep ${frequency}Hz...`)
      const res = await fetch(`/api/mycobrain/${port}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peripheral: "buzzer", action: "beep", frequency, duration_ms: duration })
      })
      if (res.ok) {
        setControlStatus(`✅ Beep!`)
      } else {
        setControlStatus(`❌ Buzzer failed`)
      }
      setTimeout(() => setControlStatus(""), 2000)
    } catch {
      setControlStatus(`❌ Buzzer error`)
      setTimeout(() => setControlStatus(""), 2000)
    }
  }

  const fetchDevices = useCallback(async () => {
    try {
      // First check service health
      const healthRes = await fetch("/api/mycobrain/health")
      if (healthRes.ok) {
        const healthData = await healthRes.json()
        setServiceHealth({
          healthy: healthData.status === "ok",
          version: healthData.version || "2.2.0"
        })
      }

      // Then fetch devices
      const res = await fetch("/api/mycobrain")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      
      const data: ApiResponse = await res.json()
      setDevices(data.devices || [])
      setLastUpdate(new Date().toLocaleTimeString())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 2000)
    return () => clearInterval(interval)
  }, [fetchDevices])

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  const getIaqLabel = (iaq: number) => {
    if (iaq <= 50) return { label: "Excellent", color: "bg-green-500" }
    if (iaq <= 100) return { label: "Good", color: "bg-lime-500" }
    if (iaq <= 150) return { label: "Moderate", color: "bg-yellow-500" }
    if (iaq <= 200) return { label: "Poor", color: "bg-orange-500" }
    return { label: "Unhealthy", color: "bg-red-500" }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-white mb-2">MycoBrain Device Manager</h1>
          <p className="text-emerald-400/80 mb-4">Development Test Page - Real-time Device Monitoring</p>
          
          {/* Service Status */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Badge variant={serviceHealth?.healthy ? "default" : "destructive"} className="text-sm">
              {serviceHealth?.healthy ? (
                <><Wifi className="w-4 h-4 mr-1" /> Service Online</>
              ) : (
                <><WifiOff className="w-4 h-4 mr-1" /> Service Offline</>
              )}
            </Badge>
            {serviceHealth && (
              <Badge variant="outline" className="text-sm text-emerald-300 border-emerald-500/50">
                v{serviceHealth.version}
              </Badge>
            )}
            <Badge variant="outline" className="text-sm text-blue-300 border-blue-500/50">
              {devices.length} Device{devices.length !== 1 ? "s" : ""} Connected
            </Badge>
            <Badge variant="outline" className="text-sm text-slate-400 border-slate-500/50">
              Updated: {lastUpdate}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchDevices}
              disabled={loading}
              className="ml-2"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-center"
          >
            <p className="text-red-300">Error: {error}</p>
          </motion.div>
        )}

        {/* No Devices State */}
        {!loading && devices.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-12 text-center"
          >
            <WifiOff className="w-16 h-16 mx-auto text-slate-500 mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No MycoBrain Devices Connected</h3>
            <p className="text-slate-400">Connect a MycoBrain ESP32-S3 device via USB to see live telemetry.</p>
            <p className="text-slate-500 text-sm mt-2">Looking for VID:303A PID:1001</p>
          </motion.div>
        )}

        {/* Device Cards */}
        <AnimatePresence mode="popLayout">
          {devices.map((device, index) => {
            const sensorData = device.sensor_data
            const iaqInfo = sensorData ? getIaqLabel(sensorData.iaq) : { label: "N/A", color: "bg-slate-500" }
            
            return (
              <motion.div
                key={device.port}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-slate-900/80 border-emerald-500/30 backdrop-blur-lg overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border-b border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Activity className="w-5 h-5 text-emerald-400" />
                          {device.port}
                          <Badge className={device.connected ? "bg-emerald-500" : "bg-red-500"}>
                            {device.connected ? "Connected" : "Disconnected"}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-emerald-300/70 font-mono text-xs mt-1">
                          {device.device_id}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        {sensorData && (
                          <>
                            <Badge variant="outline" className="text-cyan-300 border-cyan-500/50 mb-1">
                              <Cpu className="w-3 h-3 mr-1" /> FW {sensorData.firmware_version}
                            </Badge>
                            <p className="text-xs text-slate-400">
                              Uptime: {formatUptime(sensorData.uptime_seconds)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    {sensorData ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {/* Temperature */}
                        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg p-4 border border-orange-500/30">
                          <div className="flex items-center gap-2 text-orange-400 mb-2">
                            <Thermometer className="w-5 h-5" />
                            <span className="text-xs font-medium">Temperature</span>
                          </div>
                          <p className="text-2xl font-bold text-white">{sensorData.temperature.toFixed(1)}°C</p>
                        </div>

                        {/* Humidity */}
                        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg p-4 border border-blue-500/30">
                          <div className="flex items-center gap-2 text-blue-400 mb-2">
                            <Droplets className="w-5 h-5" />
                            <span className="text-xs font-medium">Humidity</span>
                          </div>
                          <p className="text-2xl font-bold text-white">{sensorData.humidity.toFixed(1)}%</p>
                        </div>

                        {/* Pressure */}
                        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg p-4 border border-purple-500/30">
                          <div className="flex items-center gap-2 text-purple-400 mb-2">
                            <Gauge className="w-5 h-5" />
                            <span className="text-xs font-medium">Pressure</span>
                          </div>
                          <p className="text-2xl font-bold text-white">{sensorData.pressure.toFixed(0)} hPa</p>
                        </div>

                        {/* IAQ */}
                        <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-lg p-4 border border-emerald-500/30">
                          <div className="flex items-center gap-2 text-emerald-400 mb-2">
                            <Wind className="w-5 h-5" />
                            <span className="text-xs font-medium">Air Quality</span>
                          </div>
                          <p className="text-2xl font-bold text-white">{sensorData.iaq}</p>
                          <Badge className={`${iaqInfo.color} mt-1 text-xs`}>{iaqInfo.label}</Badge>
                        </div>

                        {/* CO2 Equivalent */}
                        <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-lg p-4 border border-amber-500/30">
                          <div className="flex items-center gap-2 text-amber-400 mb-2">
                            <Activity className="w-5 h-5" />
                            <span className="text-xs font-medium">CO₂ Equiv</span>
                          </div>
                          <p className="text-2xl font-bold text-white">{sensorData.co2_equivalent} ppm</p>
                        </div>

                        {/* Gas Resistance */}
                        <div className="bg-gradient-to-br from-slate-500/20 to-gray-500/20 rounded-lg p-4 border border-slate-500/30">
                          <div className="flex items-center gap-2 text-slate-400 mb-2">
                            <Activity className="w-5 h-5" />
                            <span className="text-xs font-medium">Gas Resistance</span>
                          </div>
                          <p className="text-2xl font-bold text-white">{(sensorData.gas_resistance / 1000).toFixed(1)}k Ω</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <Activity className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                        <p>Waiting for telemetry data...</p>
                      </div>
                    )}

                    {/* Health Info */}
                    {sensorData?.health && (
                      <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center gap-6 text-sm text-slate-400">
                        <span>
                          <span className="text-slate-500">BME688 Sensors:</span> {sensorData.bme688_count}
                        </span>
                        <span>
                          <span className="text-slate-500">Heap:</span> {(sensorData.health.heap / 1024).toFixed(1)} KB
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-slate-500">I²C:</span>
                          <span className={sensorData.health.i2c_ok ? "text-green-400" : "text-red-400"}>
                            {sensorData.health.i2c_ok ? "OK" : "Error"}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Device Controls */}
                    <div className="mt-6 pt-4 border-t border-slate-700/50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-semibold flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-400" />
                          Device Controls
                        </h3>
                        {controlStatus && (
                          <Badge variant="outline" className="text-cyan-300 border-cyan-500/50 animate-pulse">
                            {controlStatus}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Sound Effects */}
                      <div className="mb-4">
                        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                          <Volume2 className="w-3 h-3" /> Sound Effects
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/50 text-amber-300"
                            onClick={() => sendCommand(device.port, "coin")}
                          >
                            <Music className="w-3 h-3 mr-1" /> Coin
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-green-500/10 hover:bg-green-500/20 border-green-500/50 text-green-300"
                            onClick={() => sendCommand(device.port, "1up")}
                          >
                            <Music className="w-3 h-3 mr-1" /> 1-Up
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/50 text-blue-300"
                            onClick={() => sendCommand(device.port, "power")}
                          >
                            <Music className="w-3 h-3 mr-1" /> Power
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/50 text-purple-300"
                            onClick={() => sendCommand(device.port, "morgio")}
                          >
                            <Music className="w-3 h-3 mr-1" /> Morgio
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/50 text-orange-300"
                            onClick={() => sendBuzzer(device.port, 1000, 200)}
                          >
                            <Volume2 className="w-3 h-3 mr-1" /> Beep
                          </Button>
                        </div>
                      </div>

                      {/* LED Controls */}
                      <div>
                        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" /> LED Control
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-red-500/10 hover:bg-red-500/30 border-red-500/50 text-red-300"
                            onClick={() => sendLED(device.port, "color", [255, 0, 0])}
                          >
                            <Palette className="w-3 h-3 mr-1" /> Red
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-green-500/10 hover:bg-green-500/30 border-green-500/50 text-green-300"
                            onClick={() => sendLED(device.port, "color", [0, 255, 0])}
                          >
                            <Palette className="w-3 h-3 mr-1" /> Green
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-blue-500/10 hover:bg-blue-500/30 border-blue-500/50 text-blue-300"
                            onClick={() => sendLED(device.port, "color", [0, 0, 255])}
                          >
                            <Palette className="w-3 h-3 mr-1" /> Blue
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-gradient-to-r from-red-500/20 via-green-500/20 to-blue-500/20 hover:from-red-500/40 hover:via-green-500/40 hover:to-blue-500/40 border-cyan-500/50 text-cyan-300"
                            onClick={() => sendLED(device.port, "rainbow")}
                          >
                            <Palette className="w-3 h-3 mr-1" /> Rainbow
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/50 text-slate-300"
                            onClick={() => sendLED(device.port, "off")}
                          >
                            <Lightbulb className="w-3 h-3 mr-1" /> Off
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* API Test Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-slate-300 text-lg">API Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm font-mono">
                <div className="p-3 bg-slate-800/50 rounded border border-slate-700/50">
                  <p className="text-emerald-400 mb-1">GET /api/mycobrain</p>
                  <p className="text-slate-500">List all devices and sensor data</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded border border-slate-700/50">
                  <p className="text-emerald-400 mb-1">GET /api/mycobrain/health</p>
                  <p className="text-slate-500">Service health check</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded border border-slate-700/50">
                  <p className="text-emerald-400 mb-1">GET /api/mycobrain/:port/sensors</p>
                  <p className="text-slate-500">Get specific device sensor data</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded border border-slate-700/50">
                  <p className="text-emerald-400 mb-1">POST /api/mycobrain/:port/control</p>
                  <p className="text-slate-500">Send commands to device</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
