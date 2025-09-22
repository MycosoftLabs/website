"use client"

import { CardDescription } from "@/components/ui/card"

import { CardContent } from "@/components/ui/card"

import { CardTitle } from "@/components/ui/card"

import { CardHeader } from "@/components/ui/card"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Activity, TrendingUp, Zap, Wind, Thermometer, RotateCw, Droplets } from "lucide-react"
import type { SporeDataPoint } from "@/lib/types"
import type { SporeDetector } from "@/components/apps/spore-tracker/spore-map"
import { atlas } from "azure-maps-control"

interface SporeMapProps {
  className?: string
  mapType: "satellite" | "topographic" | "street"
  showWindOverlay: boolean
  showSporeDetectors: boolean
  showHeatmap: boolean
  selectedRegion: string | null
  zoomLevel: number
  onZoomChange: (zoom: number) => void
  onRegionSelect: (region: string | null) => void
}

const mockDetectors: SporeDetector[] = [
  {
    id: "det-001",
    name: "Pacific Northwest Station",
    lat: 47.6062,
    lng: -122.3321,
    sporeCount: 1250,
    temperature: 18,
    humidity: 75,
    windSpeed: 12,
    status: "active",
  },
  {
    id: "det-002",
    name: "Great Lakes Monitor",
    lat: 41.8781,
    lng: -87.6298,
    sporeCount: 890,
    temperature: 22,
    humidity: 68,
    windSpeed: 8,
    status: "active",
  },
  {
    id: "det-003",
    name: "Appalachian Tracker",
    lat: 35.7796,
    lng: -78.6382,
    sporeCount: 1450,
    temperature: 25,
    humidity: 82,
    windSpeed: 6,
    status: "active",
  },
  {
    id: "det-004",
    name: "Rocky Mountain Station",
    lat: 39.7392,
    lng: -104.9903,
    sporeCount: 720,
    temperature: 15,
    humidity: 45,
    windSpeed: 15,
    status: "maintenance",
  },
  {
    id: "det-005",
    name: "California Coastal",
    lat: 34.0522,
    lng: -118.2437,
    sporeCount: 980,
    temperature: 21,
    humidity: 70,
    windSpeed: 10,
    status: "active",
  },
]

export function SporeMap({
  className,
  mapType,
  showWindOverlay,
  showSporeDetectors,
  showHeatmap,
  selectedRegion,
  zoomLevel,
  onZoomChange,
  onRegionSelect,
}: SporeMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [selectedDetector, setSelectedDetector] = useState<SporeDetector | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sporeData, setSporeData] = useState<SporeDataPoint[]>([])
  const [mapStyle, setMapStyle] = useState<"road" | "satellite" | "hybrid">("road")
  const [showHeatmapState, setShowHeatmapState] = useState(showHeatmap)
  const [showWindOverlayState, setShowWindOverlayState] = useState(showWindOverlay)

  useEffect(() => {
    let isMounted = true

    const initializeMap = async () => {
      try {
        if (!mapRef.current) return

        // Load Azure Maps SDK dynamically
        const script = document.createElement("script")
        script.src = "https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.js"
        script.async = true

        script.onload = async () => {
          if (!isMounted) return

          // Load CSS
          const link = document.createElement("link")
          link.rel = "stylesheet"
          link.href = "https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.css"
          document.head.appendChild(link)

          // Get auth token
          const authResponse = await fetch("/api/maps/auth")
          const { token } = await authResponse.json()

          if (!isMounted) return

          // Initialize map
          const mapInstance = new atlas.Map(mapRef.current, {
            center: [-98.5795, 39.8283], // Center of US
            zoom: zoomLevel,
            style: mapType === "satellite" ? "satellite" : mapType === "topographic" ? "grayscale_light" : "road",
            authOptions: {
              authType: atlas.AuthenticationType.anonymous,
              clientId: process.env.NEXT_PUBLIC_AZURE_MAPS_CLIENT_ID,
              getToken: () => Promise.resolve(token),
            },
          })

          mapInstance.events.add("ready", () => {
            if (!isMounted) return

            setMap(mapInstance)
            setIsLoading(false)

            // Add data sources and layers
            const dataSource = new atlas.source.DataSource()
            mapInstance.sources.add(dataSource)

            // Add spore detectors
            if (showSporeDetectors) {
              mockDetectors.forEach((detector) => {
                const point = new atlas.data.Point([detector.lng, detector.lat])
                const feature = new atlas.data.Feature(point, {
                  id: detector.id,
                  name: detector.name,
                  sporeCount: detector.sporeCount,
                  temperature: detector.temperature,
                  humidity: detector.humidity,
                  windSpeed: detector.windSpeed,
                  status: detector.status,
                })
                dataSource.add(feature)
              })

              // Add symbol layer
              const symbolLayer = new atlas.layer.SymbolLayer(dataSource, null, {
                iconOptions: {
                  image: "pin-blue",
                  allowOverlap: true,
                  anchor: "center",
                  size: 0.8,
                },
                textOptions: {
                  textField: ["get", "name"],
                  color: "#000000",
                  offset: [0, -2],
                  size: 12,
                },
              })
              mapInstance.layers.add(symbolLayer)

              // Add click event
              mapInstance.events.add("click", symbolLayer, (e: any) => {
                if (e.shapes && e.shapes.length > 0) {
                  const properties = e.shapes[0].getProperties()
                  const detector = mockDetectors.find((d) => d.id === properties.id)
                  if (detector) {
                    setSelectedDetector(detector)
                    onRegionSelect(detector.name)
                  }
                }
              })
            }

            // Add heatmap if enabled
            if (showHeatmapState) {
              const heatmapLayer = new atlas.layer.HeatMapLayer(dataSource, null, {
                radius: 50,
                opacity: 0.6,
                intensity: 0.8,
                weight: ["get", "sporeCount"],
              })
              mapInstance.layers.add(heatmapLayer)
            }
          })

          mapInstance.events.add("zoom", () => {
            if (isMounted) {
              onZoomChange(mapInstance.getCamera().zoom || 2)
            }
          })
        }

        document.head.appendChild(script)
      } catch (error) {
        console.error("Error initializing map:", error)
        setIsLoading(false)
      }
    }

    initializeMap()

    return () => {
      isMounted = false
      if (map) {
        map.dispose()
      }
    }
  }, [mapType, showSporeDetectors, showHeatmapState, showWindOverlayState, zoomLevel])

  const handleDetectorClick = (detector: SporeDetector) => {
    setSelectedDetector(detector)
    onRegionSelect(detector.name)

    if (map) {
      map.setCamera({
        center: [detector.lng, detector.lat],
        zoom: Math.max(zoomLevel, 8),
      })
    }
  }

  const handleRefreshData = () => {
    setIsLoading(true)
    // Simulate data refresh
    setTimeout(() => {
      setIsLoading(false)
      // Update spore counts with random values
      mockDetectors.forEach((detector) => {
        if (detector.status === "active") {
          detector.sporeCount = Math.floor(Math.random() * 4000) + 500
        }
      })
    }, 1500)
  }

  const activeDetectors = mockDetectors.filter((d) => d.status === "active")
  const totalSpores = mockDetectors.reduce((sum, d) => sum + (d.sporeCount || 0), 0)
  const averageSpores = Math.round(totalSpores / activeDetectors.length)

  if (isLoading) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-muted rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading interactive map...</p>
        </div>
      </div>
    )
  }

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
          <Button
            variant={showHeatmapState ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHeatmapState(!showHeatmapState)}
          >
            <Thermometer className="h-4 w-4 mr-2" />
            Heatmap
          </Button>
          <Button
            variant={showWindOverlayState ? "default" : "outline"}
            size="sm"
            onClick={() => setShowWindOverlayState(!showWindOverlayState)}
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
            <div className="text-2xl font-bold">{activeDetectors.length}</div>
            <p className="text-xs text-muted-foreground">{mockDetectors.length - activeDetectors.length} offline</p>
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
        <div className="lg:col-span-2 relative h-[600px] rounded-lg overflow-hidden">
          <div ref={mapRef} className="w-full h-full" />

          {/* Wind overlay indicator */}
          {showWindOverlayState && (
            <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-2">
              <div className="flex items-center gap-2 text-sm">
                <Wind className="h-4 w-4 text-blue-500" />
                <span>Wind Overlay Active</span>
              </div>
            </div>
          )}

          {/* Detector list */}
          {showSporeDetectors && (
            <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-4 max-w-xs">
              <h3 className="font-semibold mb-2">Spore Detectors</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {mockDetectors.map((detector) => (
                  <Button
                    key={detector.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start p-2 h-auto"
                    onClick={() => handleDetectorClick(detector)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <MapPin className="h-3 w-3" />
                      <div className="flex-1 text-left">
                        <div className="text-xs font-medium">{detector.name}</div>
                        <div className="text-xs text-muted-foreground">{detector.sporeCount} spores/m³</div>
                      </div>
                      <Badge
                        variant={
                          detector.status === "active"
                            ? "default"
                            : detector.status === "maintenance"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {detector.status}
                      </Badge>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Selected detector info */}
          {selectedDetector && (
            <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-4 min-w-64">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{selectedDetector.name}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedDetector(null)
                    onRegionSelect(null)
                  }}
                >
                  ×
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{selectedDetector.sporeCount} spores/m³</span>
                </div>
                <div className="flex items-center gap-1">
                  <Thermometer className="h-3 w-3" />
                  <span>{selectedDetector.temperature}°C</span>
                </div>
                <div className="flex items-center gap-1">
                  <Droplets className="h-3 w-3" />
                  <span>{selectedDetector.humidity}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="h-3 w-3" />
                  <span>{selectedDetector.windSpeed} km/h</span>
                </div>
              </div>
              <Badge
                variant={
                  selectedDetector.status === "active"
                    ? "default"
                    : selectedDetector.status === "maintenance"
                      ? "secondary"
                      : "destructive"
                }
                className="mt-2"
              >
                {selectedDetector.status}
              </Badge>
            </div>
          )}
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
                      variant={showHeatmapState ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowHeatmapState(!showHeatmapState)}
                    >
                      {showHeatmapState ? "On" : "Off"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Wind Patterns</span>
                    </div>
                    <Button
                      variant={showWindOverlayState ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowWindOverlayState(!showWindOverlayState)}
                    >
                      {showWindOverlayState ? "On" : "Off"}
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
                {selectedDetector ? "Selected station information" : "Click a station on the map"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDetector ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedDetector.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: {selectedDetector.id}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        selectedDetector.status === "active"
                          ? "default"
                          : selectedDetector.status === "maintenance"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {selectedDetector.status}
                    </Badge>
                    {selectedDetector.status === "active" && (
                      <Badge variant="outline" className="text-green-600">
                        Online
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Spore Count:</span>
                      <span className="text-lg font-bold text-primary">
                        {selectedDetector.sporeCount?.toLocaleString() || 0}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm">Coordinates:</span>
                      <span className="text-sm font-mono">
                        {selectedDetector.lat.toFixed(4)}, {selectedDetector.lng.toFixed(4)}
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
                        <span>{selectedDetector.temperature}°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Humidity:</span>
                        <span>{selectedDetector.humidity}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Wind Speed:</span>
                        <span>{selectedDetector.windSpeed} km/h</span>
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
                {mockDetectors.slice(0, 4).map((detector, index) => (
                  <div key={detector.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${detector.status === "active" ? "bg-green-500" : "bg-red-500"}`}
                      />
                      <div>
                        <p className="text-sm font-medium">{detector.name}</p>
                        <p className="text-xs text-muted-foreground">{Math.floor(Math.random() * 60)} minutes ago</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {detector.sporeCount?.toLocaleString() || 0}
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
                  {showHeatmapState && (
                    <Badge variant="outline" className="mr-1">
                      Heatmap
                    </Badge>
                  )}
                  {showWindOverlayState && <Badge variant="outline">Wind</Badge>}
                  {!showHeatmapState && !showWindOverlayState && (
                    <span className="text-muted-foreground">None active</span>
                  )}
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
                {showHeatmapState && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Heatmap overlay active</p>
                      <p className="text-xs text-muted-foreground">Showing spore concentration patterns</p>
                    </div>
                  </div>
                )}
                {showWindOverlayState && (
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
