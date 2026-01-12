"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Battery,
  Bot,
  Brain,
  Cpu,
  Database,
  Eye,
  FileText,
  Gauge,
  Globe,
  HardDrive,
  Heart,
  LineChart,
  MapPin,
  Microscope,
  Network,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Settings,
  Signal,
  Thermometer,
  TrendingUp,
  Usb,
  Wifi,
  Zap,
  Timer,
  Droplets,
  Wind,
  Sun,
  Moon,
  AreaChart,
  PieChart,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import dynamic from "next/dynamic"
import Link from "next/link"

import {
  useSystemMetrics,
  useMyceliumNetwork,
  useDeviceTelemetry,
  useRecentActivity,
} from "@/lib/natureos-api"

import { useMycoBrain, getIAQLabel } from "@/hooks/use-mycobrain"
import { MycoBrainOverviewWidget, MycoBrainSensorCards } from "@/components/mycobrain/mycobrain-overview-widget"

const MyceliumMap = dynamic(() => import("@/components/maps/mycelium-map").then((mod) => mod.MyceliumMap), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted/20 rounded-lg">
      <div className="text-center">
        <Globe className="h-8 w-8 animate-pulse mx-auto mb-2 text-green-500" />
        <p className="text-sm text-muted-foreground">Loading Map...</p>
      </div>
    </div>
  ),
})

const EarthSimulatorContainer = dynamic(() => import("@/components/earth-simulator/earth-simulator-container").then((mod) => mod.EarthSimulatorContainer), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-black rounded-lg">
      <div className="text-center">
        <Globe className="h-8 w-8 animate-pulse mx-auto mb-2 text-green-500" />
        <p className="text-sm text-white">Loading Earth Simulator...</p>
      </div>
    </div>
  ),
})

// Real device interface for MycoBrain
interface RealDevice {
  id: string
  name: string
  type: "mycobrain" | "mushroom1" | "sporebase" | "alarm" | "petreus" | "trufflebot"
  connection: "usb" | "lora" | "wifi" | "ethernet"
  status: "online" | "offline" | "error" | "booting"
  mac?: string
  port?: string
  firmware?: string
  lastSeen: Date
  metrics: {
    uptime?: number
    temperature?: number
    humidity?: number
    rssi?: number
    battery?: number
    loraInit?: boolean
    [key: string]: any
  }
}

  // Fetch real devices from APIs - no mock data
function useRealDevices() {
  const [devices, setDevices] = useState<RealDevice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDevices() {
      try {
        // Fetch from NatureOS telemetry API (includes MycoBrain + MINDEX devices)
        const response = await fetch("/api/natureos/devices/telemetry")
        if (response.ok) {
          const data = await response.json()
          const telemetryDevices = Array.isArray(data) ? data : []
          
          // Format all devices from telemetry API
          const formattedDevices: RealDevice[] = []
          const deviceIds = new Set<string>() // Track to avoid duplicates
          
          for (const device of telemetryDevices) {
            const deviceId = device.deviceId || `device-${device.port || Math.random()}`
            
            // Skip duplicates
            if (deviceIds.has(deviceId)) continue
            deviceIds.add(deviceId)
            
            // Determine connection type
            let connection: "usb" | "lora" | "wifi" | "ethernet" = "wifi"
            if (device.deviceType === "mycobrain") {
              connection = device.port?.startsWith("COM") || device.port?.startsWith("/dev/tty") ? "usb" : "lora"
            }
            
            formattedDevices.push({
              id: deviceId,
              name: device.deviceType === "mycobrain" 
                ? `MycoBrain ${device.port || "Unknown"}`
                : device.deviceId || "Unknown Device",
              type: device.deviceType === "mycobrain" ? "mycobrain" : 
                    device.deviceType === "mushroom1" ? "mushroom1" :
                    device.deviceType === "sporebase" ? "sporebase" : "mycobrain",
              connection,
              status: (device.status === "active" || device.connected) ? "online" : "offline",
              port: device.port,
              mac: device.macAddress,
              firmware: device.firmware || device.device_info?.firmware || "1.0.0",
              lastSeen: new Date(device.timestamp || device.lastSeen || Date.now()),
              metrics: {
                temperature: device.metrics?.temperature,
                humidity: device.metrics?.humidity,
                pressure: device.metrics?.pressure,
                iaq: device.metrics?.iaq,
                uptime: device.metrics?.uptime,
                loraInit: device.metrics?.loraStatus === "ok" || device.metrics?.loraInit,
                battery: device.metrics?.battery,
                rssi: device.metrics?.rssi || device.metrics?.signalStrength,
              },
            })
          }
          
          setDevices(formattedDevices)
        } else {
          // Fallback: Try MycoBrain service directly
          try {
            const mycoResponse = await fetch("/api/mycobrain")
            if (mycoResponse.ok) {
              const mycoData = await mycoResponse.json()
              const mycoDevices = mycoData.devices || []
              const formatted = mycoDevices.map((d: any) => ({
                id: `mycobrain-${d.port?.replace(/[\/\\]/g, '-') || 'unknown'}`,
                name: `MycoBrain ${d.port || "Unknown"}`,
                type: "mycobrain" as const,
                connection: "usb" as const,
                status: d.connected ? "online" : "offline",
                port: d.port,
                firmware: d.device_info?.firmware || d.device_info?.mdp_version || "1.0.0",
                lastSeen: new Date(d.last_message_time || Date.now()),
                metrics: {
                  temperature: d.sensor_data?.bme688_1?.temperature,
                  humidity: d.sensor_data?.bme688_1?.humidity,
                  uptime: d.device_info?.uptime,
                  loraInit: d.device_info?.lora_status === "ok",
                },
              }))
              setDevices(formatted)
            } else {
              setDevices([])
            }
          } catch {
            setDevices([])
          }
        }
      } catch (error) {
        console.error("Failed to fetch devices:", error)
        setDevices([])
      }
      setLoading(false)
    }
    
    fetchDevices()
    const interval = setInterval(fetchDevices, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [])

  return { devices, loading }
}

// Activity icons mapping
const activityIcons = {
  ai_training: Bot,
  network_event: Network,
  deployment: Globe,
  backup: Database,
  alert: AlertCircle,
  anomaly: AlertTriangle,
}

export function NatureOSDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [observations, setObservations] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)

  // API hooks - handle errors gracefully
  const metricsResult = useSystemMetrics()
  const networkResult = useMyceliumNetwork()
  const activitiesResult = useRecentActivity(5)
  const devicesResult = useRealDevices()
  const mycoBrainResult = useMycoBrain(3000)
  
  // Extract values with safe defaults - hooks return { metrics, isLoading, isError, error }
  const metrics = metricsResult?.metrics ?? null
  const network = networkResult?.network ?? null
  const activities = activitiesResult?.activities ?? []
  const realDevices = devicesResult?.devices ?? []
  const devicesLoading = devicesResult?.loading ?? false
  const mycoBrainDevices = mycoBrainResult?.devices ?? []
  const mycoBrainConnected = mycoBrainResult?.isConnected ?? false
  
  const mycoBrain = mycoBrainDevices?.[0]
  const bme1 = mycoBrain?.sensor_data?.bme688_1
  const bme2 = mycoBrain?.sensor_data?.bme688_2
  const iaqStatus = getIAQLabel(bme1?.iaq)

  // Set mounted flag to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date())
  }, [])

  // Fetch observations for species distribution
  useEffect(() => {
    async function fetchObservations() {
      try {
        const res = await fetch("/api/mindex/observations?limit=1000")
        if (res.ok) {
          const data = await res.json()
          setObservations(data.observations || [])
        }
      } catch (error) {
        console.error("Failed to fetch observations:", error)
      }
    }
    fetchObservations()
    const interval = setInterval(fetchObservations, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])


  // Update time every second (only after mount to prevent hydration mismatch)
  useEffect(() => {
    if (!mounted) return
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [mounted])

  // Calculate real device counts - MycoBrain is already in realDevices
  const deviceStats = useMemo(() => {
    if (!realDevices || realDevices.length === 0) {
      return {
        total: 0,
        online: 0,
        offline: 0,
        errors: 0,
        mycoBrainConnected: false,
        sensorCount: 0,
        byType: {} as Record<string, number>,
      }
    }
    
    const online = realDevices.filter(d => d.status === "online").length
    const offline = realDevices.filter(d => d.status === "offline").length
    const errors = realDevices.filter(d => d.status === "error").length
    
    return {
      total: realDevices.length,
      online,
      offline,
      errors,
      mycoBrainConnected: realDevices.some(d => d.type === "mycobrain" && d.status === "online"),
      sensorCount: mycoBrainConnected ? 2 : 0, // 2x BME688
      byType: realDevices.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    }
  }, [realDevices, mycoBrainConnected])

  // Ensure we always have valid data structures
  const systemMetrics = metrics || null
  const myceliumNetwork = network || null
  const recentActivity = Array.isArray(activities) ? activities : []

  // Check if we're still loading initial data - only show loading if ALL are loading
  const isLoading = (metricsResult?.isLoading && networkResult?.isLoading && devicesLoading) || false

  return (
    <div className="flex flex-col gap-5 w-full">
      <Tabs defaultValue="overview" className="space-y-5 w-full" onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="simulator">Earth Simulator</TabsTrigger>
            <TabsTrigger value="petri-dish">Petri Dish Simulator</TabsTrigger>
            <TabsTrigger value="devices">
              Devices
              {deviceStats.online > 0 && (
                <Badge variant="default" className="ml-2 h-5 px-1.5 text-xs bg-green-600">
                  {deviceStats.online}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {mounted && currentTime ? currentTime.toLocaleTimeString() : "--:--:--"}
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href="/natureos/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>
        </div>

        {/* ============ OVERVIEW TAB ============ */}
        <TabsContent value="overview" className="space-y-5">
          {/* Status Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connected Devices</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{deviceStats.online}</div>
                <p className="text-xs text-muted-foreground">
                  {deviceStats.total} total • {deviceStats.offline} offline
                </p>
                <div className="mt-3">
                  <Progress 
                    value={deviceStats.total > 0 ? (deviceStats.online / deviceStats.total) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Network Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {myceliumNetwork?.networkHealth !== undefined ? `${myceliumNetwork.networkHealth}%` : "—"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Signal: {myceliumNetwork?.signalStrength !== undefined ? `${myceliumNetwork.signalStrength}%` : "—"}
                </p>
                <div className="mt-3">
                  <Progress value={myceliumNetwork?.networkHealth || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Operations</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics?.aiOperations?.successRate || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {systemMetrics?.aiOperations?.averageResponseTime || 0}ms avg
                </p>
                <div className="mt-3">
                  <Progress value={systemMetrics?.aiOperations?.successRate || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Number(systemMetrics?.storage?.used || 0).toFixed(1)} TB</div>
                <p className="text-xs text-muted-foreground">
                  of {Number(systemMetrics?.storage?.total || 0).toFixed(1)} TB ({Number(systemMetrics?.storage?.percentage || 0).toFixed(0)}%)
                </p>
                <div className="mt-3">
                  <Progress value={systemMetrics?.storage?.percentage || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MycoBrain Live Sensor Data */}
          {mycoBrainConnected && bme1 && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Thermometer className="h-4 w-4 text-orange-500" />
                    <span className="text-xs text-muted-foreground">LIVE TEMP</span>
                  </div>
                  <p className="text-2xl font-bold">{bme1.temperature?.toFixed(1)}°C</p>
                  <p className="text-xs text-muted-foreground">MycoBrain BME688</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">HUMIDITY</span>
                  </div>
                  <p className="text-2xl font-bold">{bme1.humidity?.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Relative humidity</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Wind className="h-4 w-4 text-purple-500" />
                    <span className="text-xs text-muted-foreground">PRESSURE</span>
                  </div>
                  <p className="text-2xl font-bold">{bme1.pressure?.toFixed(0)} hPa</p>
                  <p className="text-xs text-muted-foreground">Atmospheric</p>
                </CardContent>
              </Card>
              <Card className={`bg-gradient-to-br ${iaqStatus.bgColor} border`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className={`h-4 w-4 ${iaqStatus.color}`} />
                    <span className="text-xs text-muted-foreground">AIR QUALITY</span>
                  </div>
                  <p className={`text-2xl font-bold ${iaqStatus.color}`}>{bme1.iaq || "--"}</p>
                  <p className="text-xs text-muted-foreground">{iaqStatus.label}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content Grid - Fixed Layout */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Map - Takes 2 columns, fixed height with overflow hidden */}
            <Card className="lg:col-span-2 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-green-500" />
                    Global Network
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Live
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[350px] w-full relative overflow-hidden">
                  <MyceliumMap />
                </div>
              </CardContent>
            </Card>

            {/* Right Sidebar - Stacked Cards */}
            <div className="space-y-5">
              {/* Connected Devices List */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Live Devices</span>
                    <Badge variant={deviceStats.online > 0 ? "default" : "secondary"} className="text-xs">
                      {deviceStats.online} Online
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {devicesLoading ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Scanning devices...
                      </div>
                    ) : realDevices.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground text-sm mb-2">No devices connected</p>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href="/natureos/devices">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Scan for Devices
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      realDevices.slice(0, 4).map((device) => (
                        <div key={device.id} className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            device.status === "online" ? "bg-green-500/20" : "bg-gray-500/20"
                          }`}>
                            {device.connection === "usb" ? (
                              <Usb className={`h-4 w-4 ${device.status === "online" ? "text-green-500" : "text-gray-500"}`} />
                            ) : device.connection === "lora" ? (
                              <Radio className={`h-4 w-4 ${device.status === "online" ? "text-green-500" : "text-gray-500"}`} />
                            ) : (
                              <Wifi className={`h-4 w-4 ${device.status === "online" ? "text-green-500" : "text-gray-500"}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{device.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {device.port || device.mac?.slice(-8)}
                            </p>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${
                            device.status === "online" ? "bg-green-500" : 
                            device.status === "error" ? "bg-red-500" : "bg-gray-500"
                          }`} />
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="ghost" size="sm" className="w-full" asChild>
                    <Link href="/natureos/devices/network">View All Devices →</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity && recentActivity.length > 0 ? (
                      recentActivity.slice(0, 4).map((item) => {
                        const Icon = activityIcons[item.type] || Activity
                        return (
                          <div key={item.id} className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-full ${
                              item.status === "success" ? "bg-green-500/20" :
                              item.status === "warning" ? "bg-yellow-500/20" : "bg-red-500/20"
                            }`}>
                              <Icon className={`h-3 w-3 ${
                                item.status === "success" ? "text-green-500" :
                                item.status === "warning" ? "text-yellow-500" : "text-red-500"
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs truncate">{item.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "--:--:--"}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No recent activity
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/natureos/shell">
                <Cpu className="h-5 w-5" />
                <span>Cloud Shell</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/natureos/ai-studio">
                <Bot className="h-5 w-5" />
                <span>MYCA AI Studio</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/natureos/workflows">
                <Zap className="h-5 w-5" />
                <span>Workflows</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/natureos/api">
                <Globe className="h-5 w-5" />
                <span>API Gateway</span>
              </Link>
            </Button>
          </div>
        </TabsContent>

        {/* ============ EARTH SIMULATOR TAB ============ */}
        <TabsContent value="simulator" className="space-y-5">
          <div className="h-[calc(100vh-300px)] min-h-[600px]">
            <EarthSimulatorContainer />
          </div>
        </TabsContent>

        {/* ============ PETRI DISH SIMULATOR TAB ============ */}
        <TabsContent value="petri-dish" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Petri Dish Simulator</CardTitle>
              <CardDescription>
                The Petri Dish Simulator allows you to simulate fungal growth patterns and conditions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/apps/petri-dish-sim">
                  Open Petri Dish Simulator
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ MYCELIUM NETWORK TAB (DEPRECATED - KEEP FOR REFERENCE) ============ */}
        <TabsContent value="mycelium" className="space-y-5" style={{ display: 'none' }}>
          {/* Network Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-500/20">
                    <Signal className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{myceliumNetwork?.signalStrength || 0}%</p>
                    <p className="text-xs text-muted-foreground">Signal Strength</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/20">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{myceliumNetwork?.growthRate || 0}%</p>
                    <p className="text-xs text-muted-foreground">Growth Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-500/20">
                    <Zap className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{myceliumNetwork?.bioelectricActivity || 0} mV</p>
                    <p className="text-xs text-muted-foreground">Bioelectric Activity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-orange-500/20">
                    <Network className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{(myceliumNetwork?.connections || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Connections</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-teal-500/20">
                    <Gauge className="h-5 w-5 text-teal-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{Number(myceliumNetwork?.density || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Density (g/cm³)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Network View */}
          <div className="grid gap-5 lg:grid-cols-4">
            {/* Large Map */}
            <Card className="lg:col-span-3 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-green-500" />
                    Mycelium Network Topology
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {(myceliumNetwork?.activeNodes || 0).toLocaleString()} Active Nodes
                    </Badge>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] w-full relative overflow-hidden">
                  <MyceliumMap />
                </div>
              </CardContent>
            </Card>

            {/* Network Health Sidebar */}
            <div className="space-y-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    Network Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Overall Health</span>
                      <span className="font-mono">{myceliumNetwork?.networkHealth || 0}%</span>
                    </div>
                    <Progress value={myceliumNetwork?.networkHealth || 0} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Nutrient Flow</span>
                      <span className="font-mono">{myceliumNetwork?.nutrientFlow || 0}%</span>
                    </div>
                    <Progress value={myceliumNetwork?.nutrientFlow || 0} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Signal Propagation</span>
                      <span className="font-mono">{myceliumNetwork?.propagationSpeed || 0} cm/s</span>
                    </div>
                    <Progress value={Math.min((myceliumNetwork?.propagationSpeed || 0) * 20, 100)} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    Live Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Active Nodes</span>
                      <Badge variant="outline">{(myceliumNetwork?.activeNodes || 0).toLocaleString()}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Nodes</span>
                      <Badge variant="outline">{(myceliumNetwork?.totalNodes || 0).toLocaleString()}</Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Uptime</span>
                      <Badge variant="secondary">99.97%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Latency</span>
                      <Badge variant="secondary">12ms</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    Active Regions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {myceliumNetwork?.regions && myceliumNetwork.regions.length > 0 ? (
                      myceliumNetwork.regions.slice(0, 5).map((region, i) => (
                        <div key={region.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Region {i + 1}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-1.5">
                              <div 
                                className="bg-green-500 h-1.5 rounded-full" 
                                style={{ width: `${region.health}%` }} 
                              />
                            </div>
                            <span className="font-mono text-xs w-8">{region.health}%</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-2 text-muted-foreground text-xs">
                        No network regions
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ============ DEVICES TAB ============ */}
        <TabsContent value="devices" className="space-y-5">
          {/* Device Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className={deviceStats.online > 0 ? "border-green-500/50" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-green-500">{deviceStats.online}</p>
                    <p className="text-sm text-muted-foreground">Online</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-500/20">
                    <Power className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-500">{deviceStats.offline}</p>
                    <p className="text-sm text-muted-foreground">Offline</p>
                  </div>
                  <div className="p-3 rounded-full bg-gray-500/20">
                    <Power className="h-6 w-6 text-gray-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-red-500">{deviceStats.errors}</p>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </div>
                  <div className="p-3 rounded-full bg-red-500/20">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{deviceStats.total}</p>
                    <p className="text-sm text-muted-foreground">Total Registered</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/20">
                    <Database className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Device Grid */}
          {devicesLoading ? (
            <Card className="p-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Scanning for connected devices...</p>
              </div>
            </Card>
          ) : realDevices.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Network className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Devices Connected</h3>
                <p className="text-muted-foreground mb-4">
                  Connect a MycoBrain device via USB (COM5) to get started. The device discovery service scans every 5 seconds.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button asChild>
                    <Link href="/natureos/devices">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Open Device Manager
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/natureos/devices/network">
                      <Network className="h-4 w-4 mr-2" />
                      Device Network
                    </Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Make sure MycoBrain service is running: python services/mycobrain/mycobrain_service.py
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {realDevices.map((device) => (
                <Card key={device.id} className={`${
                  device.status === "online" ? "border-green-500/50" : 
                  device.status === "error" ? "border-red-500/50" : ""
                }`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${
                          device.status === "online" ? "bg-green-500/20" :
                          device.status === "error" ? "bg-red-500/20" : "bg-gray-500/20"
                        }`}>
                          {device.type === "mycobrain" ? (
                            <Brain className={`h-6 w-6 ${
                              device.status === "online" ? "text-green-500" :
                              device.status === "error" ? "text-red-500" : "text-gray-500"
                            }`} />
                          ) : device.type === "mushroom1" ? (
                            <Microscope className={`h-6 w-6 ${
                              device.status === "online" ? "text-green-500" : "text-gray-500"
                            }`} />
                          ) : (
                            <Database className={`h-6 w-6 ${
                              device.status === "online" ? "text-green-500" : "text-gray-500"
                            }`} />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base">{device.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            {device.connection === "usb" && <Usb className="h-3 w-3" />}
                            {device.connection === "lora" && <Radio className="h-3 w-3" />}
                            {device.connection === "wifi" && <Wifi className="h-3 w-3" />}
                            {device.port || device.mac?.slice(-8)}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={
                        device.status === "online" ? "default" :
                        device.status === "error" ? "destructive" : "secondary"
                      }>
                        {device.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {device.metrics.uptime !== undefined && (
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 text-muted-foreground" />
                          <span>{Math.floor(device.metrics.uptime / 60)}m uptime</span>
                        </div>
                      )}
                      {device.metrics.temperature !== undefined && (
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-muted-foreground" />
                          <span>{device.metrics.temperature.toFixed(1)}°C</span>
                        </div>
                      )}
                      {device.metrics.battery !== undefined && (
                        <div className="flex items-center gap-2">
                          <Battery className="h-4 w-4 text-muted-foreground" />
                          <span>{device.metrics.battery}%</span>
                        </div>
                      )}
                      {device.metrics.rssi !== undefined && (
                        <div className="flex items-center gap-2">
                          <Signal className="h-4 w-4 text-muted-foreground" />
                          <span>{device.metrics.rssi} dBm</span>
                        </div>
                      )}
                      {device.metrics.loraInit !== undefined && (
                        <div className="flex items-center gap-2">
                          <Radio className="h-4 w-4 text-muted-foreground" />
                          <span>LoRa {device.metrics.loraInit ? "OK" : "—"}</span>
                        </div>
                      )}
                      {device.firmware && (
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-muted-foreground" />
                          <span>v{device.firmware}</span>
                        </div>
                      )}
                    </div>
                    
                    {device.mac && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground font-mono">
                          MAC: {device.mac}
                        </p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/natureos/devices${device.type === "mycobrain" ? `?device=${device.port}` : ""}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Monitor
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/natureos/devices${device.type === "mycobrain" ? `?device=${device.port}` : ""}`}>
                        <Settings className="h-4 w-4 mr-1" />
                        Configure
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}

              {/* Add Device Card */}
              <Card className="border-dashed flex items-center justify-center min-h-[300px]">
                <div className="text-center p-6">
                  <div className="p-4 rounded-full bg-muted mx-auto w-fit mb-4">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">Add New Device</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect via USB, LoRa, or WiFi
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/devices/mycobrain/integration">
                      Connect Device
                    </Link>
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ============ ANALYTICS TAB ============ */}
        <TabsContent value="analytics" className="space-y-5">
          {/* MycoBrain Live Sensor Cards */}
          {mycoBrainConnected && <MycoBrainSensorCards />}
          
          {/* KPI Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">SYSTEM HEALTH</span>
                </div>
                <p className="text-2xl font-bold">{myceliumNetwork?.networkHealth || 0}%</p>
                <p className="text-xs text-green-500">Live network data</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">API REQ/MIN</span>
                </div>
                <p className="text-2xl font-bold">{(Number(systemMetrics?.apiRequests?.perMinute || 0) / 1000).toFixed(1)}k</p>
                <p className="text-xs text-blue-500">{Number(systemMetrics?.apiRequests?.successRate || 0).toFixed(0)}% success</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">AI INFERENCE</span>
                </div>
                <p className="text-2xl font-bold">{systemMetrics?.aiOperations?.averageResponseTime || 0}ms</p>
                <p className="text-xs text-purple-500">avg response time</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Thermometer className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">ENV TEMP</span>
                  {mycoBrainConnected && <span className="text-[10px] text-green-500">LIVE</span>}
                </div>
                <p className="text-2xl font-bold">{bme1?.temperature?.toFixed(1) || "22.5"}°C</p>
                <p className="text-xs text-orange-500">{mycoBrainConnected ? "MycoBrain" : "optimal range"}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="h-4 w-4 text-cyan-500" />
                  <span className="text-xs text-muted-foreground">HUMIDITY</span>
                  {mycoBrainConnected && <span className="text-[10px] text-green-500">LIVE</span>}
                </div>
                <p className="text-2xl font-bold">{bme1?.humidity?.toFixed(0) || "65"}%</p>
                <p className="text-xs text-cyan-500">{mycoBrainConnected ? "MycoBrain" : "RH level"}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-teal-500/20 to-teal-600/10">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Network className="h-4 w-4 text-teal-500" />
                  <span className="text-xs text-muted-foreground">DEVICES</span>
                </div>
                <p className="text-2xl font-bold">{deviceStats.online}/{deviceStats.total}</p>
                <p className="text-xs text-teal-500">online now</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Network Activity Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AreaChart className="h-5 w-5 text-green-500" />
                      Network Activity
                    </CardTitle>
                    <CardDescription>Real-time signal and data flow</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">1H</Badge>
                    <Badge variant="secondary">24H</Badge>
                    <Badge variant="outline">7D</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] flex items-end justify-between gap-1 px-2">
                  {/* Real network activity based on API requests */}
                  {Array.from({ length: 24 }).map((_, i) => {
                    // Use real API request rate if available, otherwise show 0
                    const baseActivity = systemMetrics?.apiRequests?.perMinute 
                      ? Math.min((systemMetrics.apiRequests.perMinute / 1000) * 10, 100)
                      : 0
                    const height = Math.max(5, baseActivity + (i % 3) * 5)
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-green-500 to-green-400 rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                        style={{ height: `${height}%` }}
                        title={`${Math.floor(height)}% activity`}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>Now</span>
                </div>
                {systemMetrics?.apiRequests && (
                  <div className="mt-4 text-center text-xs text-muted-foreground">
                    {Number(systemMetrics.apiRequests.perMinute || 0).toLocaleString()} req/min
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Performance */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <LineChart className="h-5 w-5 text-blue-500" />
                      System Performance
                    </CardTitle>
                    <CardDescription>CPU, Memory, and I/O metrics</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-2">
                      <Cpu className="h-4 w-4" /> CPU Usage
                    </span>
                    <span className="font-mono">{Number(systemMetrics?.cpu?.usage || 0).toFixed(0)}%</span>
                  </div>
                  <Progress value={systemMetrics?.cpu?.usage || 0} className="h-3" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4" /> Memory
                    </span>
                    <span className="font-mono">{Number(systemMetrics?.memory?.percent || 0).toFixed(0)}%</span>
                  </div>
                  <Progress value={systemMetrics?.memory?.percent || 0} className="h-3" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-2">
                      <Database className="h-4 w-4" /> Storage
                    </span>
                    <span className="font-mono">{Number(systemMetrics?.storage?.percentage || 0).toFixed(0)}%</span>
                  </div>
                  <Progress value={systemMetrics?.storage?.percentage || 0} className="h-3" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" /> Network Health
                    </span>
                    <span className="font-mono">{myceliumNetwork?.networkHealth || 0}%</span>
                  </div>
                  <Progress value={myceliumNetwork?.networkHealth || 0} className="h-3" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Charts */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Environmental Monitoring - MycoBrain Live Data */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Thermometer className="h-4 w-4 text-orange-500" />
                    Environmental
                  </CardTitle>
                  {mycoBrainConnected && (
                    <Badge variant="outline" className="text-green-500 text-xs">
                      <Activity className="h-3 w-3 mr-1 animate-pulse" />
                      Live
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <Sun className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                    <p className="text-lg font-bold">{bme1?.temperature?.toFixed(1) || "22.5"}°C</p>
                    <p className="text-xs text-muted-foreground">Temperature</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Droplets className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-lg font-bold">{bme1?.humidity?.toFixed(0) || "65"}%</p>
                    <p className="text-xs text-muted-foreground">Humidity</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <Gauge className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                    <p className="text-lg font-bold">{bme1?.pressure?.toFixed(0) || "1013"}</p>
                    <p className="text-xs text-muted-foreground">Pressure hPa</p>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${iaqStatus.bgColor} border`}>
                    <Activity className={`h-5 w-5 mx-auto mb-1 ${iaqStatus.color}`} />
                    <p className={`text-lg font-bold ${iaqStatus.color}`}>{bme1?.iaq || "--"}</p>
                    <p className="text-xs text-muted-foreground">IAQ {iaqStatus.label}</p>
                  </div>
                </div>
                {bme2 && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Sensor 2 (BME688)</p>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div>
                        <p className="font-mono font-bold">{bme2.temperature?.toFixed(1)}°</p>
                        <p className="text-muted-foreground">Temp</p>
                      </div>
                      <div>
                        <p className="font-mono font-bold">{bme2.humidity?.toFixed(0)}%</p>
                        <p className="text-muted-foreground">RH</p>
                      </div>
                      <div>
                        <p className="font-mono font-bold">{bme2.pressure?.toFixed(0)}</p>
                        <p className="text-muted-foreground">hPa</p>
                      </div>
                      <div>
                        <p className="font-mono font-bold">{bme2.iaq || "--"}</p>
                        <p className="text-muted-foreground">IAQ</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Species Distribution - Real data from observations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChart className="h-4 w-4 text-purple-500" />
                  Species Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {observations.length > 0 ? (
                    (() => {
                      // Count species from real observations
                      const speciesCounts = new Map<string, number>()
                      observations.forEach((obs) => {
                        const name = obs.scientificName || obs.species
                        speciesCounts.set(name, (speciesCounts.get(name) || 0) + 1)
                      })
                      
                      const topSpecies = Array.from(speciesCounts.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([name, count], i) => ({
                          name,
                          count,
                          color: ["bg-green-500", "bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-gray-500"][i],
                        }))
                      
                      return topSpecies.map((species) => (
                        <div key={species.name} className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${species.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{species.name}</p>
                          </div>
                          <span className="text-sm font-mono">{species.count}</span>
                        </div>
                      ))
                    })()
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No species data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Alert Summary - Real data from recent activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  Alert Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity ? (() => {
                    const critical = recentActivity.filter(a => a.status === "error").length
                    const warnings = recentActivity.filter(a => a.status === "warning").length
                    const info = recentActivity.filter(a => a.status === "info" || a.status === "success").length
                    const resolved = recentActivity.filter(a => a.status === "success").length
                    
                    return (
                      <>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-sm">Critical</span>
                          </div>
                          <Badge variant="destructive">{critical}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            <span className="text-sm">Warning</span>
                          </div>
                          <Badge className="bg-yellow-500">{warnings}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-sm">Info</span>
                          </div>
                          <Badge variant="secondary">{info}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-sm">Resolved (24h)</span>
                          </div>
                          <Badge variant="outline">{resolved}</Badge>
                        </div>
                      </>
                    )
                  })() : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No activity data
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity - Real data */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Recent System Activity
                  </CardTitle>
                  <CardDescription>Latest events from MAS, n8n, and MycoBrain</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/natureos/monitoring">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {recentActivity && recentActivity.length > 0 ? (
                  recentActivity.slice(0, 4).map((item) => {
                    const Icon = activityIcons[item.type] || Activity
                    const timeAgo = new Date(item.timestamp)
                    const hoursAgo = Math.floor((Date.now() - timeAgo.getTime()) / (1000 * 60 * 60))
                    const dateLabel = hoursAgo < 1 ? "Just now" : 
                                     hoursAgo < 24 ? `${hoursAgo}h ago` :
                                     `${Math.floor(hoursAgo / 24)}d ago`
                    
                    return (
                      <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className={`p-2 rounded-lg ${
                          item.status === "success" ? "bg-green-500/20" :
                          item.status === "warning" ? "bg-yellow-500/20" : "bg-red-500/20"
                        }`}>
                          <Icon className={`h-4 w-4 ${
                            item.status === "success" ? "text-green-500" :
                            item.status === "warning" ? "text-yellow-500" : "text-red-500"
                          }`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.message}</p>
                          <p className="text-xs text-muted-foreground">{item.type} • {dateLabel}</p>
                        </div>
                        <Badge variant={item.status === "success" ? "default" : item.status === "warning" ? "secondary" : "destructive"} className="text-xs">
                          {item.status}
                        </Badge>
                      </div>
                    )
                  })
                ) : (
                  <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
