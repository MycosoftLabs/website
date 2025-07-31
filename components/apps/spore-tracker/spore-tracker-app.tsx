"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from "next/dynamic"
import { MapControls } from "@/components/apps/spore-tracker/map-controls"
import { SporeDataExplorer } from "@/components/apps/spore-tracker/spore-data-explorer"
import { SporeInfoPanel } from "@/components/apps/spore-tracker/spore-info-panel"
import { SporeTrackerAbout } from "@/components/apps/spore-tracker/spore-tracker-about"

const SporeMap = dynamic(() => import("@/components/apps/spore-tracker/spore-map").then((mod) => mod.SporeMap), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
})

export function SporeTrackerApp() {
  const [activeTab, setActiveTab] = useState("map")
  const [mapType, setMapType] = useState<"satellite" | "topographic" | "street">("satellite")
  const [showWindOverlay, setShowWindOverlay] = useState(true)
  const [showSporeDetectors, setShowSporeDetectors] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(2)

  return (
    <div className="container py-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Spore Tracker</h1>
          <p className="text-lg text-muted-foreground">
            Global spore distribution tracking with real-time wind and weather data
          </p>
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
            <Card className="lg:col-span-3 p-0 overflow-hidden">
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
            <div className="space-y-4">
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
