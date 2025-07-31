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
                <div className="text-2xl font-bold">2,345</div>
                <p className="text-xs text-muted-foreground">+180 from last hour</p>
                <div className="mt-4">
                  <Progress value={65} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Requests</CardTitle>
                <Code className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.2M</div>
                <p className="text-xs text-muted-foreground">23k requests/min</p>
                <div className="mt-4">
                  <Progress value={78} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Operations</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">845k</div>
                <p className="text-xs text-muted-foreground">98.2% success rate</p>
                <div className="mt-4">
                  <Progress value={98} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.8TB</div>
                <p className="text-xs text-muted-foreground">of 2.5TB total</p>
                <div className="mt-4">
                  <Progress value={72} />
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
                        status: "inactive",
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
                  <CircularProgressComponent value={78} icon={LineChart} label="Growth Rate" />
                  <CircularProgressComponent value={92} icon={Network} label="Network Health" />
                  <CircularProgressComponent value={64} icon={Activity} label="Active Nodes" />
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
                    { name: "Mushroom 1", count: 1245, status: "Operational", icon: MouseIcon },
                    { name: "SporeBase", count: 879, status: "Operational", icon: Database },
                    { name: "TruffleBot", count: 432, status: "Maintenance", icon: Bug },
                    { name: "ALARM", count: 2156, status: "Operational", icon: AlertCircle },
                    { name: "Petreus", count: 78, status: "Testing", icon: PipetteIcon },
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
                  <Button className="w-full justify-start" variant="outline">
                    <Bot className="mr-2 h-4 w-4" />
                    Launch AI Studio
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Globe className="mr-2 h-4 w-4" />
                    View Global Network
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Code className="mr-2 h-4 w-4" />
                    API Documentation
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Cloud className="mr-2 h-4 w-4" />
                    Deploy New Node
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
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
                      <p className="text-sm text-muted-foreground">87% optimal</p>
                    </div>
                    <div className="text-right">
                      <Badge>Strong</Badge>
                    </div>
                  </div>
                  <Progress value={87} />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Growth Rate</p>
                      <p className="text-sm text-muted-foreground">23% above baseline</p>
                    </div>
                    <div className="text-right">
                      <Badge>Excellent</Badge>
                    </div>
                  </div>
                  <Progress value={78} />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Nutrient Flow</p>
                      <p className="text-sm text-muted-foreground">Optimal distribution</p>
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
                  <div className="h-full w-full rounded-md bg-muted/50"></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Network Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12,543</div>
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
                <div className="text-2xl font-bold">3.2 cm/s</div>
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
                <div className="text-2xl font-bold">78 mV</div>
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
                      <span>1,245 units</span>
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
                <Button variant="outline" className="w-full">
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
                <Button variant="outline" className="w-full">
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
                <Button variant="outline" className="w-full">
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
                <Button variant="outline" className="w-full">
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
                <Button variant="outline" className="w-full">
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
                <Button variant="outline" className="w-full">
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
                    { label: "Network Efficiency", value: "92%", change: "+5%" },
                    { label: "Data Processing", value: "1.8TB", change: "+0.3TB" },
                    { label: "Signal Strength", value: "87%", change: "+12%" },
                    { label: "Node Connectivity", value: "99.2%", change: "+0.7%" },
                    { label: "Response Time", value: "42ms", change: "-8ms" },
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
              <Button variant="outline" className="w-full">
                View All Publications
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
