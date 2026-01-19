"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import dynamic from "next/dynamic"
import { MapControls } from "@/components/apps/spore-tracker/map-controls"
import { SporeDataExplorer } from "@/components/apps/spore-tracker/spore-data-explorer"
import { SporeInfoPanel } from "@/components/apps/spore-tracker/spore-info-panel"
import { SporeTrackerAbout } from "@/components/apps/spore-tracker/spore-tracker-about"
import { 
  Wind, 
  Thermometer, 
  Droplets, 
  Activity, 
  MapPin, 
  AlertTriangle,
  TrendingUp,
  Database,
  Filter,
  Layers,
  Clock,
  Globe
} from "lucide-react"

const SporeMap = dynamic(() => import("@/components/apps/spore-tracker/spore-map").then((mod) => mod.SporeMap), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
})

// Widget component for the sidebar
interface WidgetProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  badge?: string | number
  className?: string
}

function Widget({ title, icon, children, badge, className }: WidgetProps) {
  return (
    <Card className={className}>
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-2 px-3">
        {children}
      </CardContent>
    </Card>
  )
}

export function SporeTrackerApp() {
  const [activeTab, setActiveTab] = useState("map")
  const [mapType, setMapType] = useState<"satellite" | "topographic" | "street">("satellite")
  const [showWindOverlay, setShowWindOverlay] = useState(true)
  const [showSporeDetectors, setShowSporeDetectors] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(2)
  const [showDataExplorer, setShowDataExplorer] = useState(false)

  // Sample real-time data (would come from API in production)
  const liveStats = {
    activeDetectors: 47,
    totalDetectors: 52,
    sporesDetected: 12847,
    speciesIdentified: 156,
    alerts: 3,
    windSpeed: 12.5,
    humidity: 68,
    temperature: 18.3,
  }

  return (
    <div className="container py-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Spore Tracker</h1>
          <p className="text-lg text-muted-foreground">
            Global spore distribution tracking with real-time wind and weather data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-500 border-green-500">
            <Activity className="h-3 w-3 mr-1 animate-pulse" />
            Live
          </Badge>
          <Badge variant="secondary">
            {liveStats.activeDetectors}/{liveStats.totalDetectors} detectors online
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="map" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="map">Interactive Map</TabsTrigger>
          <TabsTrigger value="data">Data Explorer</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Main Map - 3 columns */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="p-0 overflow-hidden">
                <SporeMap
                  mapType={mapType}
                  showWindOverlay={showWindOverlay}
                  showSporeDetectors={showSporeDetectors}
                  showHeatmap={showHeatmap}
                  selectedRegion={selectedRegion}
                  zoomLevel={zoomLevel}
                  onZoomChange={setZoomLevel}
                  onRegionSelect={setSelectedRegion}
                />
              </Card>

              {/* Floating Data Explorer (toggleable) */}
              {showDataExplorer && (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="h-4 w-4 text-green-500" />
                      Quick Data Explorer
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowDataExplorer(false)}>
                      Close
                    </Button>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-background rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-500">{liveStats.sporesDetected.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Spores Detected (24h)</div>
                      </div>
                      <div className="bg-background rounded-lg p-3">
                        <div className="text-2xl font-bold text-blue-500">{liveStats.speciesIdentified}</div>
                        <div className="text-xs text-muted-foreground">Species Identified</div>
                      </div>
                      <div className="bg-background rounded-lg p-3">
                        <div className="text-2xl font-bold text-amber-500">{liveStats.alerts}</div>
                        <div className="text-xs text-muted-foreground">Active Alerts</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - 1 column with multiple widgets */}
            <div className="space-y-3">
              {/* Map Controls Widget */}
              <MapControls
                mapType={mapType}
                showWindOverlay={showWindOverlay}
                showSporeDetectors={showSporeDetectors}
                showHeatmap={showHeatmap}
                zoomLevel={zoomLevel}
                onMapTypeChange={setMapType}
                onWindOverlayChange={setShowWindOverlay}
                onSporeDetectorsChange={setShowSporeDetectors}
                onHeatmapChange={setShowHeatmap}
                onZoomChange={setZoomLevel}
              />

              {/* Live Environment Widget */}
              <Widget title="Live Environment" icon={<Thermometer className="h-3 w-3 text-orange-500" />}>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded p-2">
                    <Thermometer className="h-3 w-3 mx-auto mb-1 text-orange-500" />
                    <div className="text-sm font-bold">{liveStats.temperature}°C</div>
                    <div className="text-[10px] text-muted-foreground">Temp</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <Wind className="h-3 w-3 mx-auto mb-1 text-blue-500" />
                    <div className="text-sm font-bold">{liveStats.windSpeed} m/s</div>
                    <div className="text-[10px] text-muted-foreground">Wind</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <Droplets className="h-3 w-3 mx-auto mb-1 text-cyan-500" />
                    <div className="text-sm font-bold">{liveStats.humidity}%</div>
                    <div className="text-[10px] text-muted-foreground">Humidity</div>
                  </div>
                </div>
              </Widget>

              {/* Detector Network Widget */}
              <Widget 
                title="Detector Network" 
                icon={<MapPin className="h-3 w-3 text-green-500" />}
                badge={`${liveStats.activeDetectors}/${liveStats.totalDetectors}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Online</span>
                    <span className="text-green-500 font-medium">{liveStats.activeDetectors}</span>
                  </div>
                  <Progress value={(liveStats.activeDetectors / liveStats.totalDetectors) * 100} className="h-1" />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>Active: {liveStats.activeDetectors}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-gray-500" />
                      <span>Offline: {liveStats.totalDetectors - liveStats.activeDetectors}</span>
                    </div>
                  </div>
                </div>
              </Widget>

              {/* Spore Activity Widget */}
              <Widget 
                title="Spore Activity" 
                icon={<Activity className="h-3 w-3 text-purple-500" />}
                badge={liveStats.sporesDetected.toLocaleString()}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Detected (24h)</span>
                    <span className="font-medium">{liveStats.sporesDetected.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Species ID'd</span>
                    <span className="font-medium">{liveStats.speciesIdentified}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => setShowDataExplorer(!showDataExplorer)}
                  >
                    <Database className="h-3 w-3 mr-1" />
                    {showDataExplorer ? 'Hide' : 'Show'} Data Explorer
                  </Button>
                </div>
              </Widget>

              {/* Active Alerts Widget */}
              {liveStats.alerts > 0 && (
                <Widget 
                  title="Active Alerts" 
                  icon={<AlertTriangle className="h-3 w-3 text-amber-500" />}
                  badge={liveStats.alerts}
                  className="border-amber-500/30"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs p-2 rounded bg-amber-500/10">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span>High spore concentration detected in Region 5</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs p-2 rounded bg-amber-500/10">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span>Unusual dispersal pattern in Sector 12</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View All Alerts
                    </Button>
                  </div>
                </Widget>
              )}

              {/* Quick Filters Widget */}
              <Widget title="Quick Filters" icon={<Filter className="h-3 w-3 text-gray-500" />}>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs">
                    Fungi
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs">
                    Pollen
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs">
                    Bacteria
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs">
                    Allergens
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs">
                    Pathogens
                  </Badge>
                </div>
              </Widget>

              {/* Time Range Widget */}
              <Widget title="Time Range" icon={<Clock className="h-3 w-3 text-gray-500" />}>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs">1H</Button>
                  <Button variant="secondary" size="sm" className="flex-1 text-xs">24H</Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs">7D</Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs">30D</Button>
                </div>
              </Widget>

              {/* Selected Region Info */}
              <SporeInfoPanel selectedRegion={selectedRegion} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="data">
          <SporeDataExplorer />
        </TabsContent>

        <TabsContent value="about">
          <SporeTrackerAbout />
        </TabsContent>
      </Tabs>
    </div>
  )
}
