"use client"

import { CardFooter } from "@/components/ui/card"

import { CardDescription } from "@/components/ui/card"

import { useState } from "react"
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
  Settings,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import dynamic from "next/dynamic"
import type { CircularProgressProps } from "@/components/dashboard/circular-progress"

import {
  useSystemMetrics,
  useMyceliumNetwork,
  useDeviceTelemetry,
  useRecentActivity,
  mockSystemMetrics,
  mockMyceliumNetwork,
  mockDeviceTelemetry,
  mockRecentActivity,
} from "@/lib/natureos-api"

const AzureMap = dynamic(() => import("@/components/maps/azure-map").then((mod) => mod.AzureMap), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
})

const CircularProgressComponent = dynamic<CircularProgressProps>(
  () => import("@/components/dashboard/circular-progress").then((mod) => mod.CircularProgress),
  {
    ssr: false,
    loading: () => <p>Loading circular progress...</p>,
  },
)

export function NatureOSDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  const { metrics, isLoading: metricsLoading, isError: metricsError } = useSystemMetrics()
  const { network, isLoading: networkLoading, isError: networkError } = useMyceliumNetwork()
  const { devices, isLoading: devicesLoading, isError: devicesError } = useDeviceTelemetry()
  const { activities, isLoading: activitiesLoading, isError: activitiesError } = useRecentActivity(5)

  // Use real data if available, otherwise fall back to mock data
  const systemMetrics = metrics || mockSystemMetrics
  const myceliumNetwork = network || mockMyceliumNetwork
  const deviceTelemetry = devices || mockDeviceTelemetry
  const recentActivity = activities || mockRecentActivity

  // Device locations for map
  const deviceLocations = deviceTelemetry
    .map((device) => ({
      id: device.deviceId,
      name: `${device.deviceType} - ${device.location?.latitude.toFixed(2) || "Unknown"}`,
      location: device.location
        ? ([device.location.longitude, device.location.latitude] as [number, number])
        : ([0, 0] as [number, number]),
      status: device.status,
    }))
    .filter((d) => d.location[0] !== 0 && d.location[1] !== 0)

  // Status icon mapping
  const activityIcons = {
    ai_training: Bot,
    network_event: Network,
    deployment: Cloud,
    backup: Database,
    alert: AlertCircle,
    anomaly: Bug,
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

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Nodes</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myceliumNetwork.activeNodes.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +{myceliumNetwork.totalNodes - myceliumNetwork.activeNodes} from last hour
                </p>
                <div className="mt-4">
                  <Progress value={(myceliumNetwork.activeNodes / myceliumNetwork.totalNodes) * 100} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Requests</CardTitle>
                <Code className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(systemMetrics.apiRequests.total / 1000000).toFixed(1)}M</div>
                <p className="text-xs text-muted-foreground">
                  {(systemMetrics.apiRequests.perMinute / 1000).toFixed(0)}k requests/min
                </p>
                <div className="mt-4">
                  <Progress value={systemMetrics.apiRequests.successRate} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Operations</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(systemMetrics.aiOperations.total / 1000).toFixed(0)}k</div>
                <p className="text-xs text-muted-foreground">{systemMetrics.aiOperations.successRate}% success rate</p>
                <div className="mt-4">
                  <Progress value={systemMetrics.aiOperations.successRate} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.storage.used.toFixed(1)}TB</div>
                <p className="text-xs text-muted-foreground">of {systemMetrics.storage.total}TB total</p>
                <div className="mt-4">
                  <Progress value={systemMetrics.storage.percentage} />
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
                  <AzureMap className="rounded-none border-0" deviceLocations={deviceLocations} />
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
                  <CircularProgressComponent value={myceliumNetwork.growthRate} icon={LineChart} label="Growth Rate" />
                  <CircularProgressComponent
                    value={myceliumNetwork.networkHealth}
                    icon={Network}
                    label="Network Health"
                  />
                  <CircularProgressComponent
                    value={(myceliumNetwork.activeNodes / myceliumNetwork.totalNodes) * 100}
                    icon={Activity}
                    label="Active Nodes"
                  />
                  <CircularProgressComponent value={45} icon={Zap} label="Energy Usage" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-full md:col-span-1">
              <CardHeader>
                <CardTitle>Mycosoft Devices</CardTitle>
                <CardDescription>Status of connected hardware</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      name: "Mushroom 1",
                      count: systemMetrics.devices.byType.mushroom1 || 1245,
                      status: "Operational",
                      icon: MouseIcon,
                    },
                    {
                      name: "SporeBase",
                      count: systemMetrics.devices.byType.sporebase || 879,
                      status: "Operational",
                      icon: Database,
                    },
                    {
                      name: "TruffleBot",
                      count: systemMetrics.devices.byType.trufflebot || 432,
                      status: "Maintenance",
                      icon: Bug,
                    },
                    {
                      name: "ALARM",
                      count: systemMetrics.devices.byType.alarm || 2156,
                      status: "Operational",
                      icon: AlertCircle,
                    },
                    {
                      name: "Petreus",
                      count: systemMetrics.devices.byType.petreus || 78,
                      status: "Testing",
                      icon: PipetteIcon,
                    },
                  ].map((device) => (
                    <div key={device.name} className="flex items-center">
                      <div className="mr-4 rounded-md bg-primary/10 p-2">
                        <device.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-none">{device.name}</p>
                        <p className="text-sm text-muted-foreground">{device.count} active</p>
                      </div>
                      <Badge variant={device.status === "Operational" ? "default" : "secondary"}>{device.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-full md:col-span-1">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((item) => {
                    const Icon = activityIcons[item.type] || AlertCircle
                    const timeAgo = new Date(item.timestamp).toLocaleTimeString()

                    return (
                      <div key={item.id} className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-full ${
                            item.status === "success" ? "bg-green-500/20" : "bg-yellow-500/20"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${item.status === "success" ? "text-green-500" : "text-yellow-500"}`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{item.message}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </div>
                      </div>
                    )
                  })}
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
                      <p className="text-sm text-muted-foreground">{myceliumNetwork.signalStrength}% optimal</p>
                    </div>
                    <div className="text-right">
                      <Badge>{myceliumNetwork.signalStrength > 80 ? "Strong" : "Normal"}</Badge>
                    </div>
                  </div>
                  <Progress value={myceliumNetwork.signalStrength} />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Growth Rate</p>
                      <p className="text-sm text-muted-foreground">{myceliumNetwork.growthRate}% above baseline</p>
                    </div>
                    <div className="text-right">
                      <Badge>Excellent</Badge>
                    </div>
                  </div>
                  <Progress value={myceliumNetwork.growthRate} />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Nutrient Flow</p>
                      <p className="text-sm text-muted-foreground">Optimal distribution</p>
                    </div>
                    <div className="text-right">
                      <Badge>Normal</Badge>
                    </div>
                  </div>
                  <Progress value={myceliumNetwork.nutrientFlow} />
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
                <div className="text-2xl font-bold">{myceliumNetwork.density.toFixed(2)} g/cm³</div>
                <p className="text-xs text-muted-foreground">+0.12 from last week</p>
                <div className="mt-4 h-[60px]">
                  <div className="h-full w-full rounded-md bg-muted/50"></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Network Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myceliumNetwork.connections.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+2,345 from last week</p>
                <div className="mt-4 h-[60px]">
                  <div className="h-full w-full rounded-md bg-muted/50"></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Signal Propagation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myceliumNetwork.propagationSpeed.toFixed(1)} cm/s</div>
                <p className="text-xs text-muted-foreground">+0.5 from baseline</p>
                <div className="mt-4 h-[60px]">
                  <div className="h-full w-full rounded-md bg-muted/50"></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Bioelectric Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myceliumNetwork.bioelectricActivity} mV</div>
                <p className="text-xs text-muted-foreground">+12 from baseline</p>
                <div className="mt-4 h-[60px]">
                  <div className="h-full w-full rounded-md bg-muted/50"></div>
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
                      <span>{systemMetrics.devices.byType.mushroom1 || 1245} units</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Signal</span>
                      <span>Strong</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Battery</span>
                      <span>87%</span>
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
                      <span>{systemMetrics.devices.byType.alarm || 2156} units</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Alerts</span>
                      <span>12 today</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Battery</span>
                      <span>92%</span>
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
                      <span>{systemMetrics.devices.byType.sporebase || 879} units</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Data</span>
                      <span>1.2TB collected</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Battery</span>
                      <span>76%</span>
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
                      <span>{systemMetrics.devices.byType.trufflebot || 432} units</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Findings</span>
                      <span>5,432 species</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Battery</span>
                      <span>54%</span>
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
                      <span>{systemMetrics.devices.byType.petreus || 78} units</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Experiments</span>
                      <span>124 active</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Uptime</span>
                      <span>99.2%</span>
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
                      <span>1.2km</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Progress</span>
                      <span>76%</span>
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
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>System-wide performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] rounded-md border bg-muted/50 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Analytics Dashboard</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Network Growth</CardTitle>
                <CardDescription>Historical network expansion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] rounded-md border bg-muted/50 flex items-center justify-center">
                  <div className="text-center">
                    <LineChart className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Growth Trends</p>
                  </div>
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Research Publications</CardTitle>
              <CardDescription>Latest scientific findings from Mycosoft research</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: "Bioelectric Signaling in Mycelial Networks",
                    authors: "Zhang, J., Smith, A., Patel, R.",
                    journal: "Journal of Fungal Intelligence",
                    date: "April 2025",
                  },
                  {
                    title: "Distributed Computing Through Fungal Networks",
                    authors: "Johnson, M., Williams, T., Garcia, L.",
                    journal: "Biological Computing Quarterly",
                    date: "March 2025",
                  },
                  {
                    title: "Environmental Monitoring Using Mycelium-Based Sensors",
                    authors: "Brown, K., Lee, S., Nguyen, T.",
                    journal: "Environmental Science & Technology",
                    date: "February 2025",
                  },
                  {
                    title: "Fungal Intelligence: A New Paradigm for Sustainable Computing",
                    authors: "Rockwell, M., Chen, H., Anderson, P.",
                    journal: "Nature Biotechnology",
                    date: "January 2025",
                  },
                ].map((paper, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="rounded-md bg-primary/10 p-2">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{paper.title}</h4>
                      <p className="text-xs text-muted-foreground">{paper.authors}</p>
                      <p className="text-xs text-muted-foreground">
                        {paper.journal} • {paper.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full bg-transparent">
                View All Publications
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
