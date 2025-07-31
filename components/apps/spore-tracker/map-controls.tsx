"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Wind, MapPin, Thermometer, ZoomIn, ZoomOut, RotateCw } from "lucide-react"

interface MapControlsProps {
  mapType: "satellite" | "topographic" | "street"
  showWindOverlay: boolean
  showSporeDetectors: boolean
  showHeatmap: boolean
  zoomLevel: number
  onMapTypeChange: (type: "satellite" | "topographic" | "street") => void
  onWindOverlayChange: (show: boolean) => void
  onSporeDetectorsChange: (show: boolean) => void
  onHeatmapChange: (show: boolean) => void
  onZoomChange: (zoom: number) => void
}

export function MapControls({
  mapType,
  showWindOverlay,
  showSporeDetectors,
  showHeatmap,
  zoomLevel,
  onMapTypeChange,
  onWindOverlayChange,
  onSporeDetectorsChange,
  onHeatmapChange,
  onZoomChange,
}: MapControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Map Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Map Type</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={mapType === "satellite" ? "default" : "outline"}
              size="sm"
              onClick={() => onMapTypeChange("satellite")}
              className="w-full"
            >
              Satellite
            </Button>
            <Button
              variant={mapType === "topographic" ? "default" : "outline"}
              size="sm"
              onClick={() => onMapTypeChange("topographic")}
              className="w-full"
            >
              Terrain
            </Button>
            <Button
              variant={mapType === "street" ? "default" : "outline"}
              size="sm"
              onClick={() => onMapTypeChange("street")}
              className="w-full"
            >
              Street
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Label>Layers</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-primary" />
                <Label htmlFor="wind-overlay" className="cursor-pointer">
                  Wind Overlay
                </Label>
              </div>
              <Switch id="wind-overlay" checked={showWindOverlay} onCheckedChange={onWindOverlayChange} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <Label htmlFor="spore-detectors" className="cursor-pointer">
                  Spore Detectors
                </Label>
              </div>
              <Switch id="spore-detectors" checked={showSporeDetectors} onCheckedChange={onSporeDetectorsChange} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-primary" />
                <Label htmlFor="spore-heatmap" className="cursor-pointer">
                  Spore Heatmap
                </Label>
              </div>
              <Switch id="spore-heatmap" checked={showHeatmap} onCheckedChange={onHeatmapChange} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Zoom Level: {zoomLevel}</Label>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => onZoomChange(Math.max(1, zoomLevel - 1))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => onZoomChange(Math.min(20, zoomLevel + 1))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Slider value={[zoomLevel]} min={1} max={20} step={1} onValueChange={(value) => onZoomChange(value[0])} />
        </div>

        <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
          <RotateCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </CardContent>
    </Card>
  )
}
