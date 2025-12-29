"use client"

import { SporeTrackerMap } from "@/components/maps/spore-tracker-map"

interface SporeMapProps {
  mapType?: "satellite" | "topographic" | "street"
  showWindOverlay?: boolean
  showSporeDetectors?: boolean
  showHeatmap?: boolean
  selectedRegion?: string | null
  zoomLevel?: number
  onZoomChange?: (zoom: number) => void
  onRegionSelect?: (region: string | null) => void
}

export function SporeMap({
  mapType = "satellite",
  showWindOverlay = true,
  showSporeDetectors = true,
  showHeatmap = true,
  selectedRegion = null,
  zoomLevel = 2,
  onZoomChange,
  onRegionSelect,
}: SporeMapProps) {
  return (
    <div className="h-[600px] w-full">
      <SporeTrackerMap />
    </div>
  )
}
