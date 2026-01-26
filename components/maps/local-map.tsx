"use client"

/**
 * LocalMap - Self-hosted map component using MapLibre GL
 * 
 * Uses open-source MapLibre with self-hostable tile sources.
 * No external cloud dependencies required - can run completely offline
 * with self-hosted tiles from your own infrastructure.
 * 
 * Tile sources (priority):
 * 1. Self-hosted tiles from Mycosoft infrastructure (when available)
 * 2. OpenStreetMap tiles (open, free, no API key required)
 */

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"

// MapLibre is imported dynamically to avoid SSR issues
let maplibregl: typeof import("maplibre-gl") | null = null

interface DeviceLocation {
  id: string
  name: string
  location: [number, number] // [longitude, latitude]
  status: "active" | "inactive"
}

interface LocalMapProps {
  className?: string
  deviceLocations?: DeviceLocation[]
  onDeviceClick?: (deviceId: string) => void
  center?: [number, number]
  zoom?: number
  style?: "dark" | "light" | "satellite"
}

const defaultDevices: DeviceLocation[] = [
  {
    id: "device-1",
    name: "Mushroom 1 - SF",
    location: [-122.4194, 37.7749],
    status: "active",
  },
  {
    id: "device-2",
    name: "SporeBase - NYC",
    location: [-74.006, 40.7128],
    status: "active",
  },
  {
    id: "device-3",
    name: "TruffleBot - Austin",
    location: [-97.7431, 30.2672],
    status: "inactive",
  },
]

// Self-hostable tile style configurations
// These can be replaced with your own tile server URLs
const MAP_STYLES = {
  dark: {
    version: 8,
    name: "Mycosoft Dark",
    sources: {
      osm: {
        type: "raster",
        tiles: [
          // CartoDB Dark tiles - can be self-hosted
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors, © CARTO",
      },
    },
    layers: [
      {
        id: "osm-tiles",
        type: "raster",
        source: "osm",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },
  light: {
    version: 8,
    name: "Mycosoft Light",
    sources: {
      osm: {
        type: "raster",
        tiles: [
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "osm-tiles",
        type: "raster",
        source: "osm",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },
  satellite: {
    version: 8,
    name: "Mycosoft Satellite",
    sources: {
      satellite: {
        type: "raster",
        tiles: [
          // ESRI satellite tiles - can be replaced with self-hosted
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "© Esri, Maxar, Earthstar Geographics",
      },
    },
    layers: [
      {
        id: "satellite-tiles",
        type: "raster",
        source: "satellite",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },
} as const

export function LocalMap({ 
  className, 
  deviceLocations = defaultDevices, 
  onDeviceClick,
  center = [-95.7129, 37.0902], // Center of US
  zoom = 3,
  style = "dark"
}: LocalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<InstanceType<typeof import("maplibre-gl").Map> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    // Dynamically import maplibre-gl to avoid SSR issues
    const initMap = async () => {
      try {
        if (!maplibregl) {
          maplibregl = await import("maplibre-gl")
          // Also import the CSS
          await import("maplibre-gl/dist/maplibre-gl.css")
        }

        const map = new maplibregl.Map({
          container: mapRef.current!,
          style: MAP_STYLES[style] as maplibregl.StyleSpecification,
          center: center,
          zoom: zoom,
          attributionControl: false,
        })

        // Add minimal attribution in corner
        map.addControl(
          new maplibregl.AttributionControl({ compact: true }),
          "bottom-right"
        )

        // Add navigation controls
        map.addControl(new maplibregl.NavigationControl(), "top-right")

        map.on("load", () => {
          setIsLoading(false)

          // Add device markers
          deviceLocations.forEach((device) => {
            // Create marker element
            const el = document.createElement("div")
            el.className = "device-marker"
            el.style.cssText = `
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: ${device.status === "active" ? "#10b981" : "#ef4444"};
              border: 3px solid ${device.status === "active" ? "#34d399" : "#f87171"};
              cursor: pointer;
              box-shadow: 0 0 10px ${device.status === "active" ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.5)"};
              transition: transform 0.2s;
            `
            el.addEventListener("mouseenter", () => {
              el.style.transform = "scale(1.2)"
            })
            el.addEventListener("mouseleave", () => {
              el.style.transform = "scale(1)"
            })

            // Create popup
            const popup = new maplibregl.Popup({
              offset: 25,
              closeButton: false,
              closeOnClick: false,
            }).setHTML(`
              <div style="padding: 8px; color: #000;">
                <p style="font-weight: bold; margin: 0;">${device.name}</p>
                <p style="margin: 4px 0 0 0; font-size: 0.875rem; color: ${device.status === "active" ? "#10b981" : "#ef4444"};">
                  ${device.status === "active" ? "● Active" : "○ Inactive"}
                </p>
              </div>
            `)

            // Create marker
            const marker = new maplibregl.Marker({ element: el })
              .setLngLat(device.location)
              .setPopup(popup)
              .addTo(map)

            // Add click handler
            el.addEventListener("click", () => {
              onDeviceClick?.(device.id)
            })

            // Show popup on hover
            el.addEventListener("mouseenter", () => popup.addTo(map))
            el.addEventListener("mouseleave", () => popup.remove())
          })
        })

        map.on("error", (e) => {
          console.error("Map error:", e)
          setError("Failed to load map tiles")
          setIsLoading(false)
        })

        mapInstance.current = map
      } catch (err) {
        console.error("Map initialization error:", err)
        setError("Failed to initialize map")
        setIsLoading(false)
      }
    }

    initMap()

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [center, zoom, style, deviceLocations, onDeviceClick])

  return (
    <Card className={className}>
      <div className="relative w-full h-[400px] bg-zinc-900 rounded-lg overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading map...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="text-center space-y-2 p-4">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-destructive font-semibold">Failed to load map</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </Card>
  )
}

// Also export as default for dynamic imports
export default LocalMap
