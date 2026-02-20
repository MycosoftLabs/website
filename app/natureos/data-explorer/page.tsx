"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RefreshCw,
  Database,
  BarChart3,
  Table2,
  ExternalLink,
  TrendingUp,
  Layers,
} from "lucide-react"
import Link from "next/link"

interface BiodiversityMetrics {
  speciesCount: number
  observationCount: number
  speciesByPhylum: Record<string, number>
}

interface TimeSeriesPoint {
  timestamp: string
  value: number
}

interface NetworkTopology {
  totalNodes: number
  activeNodes: number
  networkHealth: number
  connections: number
  bioelectricActivity?: number
  regions?: { id: string; location: number[]; density: number; health: number }[]
}

export default function DataExplorerPage() {
  const [biodiversity, setBiodiversity] = useState<BiodiversityMetrics | null>(null)
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([])
  const [network, setNetwork] = useState<NetworkTopology | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const base = typeof window !== "undefined" ? window.location.origin : ""
      const [bioRes, tsRes, netRes] = await Promise.allSettled([
        fetch(`${base}/api/natureos/analytics/biodiversity`),
        fetch(`${base}/api/natureos/analytics/timeseries?metric=event_count`),
        fetch(`${base}/api/natureos/mycelium/network`),
      ])

      if (bioRes.status === "fulfilled" && bioRes.value.ok) {
        const d = await bioRes.value.json()
        setBiodiversity(d)
      }
      if (tsRes.status === "fulfilled" && tsRes.value.ok) {
        const d = await tsRes.value.json()
        setTimeSeries(d.dataPoints ?? d.DataPoints ?? d ?? [])
      }
      if (netRes.status === "fulfilled" && netRes.value.ok) {
        setNetwork(await netRes.value.json())
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Data Explorer"
        text="Query builder, visualization, and data browsing"
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/natureos/mindex/explorer">
              <ExternalLink className="h-4 w-4 mr-2" />
              MINDEX Explorer
            </Link>
          </Button>
        </div>
      </DashboardHeader>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Species
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {biodiversity?.speciesCount ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Unique species</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Observations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {biodiversity?.observationCount ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Total records</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Phyla
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {biodiversity?.speciesByPhylum
                  ? Object.keys(biodiversity.speciesByPhylum).length
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">Taxonomic groups</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="biodiversity">
          <TabsList>
            <TabsTrigger value="biodiversity" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Biodiversity
            </TabsTrigger>
            <TabsTrigger value="timeseries" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Time Series
            </TabsTrigger>
            <TabsTrigger value="network" className="gap-2">
              <Layers className="h-4 w-4" />
              Network
            </TabsTrigger>
            <TabsTrigger value="mindex" className="gap-2">
              <Table2 className="h-4 w-4" />
              MINDEX
            </TabsTrigger>
          </TabsList>

          <TabsContent value="biodiversity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Biodiversity Overview</CardTitle>
                <CardDescription>
                  Species distribution by phylum
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : biodiversity?.speciesByPhylum &&
                  Object.keys(biodiversity.speciesByPhylum).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(biodiversity.speciesByPhylum).map(
                      ([phylum, count]) => (
                        <div
                          key={phylum}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <span className="font-medium">{phylum}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No biodiversity data yet</p>
                    <p className="text-sm mt-2">
                      Data comes from MINDEX and event ingestion
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeseries" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Time Series</CardTitle>
                <CardDescription>
                  Event count over time (hourly aggregation)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : timeSeries.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {timeSeries.slice(-20).map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <span className="text-sm text-muted-foreground">
                          {new Date(p.timestamp).toLocaleString()}
                        </span>
                        <Badge variant="outline">{p.value}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No time-series data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Mycelium Network Topology</CardTitle>
                <CardDescription>
                  Signal propagation, connectivity, and bioelectric activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : network ? (
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <div className="p-4 rounded-lg border">
                      <p className="text-2xl font-bold">{network.totalNodes}</p>
                      <p className="text-sm text-muted-foreground">Total Nodes</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-2xl font-bold">{network.activeNodes}</p>
                      <p className="text-sm text-muted-foreground">Active Nodes</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-2xl font-bold">{network.networkHealth}%</p>
                      <p className="text-sm text-muted-foreground">Network Health</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-2xl font-bold">{network.connections}</p>
                      <p className="text-sm text-muted-foreground">Connections</p>
                    </div>
                    {network.bioelectricActivity != null && (
                      <div className="p-4 rounded-lg border sm:col-span-2">
                        <p className="text-2xl font-bold">{network.bioelectricActivity}</p>
                        <p className="text-sm text-muted-foreground">Bioelectric Activity</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No network data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mindex" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>MINDEX Data Explorer</CardTitle>
                <CardDescription>
                  Interactive species list, genome browser, circular plots, and
                  spatial visualization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Open the full MINDEX Explorer for species data, genome
                    browsing, and spatial visualization.
                  </p>
                  <Button asChild>
                    <Link href="/natureos/mindex/explorer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open MINDEX Explorer
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
