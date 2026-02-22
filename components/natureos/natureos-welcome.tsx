"use client"

import Link from "next/link"
import useSWR from "swr"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface FleetHealthResponse {
  total_devices: number
  online_devices: number
  stale_devices: number
  offline_devices: number
  uptime_pct: number
  timestamp: string
}

interface RegistryDevice {
  device_id: string
  status?: string
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Failed to load data")
  return response.json()
}

export function NatureOSWelcome() {
  const { data: fleetHealth } = useSWR<FleetHealthResponse>(
    "/api/iot/insights/fleet-health",
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: devices } = useSWR<RegistryDevice[]>(
    "/api/devices/network?include_offline=true",
    fetcher,
    { refreshInterval: 30000 }
  )

  const onlineCount = devices?.filter((device) => device.status === "online").length ?? 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {fleetHealth?.total_devices ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Online Now</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-500">
            {onlineCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Fleet Uptime</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {fleetHealth?.uptime_pct ?? 0}%
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {fleetHealth?.timestamp ? new Date(fleetHealth.timestamp).toLocaleString() : "—"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Button asChild variant="outline" className="h-auto min-h-[44px] justify-between px-4 py-3 text-left">
            <Link href="/natureos/devices/registry">
              Device Registry
              <span className="text-xs text-muted-foreground">View all devices</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto min-h-[44px] justify-between px-4 py-3 text-left">
            <Link href="/natureos/devices/telemetry">
              Telemetry Dashboard
              <span className="text-xs text-muted-foreground">Live signals</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto min-h-[44px] justify-between px-4 py-3 text-left">
            <Link href="/natureos/devices/alerts">
              Alert Center
              <span className="text-xs text-muted-foreground">Triage issues</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto min-h-[44px] justify-between px-4 py-3 text-left">
            <Link href="/natureos/devices/map">
              Device Map
              <span className="text-xs text-muted-foreground">Geospatial view</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto min-h-[44px] justify-between px-4 py-3 text-left">
            <Link href="/natureos/devices/fleet">
              Fleet Management
              <span className="text-xs text-muted-foreground">Groups & firmware</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto min-h-[44px] justify-between px-4 py-3 text-left">
            <Link href="/natureos/devices/insights">
              Insights
              <span className="text-xs text-muted-foreground">Analytics summary</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
