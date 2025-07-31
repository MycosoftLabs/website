"use client"

import { useState, useEffect } from "react"
import { AzureMap } from "@/components/maps/azure-map"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Activity, TrendingUp, Zap, Wind, Thermometer, Layers, RotateCw } from "lucide-react"
import type { DeviceLocation, SporeDataPoint } from "@/lib/types"

interface SporeMapProps {
  className?: string
}

export function SporeMap({ className }: SporeMapProps) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceLocation | null>(null)
  const [sporeData, setSporeData] = useState<SporeDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mapStyle, setMapStyle] = useState<"road" | "satellite" | "hybrid">("road")
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showWindOverlay, setShowWindOverlay] = useState(false)

  // Mock spore data - replace with actual API call
  const mockDevices: DeviceLocation[] = [
    {
      id: "spore-1",
      name: "Golden Gate Spore Station",
      location: [-122.4194, 37.7749], // [longitude, latitude]
      status: "active",
      sporeCount: 1245,
    },
    {
      id: "spore-2",
      name: "Central Park Monitor",
      location: [-73.9712, 40.7831],
      status: "active",
      sporeCount: 987,
    },
    {
      id: "spore-3",
      name: "Hyde Park Sensor",
      location: [-0.1656, 51.5074],
      status: "inactive",
      sporeCount: 0,
    },
    {
      id: "spore-4",
      name: "Tokyo Bay Collector",
      location: [139.7594, 35.6762],
      status: "active",
      sporeCount: 2156,
    },
    {
      id: "spore-5",
      name: "Sydney Harbor Station",
      location: [151.2093, -33.8688],
      status: "active",
      sporeCount: 1432,
    },
    {
      id: "spore-6",
      name: "Berlin Forest Monitor",
      location: [13.405, 52.52],
      status: "active",
      sporeCount: 876,
    },
    {
      id: "spore-7",
      name: "Amazon Basin Sensor",
      location: [-60.0261, -3.4653],
      status: "active",
      sporeCount: 3421,
    },
    {
      id: "spore-8",
      name: "Yellowstone Detector",
      location: [-110.5885, 44.428],
      status: "active",
      sporeCount: 1654,
    },
  ]

  useEffect(() => {
    // Simulate loading spore data
    const loadSporeData = async () => {
      setIsLoading(true)

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Generate mock spore data points
      const mockSporeData: SporeDataPoint[] = mockDevices.map((device) => ({
        id: `data-${device.id}`,
        speciesName: `Species ${Math.floor(Math.random() * 100)}`,
        latitude: device.location[1],
        longitude: device.location[0],
        concentration: device.sporeCount || 0,
        timestamp: new Date().toISOString(),
        status: device.status,
      }))

      setSporeData(mockSporeData)
      setIsLoading(false)
    }

    loadSporeData()
  }, [])

  const handleDeviceClick = (device: DeviceLocation) => {
    setSelectedDevice(device)
  }

  const handleRefreshData = () => {
    setIsLoading(true)
    // Simulate data refresh
    setTimeout(() => {
      setIsLoading(false)
      // Update spore counts with random values
      mockDevices.forEach((device) => {
        if (device.status === "active") {
          device.sporeCount = Math.floor(Math.random() * 4000) + 500
        }
      })
    }, 1500)
  }

  const activeDevices = mockDevices.filter((d) => d.status === "active")
  const totalSpores = mockDevices.reduce((sum, d) => sum + (d.sporeCount || 0), 0)
  const averageSpores = Math.round(totalSpores / activeDevices.length)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Spore Tracker</h1>
          <p className="text-muted-foreground">
            Real-time global monitoring of fungal spore concentrations and distribution patterns
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={showHeatmap ? "default" : "outline"} size="sm" onClick={() => setShowHeatmap(!showHeatmap)}>
            <Thermometer className="h-4 w-4 mr-2" />
            Heatmap
          </Button>
          <Button
            variant={showWindOverlay ? "default" : "outline"}
            size="sm"
            onClick={() => setShowWindOverlay(!showWindOverlay)}
          >
            <Wind className="h-4 w-4 mr-2" />
            Wind
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefreshData} disabled={isLoading}>
            <RotateCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Stations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDevices.length}</div>
            <p className="text-xs text-muted-foreground">{mockDevices.length - activeDevices.length} offline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spores</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSpores.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Count</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageSpores.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Per station</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Detection Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12.5%</div>
            <p className="text-xs text-muted-foreground">vs. last week</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Global Spore Detection Network</CardTitle>
                  <CardDescription>Real-time monitoring of fungal spore concentrations worldwide</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant={mapStyle === "road" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMapStyle("road")}
                  >
                    Road
                  </Button>
                  <Button
                    variant={mapStyle === "satellite" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMapStyle("satellite")}
                  >
                    Satellite
                  </Button>
                  <Button
                    variant={mapStyle === "hybrid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMapStyle("hybrid")}
                  >
                    Hybrid
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <AzureMap
                devices={mockDevices}
                height="600px"
                zoom={2}
                center={[0, 20]}
                onDeviceClick={handleDeviceClick}
                mapStyle={mapStyle}
                showHeatmap={showHeatmap}
                showWindOverlay={showWindOverlay}
              />
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Map Style Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Map Controls</CardTitle>
              <CardDescription>Customize map appearance and overlays</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Map Style</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={mapStyle === "road" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMapStyle("road")}
                    className="w-full"
                  >
                    Road
                  </Button>
                  <Button
                    variant={mapStyle === "satellite" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMapStyle("satellite")}
                    className="w-full"
                  >
                    Satellite
                  </Button>
                  <Button
                    variant={mapStyle === "hybrid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMapStyle("hybrid")}
                    className="w-full"
                  >
                    Hybrid
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Overlays</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Spore Heatmap</span>
                    </div>
                    <Button
                      variant={showHeatmap ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowHeatmap(!showHeatmap)}
                    >
                      {showHeatmap ? "On" : "Off"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Wind Patterns</span>
                    </div>
                    <Button
                      variant={showWindOverlay ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowWindOverlay(!showWindOverlay)}
                    >
                      {showWindOverlay ? "On" : "Off"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshData}
                  disabled={isLoading}
                  className="w-full bg-transparent"
                >
                  <RotateCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  {isLoading ? "Refreshing..." : "Refresh Data"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Device Details */}
          <Card>
            <CardHeader>
              <CardTitle>Station Details</CardTitle>
              <CardDescription>
                {selectedDevice ? "Selected station information" : "Click a station on the map"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDevice ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedDevice.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: {selectedDevice.id}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={selectedDevice.status === "active" ? "default" : "secondary"}>
                      {selectedDevice.status}
                    </Badge>
                    {selectedDevice.status === "active" && (
                      <Badge variant="outline" className="text-green-600">
                        Online
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Spore Count:</span>
                      <span className="text-lg font-bold text-primary">
                        {selectedDevice.sporeCount?.toLocaleString() || 0}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm">Coordinates:</span>
                      <span className="text-sm font-mono">
                        {selectedDevice.location[1].toFixed(4)}, {selectedDevice.location[0].toFixed(4)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm">Last Reading:</span>
                      <span className="text-sm">2 minutes ago</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm">Data Quality:</span>
                      <Badge variant="outline" className="text-green-600">
                        Excellent
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <h4 className="text-sm font-semibold">Environmental Data</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>Temperature:</span>
                        <span>23.5°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Humidity:</span>
                        <span>67%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Wind Speed:</span>
                        <span>12 km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pressure:</span>
                        <span>1013 hPa</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Select a station on the map to view detailed information
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest spore detection events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockDevices.slice(0, 4).map((device, index) => (
                  <div key={device.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${device.status === "active" ? "bg-green-500" : "bg-red-500"}`}
                      />
                      <div>
                        <p className="text-sm font-medium">{device.name}</p>
                        <p className="text-xs text-muted-foreground">{Math.floor(Math.random() * 60)} minutes ago</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {device.sporeCount?.toLocaleString() || 0}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Data Analysis Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Data Analysis</CardTitle>
          <CardDescription>Detailed analysis of spore detection patterns and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="species">Species</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Network Status</h4>
                  <div className="text-2xl font-bold text-green-600">98.7%</div>
                  <p className="text-xs text-muted-foreground">Uptime last 30 days</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Data Points</h4>
                  <div className="text-2xl font-bold">2.4M</div>
                  <p className="text-xs text-muted-foreground">Collected this month</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Trend analysis charts would be displayed here</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Current map style: <Badge variant="outline">{mapStyle}</Badge>
                </p>
                <p className="text-sm text-muted-foreground">
                  Overlays:{" "}
                  {showHeatmap && (
                    <Badge variant="outline" className="mr-1">
                      Heatmap
                    </Badge>
                  )}
                  {showWindOverlay && <Badge variant="outline">Wind</Badge>}
                  {!showHeatmap && !showWindOverlay && <span className="text-muted-foreground">None active</span>}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="species" className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Aspergillus niger</span>
                  <Badge variant="outline">34%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Penicillium chrysogenum</span>
                  <Badge variant="outline">28%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Cladosporium herbarum</span>
                  <Badge variant="outline">19%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Other species</span>
                  <Badge variant="outline">19%</Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">High spore concentration detected</p>
                    <p className="text-xs text-muted-foreground">Amazon Basin Sensor - 2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">New species detected</p>
                    <p className="text-xs text-muted-foreground">Tokyo Bay Collector - 4 hours ago</p>
                  </div>
                </div>
                {showHeatmap && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Heatmap overlay active</p>
                      <p className="text-xs text-muted-foreground">Showing spore concentration patterns</p>
                    </div>
                  </div>
                )}
                {showWindOverlay && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Wind overlay active</p>
                      <p className="text-xs text-muted-foreground">Displaying wind pattern data</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
