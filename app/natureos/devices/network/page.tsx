"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Network, Usb, Radio, Wifi, Cpu, AlertCircle, CheckCircle } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"

interface DeviceInfo {
  deviceId: string
  deviceType: string
  port?: string
  status: "online" | "offline" | "error"
  connected: boolean
  discovered: boolean
  registered: boolean
  source: string
  lastSeen?: string
  description?: string
  hwid?: string
}

export default function DeviceNetworkPage() {
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/devices/discover", {
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json()
        setDevices(data.devices || [])
      } else {
        console.error("Failed to fetch devices:", res.status, res.statusText)
        setDevices([])
      }
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
      // Trigger scan by connecting to COM4
      await fetch("/api/mycobrain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", port: "COM4" }),
      })
      await fetchDevices()
    } catch (error) {
      console.error("Scan failed:", error)
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 5000)
    return () => clearInterval(interval)
  }, [])

  const onlineDevices = devices.filter(d => d.status === "online")
  const offlineDevices = devices.filter(d => d.status === "offline")

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Device Network"
        text="Discover and manage all MycoBrain devices across your network"
      />

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{devices.length}</div>
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

        {/* Device List */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : devices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Network className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Devices Found</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                No MycoBrain devices discovered. Make sure devices are connected via USB and the MycoBrain service is running.
              </p>
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
            {devices.map((device) => (
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
                        <CardTitle className="text-base">{device.deviceId}</CardTitle>
                        <CardDescription>
                          {device.port && (
                            <span className="flex items-center gap-1">
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
    </DashboardShell>
  )
}




