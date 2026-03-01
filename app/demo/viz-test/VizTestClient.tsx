"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, Map, Radar, Activity, Image, Rocket, Share2, GitBranch, Cpu } from "lucide-react"
import dynamic from "next/dynamic"

const SatelliteTilesDemo = dynamic(
  () => import("../../../components/demo/viz/SatelliteTilesDemo"),
  { ssr: false }
)
const DeckGibsDemo = dynamic(() => import("../../../components/demo/viz/DeckGibsDemo"), {
  ssr: false,
})
const EonetEventsDemo = dynamic(() => import("../../../components/demo/viz/EonetEventsDemo"), {
  ssr: false,
})
const OrbitTrackerDemo = dynamic(() => import("../../../components/demo/viz/OrbitTrackerDemo"), {
  ssr: false,
})
const LandsatViewerDemo = dynamic(
  () => import("../../../components/demo/viz/LandsatViewerDemo"),
  { ssr: false }
)
const XnoHubDemo = dynamic(() => import("../../../components/demo/viz/XnoHubDemo"), {
  ssr: false,
})
const VizceralDemo = dynamic(() => import("../../../components/demo/viz/VizceralDemo"), {
  ssr: false,
})
const GitKrakenCommitGraphDemo = dynamic(
  () => import("../../../components/demo/viz/GitKrakenCommitGraphDemo"),
  { ssr: false }
)
const TronCodeStream = dynamic(() => import("../../../components/demo/viz/TronCodeStream"), {
  ssr: false,
})

const tabs = [
  { id: "gibs-map", label: "Satellite Tiles", icon: Globe },
  { id: "deckgl", label: "Raster Zoom", icon: Map },
  { id: "eonet", label: "EONET Events", icon: Radar },
  { id: "orbit", label: "Orbit Tracker", icon: Activity },
  { id: "landsat", label: "Landsat Viewer", icon: Image },
  { id: "xnohub", label: "XNOHub Globe", icon: Rocket },
  { id: "vizceral", label: "Vizceral", icon: Share2 },
  { id: "gitkraken", label: "GitHub Activity", icon: GitBranch },
  { id: "tron", label: "Tron Code", icon: Cpu },
] as const

export default function VizTestClient() {
  const [activeTab, setActiveTab] = useState<string>("gibs-map")

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl sm:text-2xl">
              Visualization Demo — Test Before Production
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Preview each background option before adding to the home page. Use tabs to switch.
            </p>
          </CardHeader>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 mb-4 bg-muted/50">
            {tabs.map(({ id, label, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <Card>
            <CardContent className="p-0 overflow-hidden">
              <div className="relative w-full min-h-[60vh] sm:min-h-[70vh] bg-muted/30 rounded-b-lg">
                {activeTab === "gibs-map" && <SatelliteTilesDemo />}
                {activeTab === "deckgl" && <DeckGibsDemo />}
                {activeTab === "eonet" && <EonetEventsDemo />}
                {activeTab === "orbit" && <OrbitTrackerDemo />}
                {activeTab === "landsat" && <LandsatViewerDemo />}
                {activeTab === "xnohub" && <XnoHubDemo />}
                {activeTab === "vizceral" && <VizceralDemo />}
                {activeTab === "gitkraken" && <GitKrakenCommitGraphDemo />}
                {activeTab === "tron" && <TronCodeStream />}
              </div>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </div>
  )
}
