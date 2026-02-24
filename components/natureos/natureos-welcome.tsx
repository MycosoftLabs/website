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

interface MINDEXStatsResponse {
  total_taxa?: number
  total_observations?: number
  genome_records?: number
  trait_records?: number
  observations_with_images?: number
  observations_with_location?: number
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

  const { data: networkData } = useSWR<{ devices?: RegistryDevice[] }>(
    "/api/devices/network?include_offline=true",
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: mindexStats } = useSWR<MINDEXStatsResponse>(
    "/api/natureos/mindex/stats",
    fetcher,
    { refreshInterval: 30000 }
  )

  const devices: RegistryDevice[] = Array.isArray(networkData?.devices)
    ? Array.from(networkData.devices)
    : []
  const onlineCount = devices.filter((d) => d?.status === "online").length

  return (
    <div className="space-y-6">
      {/* Device Stats */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Devices & Fleet</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      {/* Nature & Species Stats (MINDEX) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground">Nature & Species</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/natureos/mindex">View MINDEX</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Species</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-cyan-500">
              {mindexStats?.total_taxa != null
                ? Number(mindexStats.total_taxa).toLocaleString()
                : "—"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Observations</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {mindexStats?.total_observations != null
                ? Number(mindexStats.total_observations).toLocaleString()
                : "—"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Genomes</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {mindexStats?.genome_records != null
                ? Number(mindexStats.genome_records).toLocaleString()
                : "—"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">With Images</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {mindexStats?.observations_with_images != null
                ? Number(mindexStats.observations_with_images).toLocaleString()
                : "—"}
            </CardContent>
          </Card>
        </div>
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
          <Button asChild variant="outline" className="h-auto min-h-[44px] justify-between px-4 py-3 text-left">
            <Link href="/natureos/mindex">
              MINDEX Explorer
              <span className="text-xs text-muted-foreground">Species & biodiversity</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
