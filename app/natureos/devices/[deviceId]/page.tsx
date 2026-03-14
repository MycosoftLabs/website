"use client"

import { DevicePageShell } from "@/components/natureos/device-page-shell"
import { DeviceTelemetryCard } from "@/components/devices/device-telemetry-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Cpu,
  Cable,
  AlertTriangle,
  RefreshCw,
  Radio,
  Wifi,
  Thermometer,
  Volume2,
  Lightbulb,
  StopCircle,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { getRoleConfigForDevice } from "@/lib/device-configs"

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
  device_name?: string
  device_role?: string
  device_display_name?: string | null
  display_name?: string
  device_info?: {
    side?: string
    mdp_version?: number
    bme688_count?: number
    firmware_version?: string
  }
}

function getDeviceDisplayName(device: DeviceInfo): string {
  return (
    device.display_name ||
    device.device_display_name ||
    device.device_name ||
    formatDeviceRole(device.device_role) ||
    device.deviceId
  )
}

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

function formatConnectionType(
  type: "serial" | "lora" | "wifi" | "bluetooth" | "unknown"
): string {
  const map: Record<string, string> = {
    serial: "Serial/USB",
    lora: "LoRa",
    wifi: "WiFi",
    bluetooth: "Bluetooth",
    unknown: "Unknown",
  }
  return map[type] || type
}

export default function DeviceDetailPage() {
  const params = useParams()
  const deviceId = typeof params.deviceId === "string" ? params.deviceId : ""
  const [device, setDevice] = useState<DeviceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [commandPending, setCommandPending] = useState<string | null>(null)
  const [commandError, setCommandError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDevice = async () => {
      setLoading(true)
      try {
        const [discoverRes, networkRes] = await Promise.allSettled([
          fetch("/api/devices/discover", { signal: AbortSignal.timeout(15000) }),
          fetch("/api/devices/network", { signal: AbortSignal.timeout(20000) }),
        ])

        const allDevices: DeviceInfo[] = []
        const seenIds = new Set<string>()

        if (discoverRes.status === "fulfilled" && discoverRes.value.ok) {
          const data = await discoverRes.value.json()
          for (const d of data.devices || []) {
            if (!seenIds.has(d.deviceId)) {
              seenIds.add(d.deviceId)
              allDevices.push({ ...d, source: d.source || "local" })
            }
          }
        }

        if (networkRes.status === "fulfilled" && networkRes.value.ok) {
          const data = await networkRes.value.json()
          for (const d of data.devices || []) {
            const id = d.device_id || d.id
            if (seenIds.has(id)) {
              const idx = allDevices.findIndex((x) => x.deviceId === id)
              if (idx >= 0) {
                allDevices[idx] = {
                  ...allDevices[idx],
                  ...d,
                  deviceId: id,
                  status: d.status || allDevices[idx].status,
                  source: "MAS-Registry",
                  registered: true,
                }
              }
            } else {
              seenIds.add(id)
              allDevices.push({
                deviceId: id,
                deviceType: d.board_type || "mycobrain",
                port: d.extra?.port_name,
                status: d.status === "online" ? "online" : "offline",
                connected: d.status === "online",
                discovered: true,
                registered: true,
                is_mycobrain: true,
                source: "MAS-Registry",
                connectionType:
                  d.connection_type === "lan" ? "wifi" : d.connection_type || "unknown",
                lastSeen: d.last_seen,
                device_name: d.device_name || d.name,
                device_role: d.device_role,
                device_display_name: d.device_display_name,
                display_name: d.display_name,
                hwid: d.host ? `${d.host}:${d.port}` : undefined,
                device_info: {
                  side: d.extra?.side,
                  mdp_version: d.extra?.mdp_version,
                  firmware_version: d.firmware_version,
                },
              })
            }
          }
        }

        const match = allDevices.find(
          (d) =>
            d.deviceId === deviceId ||
            d.deviceId.toLowerCase() === deviceId.toLowerCase()
        )
        setDevice(match || null)
      } catch {
        setDevice(null)
      } finally {
        setLoading(false)
      }
    }

    if (deviceId) fetchDevice()
  }, [deviceId])

  const handleCommand = async (
    command: string,
    params?: Record<string, unknown>
  ) => {
    setCommandError(null)
    setCommandPending(command)
    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, params: params || {}, timeout: 10 }),
        signal: AbortSignal.timeout(20000),
      })
      const data = await res.json()
      if (!res.ok) {
        setCommandError(data?.error || "Command failed")
        return
      }
    } catch (err) {
      setCommandError(err instanceof Error ? err.message : "Command failed")
    } finally {
      setCommandPending(null)
    }
  }

  const roleConfig = device ? getRoleConfigForDevice(device.deviceId, device.device_role) : null
  const displayName = device ? getDeviceDisplayName(device) : deviceId

  if (loading) {
    return (
      <DevicePageShell heading={displayName} text="Loading device details…">
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DevicePageShell>
    )
  }

  if (!device) {
    return (
      <DevicePageShell heading="Device Not Found" text="">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Device not found</h2>
            <p className="text-muted-foreground text-center mb-6">
              Device &quot;{deviceId}&quot; was not found in the network or registry.
            </p>
            <Button asChild variant="outline" className="min-h-[44px] px-6">
              <Link href="/natureos/devices/network" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Network
              </Link>
            </Button>
          </CardContent>
        </Card>
      </DevicePageShell>
    )
  }

  return (
    <DevicePageShell
      heading={displayName}
      text={
        roleConfig?.description ||
        `MycoBrain device ${device.device_role ? `(${formatDeviceRole(device.device_role)})` : ""}`
      }
    >
      <div className="space-y-6">
        {/* Back link */}
        <div>
          <Button asChild variant="ghost" size="sm" className="min-h-[44px] -ml-2">
            <Link href="/natureos/devices/network" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Network
            </Link>
          </Button>
        </div>

        {/* Device Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div
                className={`p-3 rounded-lg ${
                  device.status === "online" ? "bg-green-500/20" : "bg-muted"
                }`}
              >
                <Cpu
                  className={`h-6 w-6 ${
                    device.status === "online" ? "text-green-500" : "text-muted-foreground"
                  }`}
                />
              </div>
              <div>
                <div>{displayName}</div>
                <CardDescription className="text-sm font-normal mt-0.5">
                  {device.deviceId}
                  {device.device_role && device.device_role !== "standalone" && (
                    <span className="ml-2">• {formatDeviceRole(device.device_role)}</span>
                  )}
                </CardDescription>
              </div>
              <Badge
                variant={device.status === "online" ? "default" : "secondary"}
                className="ml-auto"
              >
                {device.status === "online" ? "Online" : "Offline"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border px-4 py-3">
              <div className="text-xs text-muted-foreground">Role</div>
              <div className="font-medium">
                {formatDeviceRole(device.device_role)}
              </div>
            </div>
            <div className="rounded-lg border px-4 py-3">
              <div className="text-xs text-muted-foreground">Firmware</div>
              <div className="font-medium text-sm">
                {device.device_info?.firmware_version || "—"}
              </div>
            </div>
            <div className="rounded-lg border px-4 py-3">
              <div className="text-xs text-muted-foreground">Last seen</div>
              <div className="font-medium text-sm">
                {device.lastSeen
                  ? new Date(device.lastSeen).toLocaleString()
                  : "—"}
              </div>
            </div>
            <div className="rounded-lg border px-4 py-3">
              <div className="text-xs text-muted-foreground">Connection</div>
              <div className="flex items-center gap-2 font-medium text-sm">
                {device.connectionType === "serial" && <Cable className="h-4 w-4" />}
                {device.connectionType === "wifi" && <Wifi className="h-4 w-4" />}
                {device.connectionType === "lora" && <Radio className="h-4 w-4" />}
                {formatConnectionType(device.connectionType)}
                {device.port && (
                  <span className="text-muted-foreground">({device.port})</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Telemetry */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Live Telemetry
            </CardTitle>
            <CardDescription>
              Real-time sensor readings from the device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeviceTelemetryCard
              deviceId={device.deviceId}
              deviceName={displayName}
              role={device.device_role}
              status={device.status}
              pollIntervalMs={5000}
            />
          </CardContent>
        </Card>

        {/* Command Panel - only for online devices */}
        {device.status === "online" && (
          <Card>
            <CardHeader>
              <CardTitle>Commands</CardTitle>
              <CardDescription>
                Send commands to the device. Admin authentication required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commandError && (
                <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {commandError}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Button
                  variant="outline"
                  className="min-h-[44px] flex flex-col items-center gap-1 sm:flex-row sm:justify-center"
                  onClick={() => handleCommand("read_sensors")}
                  disabled={commandPending !== null}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      commandPending === "read_sensors" ? "animate-spin" : ""
                    }`}
                  />
                  <span>Read Sensors</span>
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px] flex flex-col items-center gap-1 sm:flex-row sm:justify-center"
                  onClick={() => handleCommand("beep", { preset: "coin" })}
                  disabled={commandPending !== null}
                >
                  <Volume2
                    className={`h-4 w-4 ${
                      commandPending === "beep" ? "animate-pulse" : ""
                    }`}
                  />
                  <span>Beep</span>
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px] flex flex-col items-center gap-1 sm:flex-row sm:justify-center"
                  onClick={() =>
                    handleCommand("led_rgb", { r: 0, g: 255, b: 0 })
                  }
                  disabled={commandPending !== null}
                >
                  <Lightbulb className="h-4 w-4 text-green-500" />
                  <span>LED Green</span>
                </Button>
                <Button
                  variant="destructive"
                  className="min-h-[44px] flex flex-col items-center gap-1 sm:flex-row sm:justify-center"
                  onClick={() => handleCommand("estop")}
                  disabled={commandPending !== null}
                >
                  <StopCircle className="h-4 w-4" />
                  <span>E-Stop</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transport status for gateway-connected */}
        {device.connectionType !== "serial" && device.status === "online" && (
          <Card>
            <CardHeader>
              <CardTitle>Transport</CardTitle>
              <CardDescription>
                Connection via {formatConnectionType(device.connectionType)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>Connected via MAS registry</span>
                {device.hwid && (
                  <span className="text-muted-foreground">({device.hwid})</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DevicePageShell>
  )
}
