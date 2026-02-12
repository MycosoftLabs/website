import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Filter,
  Wifi,
  WifiOff,
  Clock,
  Cpu,
  HardDrive,
  Thermometer,
  Zap,
  Settings,
  TrendingUp,
  Server,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Device Dashboard | Mycosoft",
  description: "Manage and monitor all Mycosoft devices across your network.",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

interface Device {
  device_id: string
  device_name: string
  device_type: string
  status: "online" | "offline" | "warning"
  last_seen: string
  ip_address?: string
  firmware_version?: string
  uptime_seconds?: number
  metadata?: Record<string, any>
}

async function getDevices(): Promise<Device[]> {
  const masApiUrl = process.env.NEXT_PUBLIC_MAS_API_URL || "http://192.168.0.188:8001"

  try {
    const response = await fetch(`${masApiUrl}/api/devices/network`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error("[Device Dashboard] Failed to fetch devices:", response.statusText)
      return []
    }

    const data = await response.json()
    return data.devices || []
  } catch (error) {
    console.error("[Device Dashboard] Error fetching devices:", error)
    return []
  }
}

function getTimeAgo(dateString: string): string {
  const now = new Date()
  const lastSeen = new Date(dateString)
  const diffMs = now.getTime() - lastSeen.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return `${diffSeconds}s ago`
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "1 day ago"
  return `${diffDays} days ago`
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function getDeviceIcon(deviceType: string) {
  const type = deviceType.toLowerCase()
  if (type.includes("sensor")) return Thermometer
  if (type.includes("gateway")) return Wifi
  if (type.includes("server")) return Server
  if (type.includes("compute")) return Cpu
  return HardDrive
}

export default async function DeviceDashboardPage() {
  const devices = await getDevices()

  const onlineDevices = devices.filter((d) => d.status === "online")
  const offlineDevices = devices.filter((d) => d.status === "offline")
  const warningDevices = devices.filter((d) => d.status === "warning")

  const deviceTypes = [...new Set(devices.map((d) => d.device_type))]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="relative py-12 md:py-16 overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 to-background z-0" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:60px_60px] z-10" />

        <div className="container max-w-7xl mx-auto px-6 relative z-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                <Activity className="h-3 w-3 mr-2" />
                Device Dashboard
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Network{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Devices
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Monitor and manage all devices connected to your Mycosoft network
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <Button className="gap-2 bg-cyan-600 hover:bg-cyan-700">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 bg-muted/30 border-b">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{onlineDevices.length}</div>
                    <div className="text-xs text-muted-foreground">Online</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <WifiOff className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{offlineDevices.length}</div>
                    <div className="text-xs text-muted-foreground">Offline</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{warningDevices.length}</div>
                    <div className="text-xs text-muted-foreground">Warnings</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10">
                    <Server className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{devices.length}</div>
                    <div className="text-xs text-muted-foreground">Total Devices</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Device Type Filters */}
      {deviceTypes.length > 0 && (
        <section className="py-6 border-b">
          <div className="container max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Filter by type:</span>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-cyan-500/20">
                  All ({devices.length})
                </Badge>
                {deviceTypes.map((type) => {
                  const count = devices.filter((d) => d.device_type === type).length
                  return (
                    <Badge
                      key={type}
                      variant="outline"
                      className="cursor-pointer hover:bg-cyan-500/20"
                    >
                      {type} ({count})
                    </Badge>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Device List */}
      <section className="py-12">
        <div className="container max-w-7xl mx-auto px-6">
          {devices.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((device) => {
                const DeviceIcon = getDeviceIcon(device.device_type)
                const statusColor =
                  device.status === "online"
                    ? "text-green-500"
                    : device.status === "warning"
                    ? "text-amber-500"
                    : "text-red-500"

                return (
                  <Card
                    key={device.device_id}
                    className="hover:border-cyan-500/50 transition-colors cursor-pointer group"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-cyan-500/10">
                            <DeviceIcon className="h-5 w-5 text-cyan-500" />
                          </div>
                          <div>
                            <CardTitle className="text-lg group-hover:text-cyan-500 transition-colors">
                              {device.device_name}
                            </CardTitle>
                            <Badge variant="secondary" className="mt-1">
                              {device.device_type}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CircleDot className={`h-3 w-3 ${statusColor}`} />
                          <span className={`text-xs font-medium capitalize ${statusColor}`}>
                            {device.status}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        {device.ip_address && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Wifi className="h-3 w-3" />
                              IP Address
                            </span>
                            <span className="font-mono">{device.ip_address}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last Seen
                          </span>
                          <span>{getTimeAgo(device.last_seen)}</span>
                        </div>
                        {device.uptime_seconds !== undefined && device.status === "online" && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Uptime
                            </span>
                            <span>{formatUptime(device.uptime_seconds)}</span>
                          </div>
                        )}
                        {device.firmware_version && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              Firmware
                            </span>
                            <span className="font-mono text-xs">{device.firmware_version}</span>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                        <Link href={`/dashboard/devices/${device.device_id}`}>
                          View Details
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-muted">
                  <Server className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">No Devices Found</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    No devices are currently registered in your network. Connect your first device
                    to get started.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" asChild>
                    <Link href="/devices">Browse Devices</Link>
                  </Button>
                  <Button className="gap-2 bg-cyan-600 hover:bg-cyan-700" asChild>
                    <Link href="/docs/devices">
                      <Settings className="h-4 w-4" />
                      Setup Guide
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </section>
    </div>
  )
}
