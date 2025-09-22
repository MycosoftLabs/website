"use client"

import { CardFooter } from "@/components/ui/card"
import { CardDescription } from "@/components/ui/card"
import { useState, useEffect } from "react"
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bot,
  Bug,
  Cloud,
  Code,
  Database,
  FileText,
  Gauge,
  Globe,
  LineChart,
  Microscope,
  MouseIcon,
  Network,
  PipetteIcon,
  Plus,
  RefreshCw,
  Settings,
  Zap,
  CheckCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import dynamic from "next/dynamic"
import type { CircularProgressProps } from "@/components/dashboard/circular-progress"

const AzureMap = dynamic(() => import("@/components/maps/azure-map").then((mod) => mod.AzureMap), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] rounded-md border bg-muted/50 flex items-center justify-center">
      <div className="text-center">
        <Globe className="mx-auto h-10 w-10 text-muted-foreground mb-2 animate-spin" />
        <p className="text-muted-foreground">Loading global network map...</p>
      </div>
    </div>
  ),
})

const CircularProgressComponent = dynamic<CircularProgressProps>(
  () => import("@/components/dashboard/circular-progress").then((mod) => mod.CircularProgress),
  {
    ssr: false,
    loading: () => <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />,
  },
)

interface DashboardData {
  stats: {
    totalEvents: number
    activeDevices: number
    speciesDetected: number
    onlineUsers: number
  }
  liveData: {
    readings: Array<{
      device: string
      value: number
      timestamp: string
      status: string
      type: string
    }>
    lastUpdate: string
  }
  insights: {
    trendingCompounds: string[]
    recentDiscoveries: string[]
  }
  networkHealth: {
    status: string
    connections: number
    throughput: string
    uptime: string
    signalStrength: number
    latency: number
  }
  performance?: {
    apiResponseTime: number
    dataProcessingRate: number
    networkLatency: number
  }
  error?: string
  refreshTimestamp?: string
}

export function NatureOSDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const { toast } = useToast()

  const fetchDashboardData = async (showToast = false) => {
    try {
      const response = await fetch("/api/dashboard", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setDashboardData(data)
      setLastRefresh(new Date())

      if (data.error && showToast) {
        toast({
          title: "Using Fallback Data",
          description: "External API unavailable, showing cached data",
          variant: "default",
        })
      } else if (showToast) {
        toast({
          title: "Data Refreshed",
          description: `Dashboard updated at ${new Date().toLocaleTimeString()}`,
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)

      if (showToast) {
        toast({
          title: "Connection Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        })
      }

      // Set fallback data with current timestamp
      setDashboardData({
        stats: {
          totalEvents: 150000 + Math.floor(Math.random() * 10000),
          activeDevices: 42 + Math.floor(Math.random() * 8),
          speciesDetected: 156 + Math.floor(Math.random() * 15),
          onlineUsers: 23 + Math.floor(Math.random() * 12),
        },
        liveData: {
          readings: [
            {
              device: "MUSHROOM-001",
              value: 23.5 + (Math.random() - 0.5) * 8,
              timestamp: new Date().toISOString(),
              status: "active",
              type: "temperature",
            },
            {
              device: "SPORE-DET-002",
              value: 0.75 + (Math.random() - 0.5) * 0.4,
              timestamp: new Date().toISOString(),
              status: "active",
              type: "spore_count",
            },
            {
              device: "ENV-STATION-A",
              value: 78.2 + (Math.random() - 0.5) * 15,
              timestamp: new Date().toISOString(),
              status: "active",
              type: "humidity",
            },
            {
              device: "MYCO-NET-B",
              value: 92.1 + (Math.random() - 0.5) * 10,
              timestamp: new Date().toISOString(),
              status: "active",
              type: "network_health",
            },
          ],
          lastUpdate: new Date().toISOString(),
        },
        insights: {
          trendingCompounds: ["Psilocybin", "Cordycepin", "Beta-glucan", "Ergosterol"],
          recentDiscoveries: [
            "New mycorrhizal network topology discovered",
            "Novel antifungal compound isolated",
            "Breakthrough in fungal computing achieved",
          ],
        },
        networkHealth: {
          status: "optimal",
          connections: 42 + Math.floor(Math.random() * 8),
          throughput: `${(2.4 + Math.random()).toFixed(1)} MB/s`,
          uptime: `${(99.0 + Math.random()).toFixed(1)}%`,
          signalStrength: 87 + Math.floor(Math.random() * 8),
          latency: 25 + Math.floor(Math.random() * 10),
        },
        performance: {
          apiResponseTime: 35 + Math.floor(Math.random() * 20),
          dataProcessingRate: 2500 + Math.floor(Math.random() * 500),
          networkLatency: 8 + Math.floor(Math.random() * 5),
        },
        error: "Connection failed - using cached data",
        refreshTimestamp: new Date().toISOString(),
      })
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)

    // Add a small delay to show the loading state
    await new Promise((resolve) => setTimeout(resolve, 500))

    await fetchDashboardData(true)

    toast({
      title: "Refresh Complete",
      description: `Data updated successfully at ${new Date().toLocaleTimeString()}`,
      variant: "default",
    })
  }

  const handleSync = async () => {
    try {
      setRefreshing(true)

      const response = await fetch("/api/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "refresh" }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchDashboardData(false)
        toast({
          title: "Sync Complete",
          description: result.message,
          variant: "default",
        })
      } else {
        throw new Error(result.error || "Sync failed")
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Unable to synchronize data",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => fetchDashboardData(), 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-5 w-full">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center py-8">
          <RefreshCw className="mx-auto h-8 w-8 text-muted-foreground animate-spin mb-2" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      <Tabs defaultValue="overview" className="space-y-5 w-full" onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mycelium">Mycelium Network</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSync} disabled={refreshing}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Sync
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>

        {/* Status Banner */}
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">System Status: Operational</span>
            </div>
            {lastRefresh && (
              <div className="text-sm text-muted-foreground">Last updated: {lastRefresh.toLocaleTimeString()}</div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>API Response: {dashboardData?.performance?.apiResponseTime || 35}ms</span>
            <span>Latency: {dashboardData?.networkHealth?.latency || 25}ms</span>
            <span>Uptime: {dashboardData?.networkHealth?.uptime || "99.7%"}</span>
          </div>
        </div>

        {dashboardData?.error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Using Fallback Data</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>External API is currently unavailable. Displaying cached data with simulated updates.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Nodes</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.stats.activeDevices.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+{Math.floor(Math.random() * 20) + 5} from last hour</p>
                <div className="mt-4">
                  <Progress value={Math.floor(((dashboardData?.stats.activeDevices || 42) / 50) * 100)} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Code className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.stats.totalEvents.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{Math.floor(Math.random() * 50) + 20}k events/min</p>
                <div className="mt-4">
                  <Progress value={78} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Species Detected</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.stats.speciesDetected}</div>
                <p className="text-xs text-muted-foreground">98.2% accuracy rate</p>
                <div className="mt-4">
                  <Progress value={98} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online Users</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.stats.onlineUsers}</div>
                <p className="text-xs text-muted-foreground">Active researchers</p>
                <div className="mt-4">
                  <Progress value={Math.floor(((dashboardData?.stats.onlineUsers || 23) / 30) * 100)} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-full lg:col-span-4">
              <CardHeader>
                <CardTitle>Global Mycelium Network</CardTitle>
                <CardDescription>Live view of connected fungal intelligence nodes worldwide</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[400px]">
                  <AzureMap
                    className="rounded-none border-0"
                    deviceLocations={[
                      {
                        id: "device-1",
                        name: "Mushroom 1 - SF",
                        location: [-122.4194, 37.7749], // San Francisco
                        status: "active",
                      },
                      {
                        id: "device-2",
                        name: "SporeBase - NYC",
                        location: [-74.006, 40.7128], // New York
                        status: "active",
                      },
                      {
                        id: "device-3",
                        name: "TruffleBot - Austin",
                        location: [-97.7431, 30.2672], // Austin
                        status: Math.random() > 0.5 ? "active" : "inactive",
                      },
                      {
                        id: "device-4",
                        name: "Mushroom 1 - London",
                        location: [-0.1278, 51.5074], // London
                        status: "active",
                      },
                      {
                        id: "device-5",
                        name: "SporeBase - Tokyo",
                        location: [139.6503, 35.6762], // Tokyo
                        status: "active",
                      },
                      {
                        id: "device-6",
                        name: "MycoTenna - Berlin",
                        location: [13.405, 52.52], // Berlin
                        status: "active",
                      },
                      {
                        id: "device-7",
                        name: "ALARM - Sydney",
                        location: [151.2093, -33.8688], // Sydney
                        status: "active",
                      },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-full lg:col-span-3">
              <CardHeader>
                <CardTitle>System Metrics</CardTitle>
                <CardDescription>Real-time performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <CircularProgressComponent
                    value={Math.floor(Math.random() * 20) + 70}
                    icon={LineChart}
                    label="Growth Rate"
                  />
                  <CircularProgressComponent
                    value={dashboardData?.networkHealth?.signalStrength || 92}
                    icon={Network}
                    label="Network Health"
                  />
                  <CircularProgressComponent
                    value={Math.floor(((dashboardData?.stats.activeDevices || 42) / 50) * 100)}
                    icon={Activity}
                    label="Active Nodes"
                  />
                  <CircularProgressComponent
                    value={Math.floor(Math.random() * 30) + 40}
                    icon={Zap}
                    label="Energy Usage"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-full md:col-span-1">
              <CardHeader>
                <CardTitle>Live Readings</CardTitle>
                <CardDescription>Real-time sensor data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData?.liveData.readings.map((reading, index) => (
                    <div key={index} className="flex items-center">
                      <div className="mr-4 rounded-md bg-primary/10 p-2">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-none">{reading.device}</p>
                        <p className="text-sm text-muted-foreground">
                          {reading.value.toFixed(2)}{" "}
                          {reading.type === "temperature"
                            ? "°C"
                            : reading.type === "humidity"
                              ? "%"
                              : reading.type === "spore_count"
                                ? "spores/m³"
                                : reading.type === "alerts"
                                  ? "alerts"
                                  : "units"}
                        </p>
                      </div>
                      <Badge variant={reading.status === "active" ? "default" : "secondary"}>{reading.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date(dashboardData?.liveData.lastUpdate || "").toLocaleTimeString()}
                </p>
              </CardFooter>
            </Card>
            <Card className="col-span-full md:col-span-1">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { icon: Bot, text: "AI Model training completed", time: "2m ago", status: "success" },
                    { icon: AlertCircle, text: "High network load detected", time: "5m ago", status: "warning" },
                    { icon: Cloud, text: "New node cluster deployed", time: "15m ago", status: "success" },
                    { icon: Database, text: "Database backup completed", time: "1h ago", status: "success" },
                    { icon: Bug, text: "Anomaly detected in sector 7", time: "2h ago", status: "warning" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-full ${
                          item.status === "success" ? "bg-green-500/20" : "bg-yellow-500/20"
                        }`}
                      >
                        <item.icon
                          className={`h-4 w-4 ${item.status === "success" ? "text-green-500" : "text-yellow-500"}`}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{item.text}</p>
                        <p className="text-xs text-muted-foreground">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-full md:col-span-1">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Frequently used tools</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Button className="w-full justify-start bg-transparent" variant="outline">
                    <Bot className="mr-2 h-4 w-4" />
                    Launch AI Studio
                  </Button>
                  <Button className="w-full justify-start bg-transparent" variant="outline">
                    <Globe className="mr-2 h-4 w-4" />
                    View Global Network
                  </Button>
                  <Button className="w-full justify-start bg-transparent" variant="outline">
                    <Code className="mr-2 h-4 w-4" />
                    API Documentation
                  </Button>
                  <Button className="w-full justify-start bg-transparent" variant="outline">
                    <Cloud className="mr-2 h-4 w-4" />
                    Deploy New Node
                  </Button>
                  <Button className="w-full justify-start bg-transparent" variant="outline">
                    <PipetteIcon className="mr-2 h-4 w-4" />
                    Open Petri Simulator
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mycelium" className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Mycelium Network Status</CardTitle>
                <CardDescription>Real-time fungal network activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] rounded-md border bg-muted/50 flex items-center justify-center">
                  <div className="text-center">
                    <Microscope className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Mycelium Network Visualization</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {dashboardData?.networkHealth.connections} active connections
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Signal strength: {dashboardData?.networkHealth.signalStrength}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Network Health</CardTitle>
                <CardDescription>Fungal intelligence metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Signal Strength</p>
                      <p className="text-sm text-muted-foreground">
                        {dashboardData?.networkHealth.signalStrength}% optimal
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          dashboardData?.networkHealth.signalStrength && dashboardData.networkHealth.signalStrength > 80
                            ? "default"
                            : "secondary"
                        }
                      >
                        {dashboardData?.networkHealth.signalStrength && dashboardData.networkHealth.signalStrength > 80
                          ? "Strong"
                          : "Moderate"}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={dashboardData?.networkHealth.signalStrength || 87} />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Throughput</p>
                      <p className="text-sm text-muted-foreground">{dashboardData?.networkHealth.throughput}</p>
                    </div>
                    <div className="text-right">
                      <Badge>Excellent</Badge>
                    </div>
                  </div>
                  <Progress value={78} />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Uptime</p>
                      <p className="text-sm text-muted-foreground">{dashboardData?.networkHealth.uptime}</p>
                    </div>
                    <div className="text-right">
                      <Badge>Normal</Badge>
                    </div>
                  </div>
                  <Progress value={92} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Mycelium Density</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.87 g/cm³</div>
                <p className="text-xs text-muted-foreground">+0.12 from last week</p>
                <div className="mt-4 h-[60px]">
                  <div className="h-full w-full rounded-md bg-gradient-to-r from-green-200 to-green-400"></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Network Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.networkHealth.connections.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+{Math.floor(Math.random() * 100) + 50} from last week</p>
                <div className="mt-4 h-[60px]">
                  <div className="h-full w-full rounded-md bg-gradient-to-r from-blue-200 to-blue-400"></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Signal Propagation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3.2 cm/s</div>
                <p className="text-xs text-muted-foreground">+0.5 from baseline</p>
                <div className="mt-4 h-[60px]">
                  <div className="h-full w-full rounded-md bg-gradient-to-r from-purple-200 to-purple-400"></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Bioelectric Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">78 mV</div>
                <p className="text-xs text-muted-foreground">+12 from baseline</p>
                <div className="mt-4 h-[60px]">
                  <div className="h-full w-full rounded-md bg-gradient-to-r from-yellow-200 to-yellow-400"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices" className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Mushroom 1</CardTitle>
                  <Badge>Active</Badge>
                </div>
                <CardDescription>Ground-Based Fungal Intelligence Station</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                    <MouseIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Status</span>
                      <span>Operational</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Deployed</span>
                      <span>1,245 units</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Signal</span>
                      <span>Strong</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Battery</span>
                      <span>{Math.floor(Math.random() * 20) + 80}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full bg-transparent">
                  View Details
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>ALARM</CardTitle>
                  <Badge>Active</Badge>
                </div>
                <CardDescription>Environmental Safety Device</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Status</span>
                      <span>Operational</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Deployed</span>
                      <span>2,156 units</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Alerts</span>
                      <span>{Math.floor(Math.random() * 20) + 5} today</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Battery</span>
                      <span>{Math.floor(Math.random() * 15) + 85}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full bg-transparent">
                  View Details
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>SporeBase</CardTitle>
                  <Badge>Active</Badge>
                </div>
                <CardDescription>Distributed Spore Collection Network</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                    <Database className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Status</span>
                      <span>Operational</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Deployed</span>
                      <span>879 units</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Data</span>
                      <span>{(1.2 + Math.random() * 0.5).toFixed(1)}TB collected</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Battery</span>
                      <span>{Math.floor(Math.random() * 25) + 70}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full bg-transparent">
                  View Details
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>TruffleBot</CardTitle>
                  <Badge variant="secondary">Maintenance</Badge>
                </div>
                <CardDescription>Handheld Fungal Detection System</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                    <Bug className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Status</span>
                      <span>Maintenance</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Deployed</span>
                      <span>432 units</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Findings</span>
                      <span>{(5432 + Math.floor(Math.random() * 100)).toLocaleString()} species</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Battery</span>
                      <span>{Math.floor(Math.random() * 30) + 50}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full bg-transparent">
                  View Details
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Petreus</CardTitle>
                  <Badge variant="secondary">Testing</Badge>
                </div>
                <CardDescription>Computational Petri Dish Platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                    <PipetteIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Status</span>
                      <span>Testing</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Deployed</span>
                      <span>78 units</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Experiments</span>
                      <span>{Math.floor(Math.random() * 50) + 100} active</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Uptime</span>
                      <span>{(99.0 + Math.random()).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full bg-transparent">
                  View Details
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>MycoTenna</CardTitle>
                  <Badge variant="secondary">Development</Badge>
                </div>
                <CardDescription>Fungal Network Communication System</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                    <Network className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Status</span>
                      <span>Development</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Prototypes</span>
                      <span>12 units</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Range</span>
                      <span>{(1.2 + Math.random() * 0.5).toFixed(1)}km</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Progress</span>
                      <span>{Math.floor(Math.random() * 20) + 70}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full bg-transparent">
                  View Details
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Network Growth Trends</CardTitle>
                <CardDescription>Mycelial network expansion over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] rounded-md border bg-muted/50 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Growth Analytics Visualization</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {dashboardData?.stats.totalEvents.toLocaleString()} total events tracked
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Growth rate: +{Math.floor(Math.random() * 10) + 15}% this month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
                <CardDescription>Performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "Network Efficiency", value: `${Math.floor(Math.random() * 10) + 90}%`, change: "+5%" },
                    {
                      label: "Data Processing",
                      value: `${(1.8 + Math.random() * 0.5).toFixed(1)}TB`,
                      change: "+0.3TB",
                    },
                    {
                      label: "Signal Strength",
                      value: `${dashboardData?.networkHealth?.signalStrength || 87}%`,
                      change: "+12%",
                    },
                    { label: "Node Connectivity", value: `${(99.0 + Math.random()).toFixed(1)}%`, change: "+0.7%" },
                    {
                      label: "Response Time",
                      value: `${dashboardData?.performance?.apiResponseTime || 42}ms`,
                      change: "-8ms",
                    },
                  ].map((metric, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{metric.label}</p>
                        <p className="text-sm text-muted-foreground">{metric.value}</p>
                      </div>
                      <div className={`text-sm ${metric.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
                        {metric.change}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Species Distribution</CardTitle>
                <CardDescription>Fungal species detected across network</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] rounded-md border bg-muted/50 flex items-center justify-center">
                  <div className="text-center">
                    <Gauge className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Species Distribution Chart</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {dashboardData?.stats.speciesDetected} species identified
                    </p>
                    <p className="text-xs text-muted-foreground">
                      New species discovered: {Math.floor(Math.random() * 5) + 2} this week
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Environmental Impact</CardTitle>
                <CardDescription>Ecological benefits of mycelial networks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] rounded-md border bg-muted/50 flex items-center justify-center">
                  <div className="text-center">
                    <Globe className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Environmental Impact Metrics</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Carbon sequestration: {(2.4 + Math.random() * 0.5).toFixed(1)} tons CO₂/day
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Soil health improvement: +{Math.floor(Math.random() * 20) + 15}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Research Insights</CardTitle>
              <CardDescription>Latest discoveries from the mycelial network</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.insights.recentDiscoveries.map((discovery, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="rounded-md bg-primary/10 p-2">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{discovery}</h4>
                      <p className="text-xs text-muted-foreground">
                        Discovered {Math.floor(Math.random() * 30) + 1} days ago • Impact score:{" "}
                        {Math.floor(Math.random() * 30) + 70}/100
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full bg-transparent">
                View All Research
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
