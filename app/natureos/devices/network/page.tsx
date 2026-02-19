"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Network, Usb, Radio, Wifi, Cpu, AlertCircle, CheckCircle, ArrowLeft, Server, Bluetooth, Satellite, Cable, CircleDot, ExternalLink, Settings, Volume2, Lightbulb, Thermometer } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface DeviceInfo {
  deviceId: string
  deviceType: string
  port?: string
  status: "online" | "offline" | "error"
  connected: boolean
  discovered: boolean
  registered: boolean
  verified?: boolean
  is_mycobrain?: boolean
  source: string
  connectionType: "serial" | "lora" | "wifi" | "bluetooth" | "unknown"
  lastSeen?: string
  description?: string
  hwid?: string
  // Device identity fields
  device_name?: string
  device_role?: string  // mushroom1, sporebase, hyphae1, alarm, gateway, mycodrone, standalone
  device_display_name?: string | null
  display_name?: string  // Pre-computed display name with fallbacks
  device_info?: {
    side?: string
    mdp_version?: number
    bme688_count?: number
  }
}

/**
 * Get the best display name for a device with fallback chain
 */
function getDeviceDisplayName(device: DeviceInfo): string {
  return device.display_name 
    || device.device_display_name 
    || device.device_name 
    || formatDeviceRole(device.device_role)
    || device.deviceId
}

/**
 * Format device role for display
 */
function formatDeviceRole(role?: string): string {
  if (!role) return "MycoBrain"
  const roleMap: Record<string, string> = {
    mushroom1: "Mushroom 1",
    sporebase: "SporeBase",
    hyphae1: "Hyphae 1",
    alarm: "Mycosoft Alarm",
    gateway: "Gateway",
    mycodrone: "MycoDrone",
    standalone: "MycoBrain",
  }
  return roleMap[role.toLowerCase()] || role
}

export default function DeviceNetworkPage() {
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<"checking" | "online" | "offline">("checking")
  const [discoverHint, setDiscoverHint] = useState<string | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [quickAction, setQuickAction] = useState<string | null>(null)
  const router = useRouter()

  const fetchDevices = async () => {
    setDiscoverHint(null)
    try {
      // Fetch from both local discover and MAS network registry in parallel
      const [discoverRes, networkRes] = await Promise.allSettled([
        fetch("/api/devices/discover", { signal: AbortSignal.timeout(15000) }),
        fetch("/api/devices/network", { signal: AbortSignal.timeout(20000) }),
      ])

      const allDevices: DeviceInfo[] = []
      const seenDeviceIds = new Set<string>()

      // Process local discover results
      if (discoverRes.status === "fulfilled" && discoverRes.value.ok) {
        const discoverData = await discoverRes.value.json()
        console.log("[fetchDevices] Discover API returned", discoverData.devices?.length || 0, "devices")
        setDiscoverHint(discoverData.hint ?? null)
        for (const device of discoverData.devices || []) {
          if (!seenDeviceIds.has(device.deviceId)) {
            seenDeviceIds.add(device.deviceId)
            allDevices.push({
              ...device,
              source: device.source || "local",
            })
          }
        }
      } else {
        const err = discoverRes.status === "rejected" ? discoverRes.reason : discoverRes.value
        const msg = err instanceof Error ? err.message : (err && typeof err === "object" && "statusText" in err) ? (err as Response).statusText : "Discover unavailable"
        console.warn("[fetchDevices] Discover unavailable:", msg)
      }

      // Process MAS network registry results (these take priority for matching IDs)
      if (networkRes.status === "fulfilled" && networkRes.value.ok) {
        const networkData = await networkRes.value.json()
        console.log("[fetchDevices] Network API returned", networkData.devices?.length || 0, "devices from", networkData.source)
        for (const device of networkData.devices || []) {
          const deviceId = device.device_id || device.id
          if (seenDeviceIds.has(deviceId)) {
            // Update existing device with network data
            const idx = allDevices.findIndex(d => d.deviceId === deviceId)
            if (idx >= 0) {
              allDevices[idx] = {
                ...allDevices[idx],
                ...device,
                deviceId: deviceId,
                status: device.status || allDevices[idx].status,
                source: "MAS-Registry",
                registered: true,
              }
            }
          } else {
            // Add new network device
            seenDeviceIds.add(deviceId)
            allDevices.push({
              deviceId: deviceId,
              deviceType: device.board_type || "mycobrain",
              port: device.extra?.port_name,
              status: device.status === "online" ? "online" : "offline",
              connected: device.status === "online",
              discovered: true,
              registered: true,
              is_mycobrain: true,
              source: "MAS-Registry",
              connectionType: device.connection_type === "lan" ? "wifi" : device.connection_type || "unknown",
              lastSeen: device.last_seen,
              device_name: device.device_name || device.name,
              device_role: device.device_role,
              device_display_name: device.device_display_name,
              display_name: device.display_name,
              hwid: device.host ? `${device.host}:${device.port}` : undefined,
              device_info: {
                side: device.extra?.side,
                mdp_version: device.extra?.mdp_version,
              },
            })
          }
        }
      } else {
        const err = networkRes.status === "rejected" ? networkRes.reason : networkRes.value
        const msg = err instanceof Error ? err.message : (err && typeof err === "object" && "statusText" in err) ? (err as Response).statusText : "Network registry unavailable"
        console.warn("[fetchDevices] Network registry unavailable:", msg)
      }

      console.log("[fetchDevices] Total devices after merge:", allDevices.length)
      setDevices(allDevices)
    } catch (error) {
      console.error("Failed to fetch devices:", error)
      setDevices([])
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async () => {
    setScanning(true)
    try {
      // First try to connect to COM5 (USB-C MycoBrain)
      try {
        const connectRes = await fetch("/api/mycobrain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "connect", port: "COM5" }),
          signal: AbortSignal.timeout(15000), // 15 second timeout
        })
        
        if (!connectRes.ok) {
          const errorData = await connectRes.json().catch(() => ({}))
          if (errorData.error?.includes("locked") || errorData.error?.includes("in use")) {
            alert("COM5 is locked by another application. Please close the debugging agent, Arduino IDE, or serial monitor and try again.")
            return
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          alert("Connection to COM5 timed out. The port may be locked or the device not responding.")
          return
        }
        console.error("Connection error:", error)
      }
      
      // Refresh device list after connection attempt
      await fetchDevices()
    } catch (error) {
      console.error("Scan failed:", error)
    } finally {
      setScanning(false)
    }
  }

  // Check MycoBrain service status
  useEffect(() => {
    const checkService = async () => {
      try {
        const res = await fetch("/api/mycobrain", {
          signal: AbortSignal.timeout(2000),
        })
        const data = await res.json()
        const isOnline = !data.error || data.error !== "MycoBrain service not running"
        setServiceStatus(isOnline ? "online" : "offline")
      } catch {
        setServiceStatus("offline")
      }
    }
    checkService()
    const interval = setInterval(checkService, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 15000) // Reduced from 5s to 15s to avoid rate limiting
    return () => clearInterval(interval)
  }, [])

  // Filter to only show verified MycoBrain devices
  const verifiedDevices = devices.filter(d => 
    d.verified === true || 
    d.is_mycobrain === true || 
    d.deviceType === "mycobrain" ||
    d.device_info?.side !== undefined
  )
  const onlineDevices = verifiedDevices.filter(d => d.status === "online")
  const offlineDevices = verifiedDevices.filter(d => d.status === "offline")
  
  // Categorize by connection type
  const serialDevices = verifiedDevices.filter(d => {
    const port = typeof d.port === "string" ? d.port : String(d.port ?? "")
    return d.connectionType === "serial" || port.startsWith("COM") || port.startsWith("/dev")
  })
  const loraDevices = verifiedDevices.filter(d => d.connectionType === "lora")
  const wifiDevices = verifiedDevices.filter(d => d.connectionType === "wifi")
  
  // Gateway device (if any)
  const gatewayDevice = serialDevices.find(d => d.status === "online")

  // Handle device click to open popup
  const handleDeviceClick = (device: DeviceInfo) => {
    setSelectedDevice(device)
    setDialogOpen(true)
  }

  // Quick action handlers
  const handleQuickAction = async (action: string) => {
    if (!selectedDevice?.port) return
    setQuickAction(action)
    
    try {
      const port = selectedDevice.port
      let endpoint = ""
      let body = {}
      
      switch (action) {
        case "beep":
          endpoint = `/api/mycobrain/${port}/buzzer`
          body = { action: "preset", preset: "coin" }
          break
        case "led_green":
          endpoint = `/api/mycobrain/${port}/led`
          body = { action: "rgb", r: 0, g: 255, b: 0 }
          break
        case "led_red":
          endpoint = `/api/mycobrain/${port}/led`
          body = { action: "rgb", r: 255, g: 0, b: 0 }
          break
        case "led_off":
          endpoint = `/api/mycobrain/${port}/led`
          body = { action: "off" }
          break
      }
      
      if (endpoint) {
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(5000),
        })
      }
    } catch (error) {
      console.error("Quick action failed:", error)
    } finally {
      setQuickAction(null)
    }
  }

  // Navigate to device manager
  const openDeviceManager = () => {
    if (selectedDevice?.port) {
      router.push(`/natureos/devices?device=${selectedDevice.port}`)
    }
  }

  return (
    <DashboardShell>
      {/* Back Navigation */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/natureos">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            NatureOS Dashboard
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <Link href="/natureos/devices">
          <Button variant="ghost" size="sm" className="gap-2">
            Device Manager
          </Button>
        </Link>
      </div>
      
      <DashboardHeader
        heading="Device Network Topology"
        text="Discover and manage all MycoBrain devices across serial, LoRa, and mesh networks"
      />

      <div className="space-y-6">
        {/* Service Status */}
        <Card className={serviceStatus === "online" ? "border-green-500/50 bg-green-500/5" : serviceStatus === "offline" ? "border-red-500/50 bg-red-500/5" : "border-yellow-500/50 bg-yellow-500/5"}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {serviceStatus === "online" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : serviceStatus === "offline" ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />
                )}
                <div>
                  <div className="font-semibold">
                    MycoBrain Service (Python)
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {serviceStatus === "online" 
                      ? "Service is running on port 8003" 
                      : serviceStatus === "offline"
                      ? "Service is not running - Start: python services/mycobrain/mycobrain_service_standalone.py"
                      : "Checking service status..."}
                  </div>
                </div>
              </div>
              <Badge variant={serviceStatus === "online" ? "default" : "destructive"}>
                {serviceStatus === "online" ? "Online" : serviceStatus === "offline" ? "Offline" : "Checking"}
              </Badge>
            </div>
            {serviceStatus === "offline" && (
              <div className="mt-4 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    // Trigger service start via API if available
                    try {
                      await fetch("/api/services/start?service=mycobrain", { method: "POST" })
                    } catch {
                      // Service start API might not exist, that's OK
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Start Service
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Or run manually: <code className="bg-muted px-1 rounded">python services/mycobrain/mycobrain_service_standalone.py</code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">MycoBrain Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{verifiedDevices.length}</div>
              {devices.length > verifiedDevices.length && (
                <div className="text-xs text-muted-foreground">
                  {devices.length - verifiedDevices.length} other ports filtered
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Online</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{onlineDevices.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Offline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{offlineDevices.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleScan} disabled={scanning} size="sm" className="w-full">
                <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
                {scanning ? "Scanning..." : "Scan Now"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Network Topology Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Network Topology
            </CardTitle>
            <CardDescription>
              Visual map of MycoBrain device connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative p-8 bg-muted/30 rounded-lg min-h-[300px]">
              {/* Central Gateway/Serial Hub */}
              <div className="flex flex-col items-center">
                {/* Gateway Device */}
                <div className="flex flex-col items-center mb-8">
                  <div className={`p-4 rounded-xl border-2 ${gatewayDevice ? "bg-green-500/20 border-green-500" : "bg-muted border-dashed"}`}>
                    <Server className={`h-10 w-10 ${gatewayDevice ? "text-green-500" : "text-muted-foreground"}`} />
                  </div>
                  <div className="mt-2 text-center">
                    <div className="font-semibold">
                      {gatewayDevice ? getDeviceDisplayName(gatewayDevice) : "Gateway"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {gatewayDevice ? (
                        <span className="flex items-center gap-1 justify-center">
                          <Cable className="h-3 w-3" />
                          {gatewayDevice.port}
                        </span>
                      ) : (
                        "No gateway connected"
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Connection Lines */}
                {(serialDevices.length > 0 || loraDevices.length > 0 || wifiDevices.length > 0) && (
                  <div className="w-px h-8 bg-gradient-to-b from-green-500 to-transparent" />
                )}
                
                {/* Connection Type Branches */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-3xl">
                  {/* Serial Devices */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-4">
                      <Cable className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Serial/USB</span>
                      <Badge variant="outline" className="text-xs">{serialDevices.length}</Badge>
                    </div>
                    <div className="space-y-2 w-full">
                      {serialDevices.map((device) => (
                        <div 
                          key={device.deviceId} 
                          onClick={() => handleDeviceClick(device)}
                          className="block cursor-pointer"
                        >
                          <div className={`p-3 rounded-lg border text-center transition-colors hover:bg-accent hover:scale-105 transition-transform ${
                            device.status === "online" ? "border-green-500/50 bg-green-500/5" : "border-muted"
                          }`}>
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <Cpu className={`h-4 w-4 ${device.status === "online" ? "text-green-500" : "text-muted-foreground"}`} />
                              <span className="text-sm font-medium">{getDeviceDisplayName(device)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {device.port} {device.device_info?.side ? `• Side ${device.device_info.side}` : ""}
                            </div>
                            {device.status === "online" && (
                              <div className="w-2 h-2 rounded-full bg-green-500 mx-auto mt-1 animate-pulse" />
                            )}
                          </div>
                        </div>
                      ))}
                      {serialDevices.length === 0 && (
                        <div className="p-3 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                          No serial devices
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* LoRa Mesh Devices */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-4">
                      <Radio className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">LoRa Mesh</span>
                      <Badge variant="outline" className="text-xs">{loraDevices.length}</Badge>
                    </div>
                    <div className="space-y-2 w-full">
                      {loraDevices.map((device) => (
                        <div 
                          key={device.deviceId}
                          className={`p-3 rounded-lg border text-center ${
                            device.status === "online" ? "border-amber-500/50 bg-amber-500/5" : "border-muted"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <Satellite className={`h-4 w-4 ${device.status === "online" ? "text-amber-500" : "text-muted-foreground"}`} />
                            <span className="text-sm font-medium">{getDeviceDisplayName(device)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDeviceRole(device.device_role)} • LoRa
                          </div>
                        </div>
                      ))}
                      {loraDevices.length === 0 && (
                        <div className="p-3 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                          <Radio className="h-4 w-4 mx-auto mb-1 opacity-50" />
                          No LoRa nodes
                          <div className="text-xs mt-1">Connect gateway to discover</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* WiFi/Bluetooth Devices */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-4">
                      <Wifi className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">WiFi/BLE</span>
                      <Badge variant="outline" className="text-xs">{wifiDevices.length}</Badge>
                    </div>
                    <div className="space-y-2 w-full">
                      {wifiDevices.map((device) => (
                        <div 
                          key={device.deviceId}
                          className={`p-3 rounded-lg border text-center ${
                            device.status === "online" ? "border-purple-500/50 bg-purple-500/5" : "border-muted"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <Wifi className={`h-4 w-4 ${device.status === "online" ? "text-purple-500" : "text-muted-foreground"}`} />
                            <span className="text-sm font-medium">{getDeviceDisplayName(device)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDeviceRole(device.device_role)} • WiFi/BLE
                          </div>
                        </div>
                      ))}
                      {wifiDevices.length === 0 && (
                        <div className="p-3 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                          <Wifi className="h-4 w-4 mx-auto mb-1 opacity-50" />
                          No WiFi/BLE nodes
                          <div className="text-xs mt-1">Enable on gateway</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Legend */}
              <div className="absolute bottom-2 right-2 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CircleDot className="h-3 w-3 text-green-500" />
                  Online
                </div>
                <div className="flex items-center gap-1">
                  <CircleDot className="h-3 w-3 text-muted-foreground" />
                  Offline
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device List */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : verifiedDevices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Network className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Devices Found</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                No MycoBrain devices discovered. Make sure devices are connected via USB and the MycoBrain service is running.
              </p>
              {discoverHint && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 mb-6 max-w-lg text-left text-sm text-amber-800 dark:text-amber-200">
                  {discoverHint}
                </div>
              )}
              <div className="flex gap-3">
                <Button onClick={handleScan} disabled={scanning}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
                  Scan for Devices
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/natureos/devices">Device Manager</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {verifiedDevices.map((device) => (
              <Card key={device.deviceId} className={device.status === "online" ? "border-green-500/50" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${
                        device.status === "online" ? "bg-green-500/20" : "bg-gray-500/20"
                      }`}>
                        {device.deviceType === "mycobrain" ? (
                          <Cpu className={`h-6 w-6 ${
                            device.status === "online" ? "text-green-500" : "text-gray-500"
                          }`} />
                        ) : (
                          <Network className={`h-6 w-6 ${
                            device.status === "online" ? "text-green-500" : "text-gray-500"
                          }`} />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{getDeviceDisplayName(device)}</CardTitle>
                        <CardDescription>
                          {device.device_role && device.device_role !== "standalone" && (
                            <span className="text-xs text-primary mr-2">{formatDeviceRole(device.device_role)}</span>
                          )}
                          {device.port && (
                            <span className="flex items-center gap-1 mt-0.5">
                              <Usb className="h-3 w-3" />
                              {device.port}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={device.status === "online" ? "default" : "secondary"}>
                      {device.status === "online" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {device.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium capitalize">{device.deviceType}</span>
                    </div>
                    {device.description && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Description:</span>
                        <span className="font-medium text-xs">{device.description}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source:</span>
                      <span className="font-mono text-xs">{device.source}</span>
                    </div>
                    {device.lastSeen && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Seen:</span>
                        <span className="text-xs">{new Date(device.lastSeen).toLocaleTimeString()}</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      {device.registered && (
                        <Badge variant="outline" className="text-xs">Registered</Badge>
                      )}
                      {device.discovered && (
                        <Badge variant="outline" className="text-xs">Discovered</Badge>
                      )}
                    </div>
                  </div>
                  
                  {device.status === "online" && device.port && (
                    <div className="mt-4 pt-4 border-t">
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <Link href={`/natureos/devices?device=${device.port}`}>
                          Manage Device
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Device Configuration Popup Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className={`h-5 w-5 ${selectedDevice?.status === "online" ? "text-green-500" : "text-muted-foreground"}`} />
              {selectedDevice ? getDeviceDisplayName(selectedDevice) : "Device"}
            </DialogTitle>
            <DialogDescription>
              {selectedDevice?.device_role && selectedDevice.device_role !== "standalone" 
                ? formatDeviceRole(selectedDevice.device_role)
                : selectedDevice?.device_info?.side 
                  ? `MycoBrain Side ${selectedDevice.device_info.side}` 
                  : "MycoBrain Device"}
              {selectedDevice?.device_info?.bme688_count && selectedDevice.device_info.bme688_count > 0 && (
                <span className="ml-2 text-xs">
                  • {selectedDevice.device_info.bme688_count}x BME688 sensor{selectedDevice.device_info.bme688_count > 1 ? "s" : ""}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDevice && (
            <div className="space-y-4">
              {/* Device Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${selectedDevice.status === "online" ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                  <span className="font-medium">Status</span>
                </div>
                <Badge variant={selectedDevice.status === "online" ? "default" : "secondary"}>
                  {selectedDevice.status === "online" ? "Online" : "Offline"}
                </Badge>
              </div>
              
              {/* Device Info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-muted-foreground text-xs">Connection</div>
                  <div className="font-medium flex items-center gap-1">
                    <Cable className="h-3 w-3" />
                    {selectedDevice.port}
                  </div>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-muted-foreground text-xs">Protocol</div>
                  <div className="font-medium">
                    MDP v{selectedDevice.device_info?.mdp_version || 1}
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              {selectedDevice.status === "online" && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Quick Actions</div>
                  <div className="grid grid-cols-4 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex flex-col items-center gap-1 h-auto py-2"
                      onClick={() => handleQuickAction("beep")}
                      disabled={quickAction !== null}
                    >
                      <Volume2 className={`h-4 w-4 ${quickAction === "beep" ? "animate-pulse text-blue-500" : ""}`} />
                      <span className="text-xs">Beep</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex flex-col items-center gap-1 h-auto py-2"
                      onClick={() => handleQuickAction("led_green")}
                      disabled={quickAction !== null}
                    >
                      <Lightbulb className={`h-4 w-4 ${quickAction === "led_green" ? "animate-pulse" : ""} text-green-500`} />
                      <span className="text-xs">Green</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex flex-col items-center gap-1 h-auto py-2"
                      onClick={() => handleQuickAction("led_red")}
                      disabled={quickAction !== null}
                    >
                      <Lightbulb className={`h-4 w-4 ${quickAction === "led_red" ? "animate-pulse" : ""} text-red-500`} />
                      <span className="text-xs">Red</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex flex-col items-center gap-1 h-auto py-2"
                      onClick={() => handleQuickAction("led_off")}
                      disabled={quickAction !== null}
                    >
                      <Lightbulb className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">Off</span>
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Sensors Preview */}
              {selectedDevice.device_info?.bme688_count && selectedDevice.device_info.bme688_count > 0 && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 text-sm">
                    <Thermometer className="h-4 w-4 text-green-500" />
                    <span className="font-medium">
                      {selectedDevice.device_info.bme688_count} Environmental Sensor{selectedDevice.device_info.bme688_count > 1 ? "s" : ""} Detected
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    BME688 with Temperature, Humidity, Pressure, IAQ, CO2eq, VOC
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
            {selectedDevice?.status === "online" && selectedDevice?.port && (
              <Button onClick={openDeviceManager} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Device Manager
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}



































