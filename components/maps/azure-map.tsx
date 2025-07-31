"use client"

import { useEffect, useRef, useState } from "react"
import { Card, Badge } from "@/components/ui/card"
import { MapPin, AlertCircle } from "lucide-react"
import type { DeviceLocation } from "@/lib/types"

interface AzureMapProps {
  devices: DeviceLocation[]
  height?: string
  zoom?: number
  center?: [number, number] // [longitude, latitude]
  onDeviceClick?: (device: DeviceLocation) => void
  mapStyle?: "road" | "satellite" | "hybrid"
  showHeatmap?: boolean
  showWindOverlay?: boolean
}

declare global {
  interface Window {
    atlas: any
  }
}

export function AzureMap({
  devices,
  height = "400px",
  zoom = 2,
  center = [0, 20],
  onDeviceClick,
  mapStyle = "road",
  showHeatmap = false,
  showWindOverlay = false,
}: AzureMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const dataSourceRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)

  // Fetch authentication token
  useEffect(() => {
    const fetchAuthToken = async () => {
      try {
        const response = await fetch("/api/maps/auth")
        if (!response.ok) {
          throw new Error("Failed to fetch authentication token")
        }
        const data = await response.json()
        setAuthToken(data.token)
      } catch (err) {
        console.error("Auth token fetch error:", err)
        setError("Failed to authenticate with Azure Maps")
      }
    }

    fetchAuthToken()
  }, [])

  // Load Azure Maps SDK and initialize map
  useEffect(() => {
    if (!authToken || !mapRef.current) return

    const loadAzureMaps = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check if Azure Maps is already loaded
        if (window.atlas) {
          initializeMap()
          return
        }

        // Load Azure Maps CSS
        const cssLink = document.createElement("link")
        cssLink.rel = "stylesheet"
        cssLink.href = "https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.css"
        document.head.appendChild(cssLink)

        // Load Azure Maps JavaScript SDK
        const script = document.createElement("script")
        script.src = "https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.js"
        script.async = true
        script.onload = () => {
          if (window.atlas) {
            initializeMap()
          } else {
            setError("Failed to load Azure Maps SDK")
            setIsLoading(false)
          }
        }
        script.onerror = () => {
          setError("Failed to load Azure Maps SDK")
          setIsLoading(false)
        }
        document.head.appendChild(script)
      } catch (err) {
        console.error("Azure Maps loading error:", err)
        setError("Failed to load Azure Maps")
        setIsLoading(false)
      }
    }

    const initializeMap = () => {
      try {
        if (!mapRef.current || mapInstanceRef.current) return

        // Initialize the map
        const map = new window.atlas.Map(mapRef.current, {
          center: center,
          zoom: zoom,
          style: getAzureMapStyle(mapStyle),
          authOptions: {
            authType: window.atlas.AuthenticationType.subscriptionKey,
            subscriptionKey: process.env.NEXT_PUBLIC_AZURE_MAPS_KEY,
          },
        })

        mapInstanceRef.current = map

        // Wait for map to be ready
        map.events.add("ready", () => {
          try {
            // Create data source for markers
            const dataSource = new window.atlas.source.DataSource()
            dataSourceRef.current = dataSource
            map.sources.add(dataSource)

            // Create symbol layer for device markers
            const symbolLayer = new window.atlas.layer.SymbolLayer(dataSource, null, {
              iconOptions: {
                image: "pin-red",
                anchor: "center",
                allowOverlap: true,
                size: 0.8,
              },
              textOptions: {
                textField: ["get", "title"],
                color: "#000000",
                offset: [0, -2],
                size: 12,
              },
            })

            map.layers.add(symbolLayer)

            // Add click event for markers
            map.events.add("click", symbolLayer, (e: any) => {
              if (e.shapes && e.shapes.length > 0) {
                const properties = e.shapes[0].getProperties()
                const device = devices.find((d) => d.id === properties.id)
                if (device && onDeviceClick) {
                  onDeviceClick(device)
                }
              }
            })

            // Add hover effect
            map.events.add("mouseenter", symbolLayer, () => {
              map.getCanvasContainer().style.cursor = "pointer"
            })

            map.events.add("mouseleave", symbolLayer, () => {
              map.getCanvasContainer().style.cursor = "grab"
            })

            // Add devices to map
            updateDeviceMarkers()
            setIsLoading(false)
          } catch (err) {
            console.error("Map initialization error:", err)
            setError("Failed to initialize map features")
            setIsLoading(false)
          }
        })

        map.events.add("error", (e: any) => {
          console.error("Map error:", e)
          setError("Map encountered an error")
          setIsLoading(false)
        })
      } catch (err) {
        console.error("Map creation error:", err)
        setError("Failed to create map")
        setIsLoading(false)
      }
    }

    loadAzureMaps()

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.dispose()
        mapInstanceRef.current = null
      }
    }
  }, [authToken, center, zoom])

  // Update map style when mapStyle prop changes
  useEffect(() => {
    if (mapInstanceRef.current && window.atlas) {
      try {
        mapInstanceRef.current.setStyle({
          style: getAzureMapStyle(mapStyle),
        })
      } catch (err) {
        console.error("Failed to update map style:", err)
      }
    }
  }, [mapStyle])

  // Update device markers when devices change
  useEffect(() => {
    updateDeviceMarkers()
  }, [devices])

  // Handle overlay toggles
  useEffect(() => {
    if (!mapInstanceRef.current || !window.atlas) return

    try {
      // Handle heatmap overlay
      if (showHeatmap) {
        // Add heatmap layer logic here
        console.log("Heatmap overlay enabled")
      } else {
        // Remove heatmap layer logic here
        console.log("Heatmap overlay disabled")
      }

      // Handle wind overlay
      if (showWindOverlay) {
        // Add wind overlay logic here
        console.log("Wind overlay enabled")
      } else {
        // Remove wind overlay logic here
        console.log("Wind overlay disabled")
      }
    } catch (err) {
      console.error("Failed to update overlays:", err)
    }
  }, [showHeatmap, showWindOverlay])

  const getAzureMapStyle = (style: string) => {
    switch (style) {
      case "satellite":
        return "satellite"
      case "hybrid":
        return "satellite_road_labels"
      case "road":
      default:
        return "road"
    }
  }

  const updateDeviceMarkers = () => {
    if (!dataSourceRef.current || !window.atlas) return

    try {
      // Clear existing markers
      dataSourceRef.current.clear()

      // Add device markers
      const features = devices.map((device) => {
        const point = new window.atlas.data.Feature(new window.atlas.data.Point(device.location), {
          id: device.id,
          title: device.name,
          status: device.status,
          sporeCount: device.sporeCount || 0,
        })
        return point
      })

      dataSourceRef.current.add(features)
    } catch (err) {
      console.error("Failed to update device markers:", err)
    }
  }

  if (error) {
    return (
      <Card className="p-8 text-center" style={{ height }}>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Map Error</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Badge variant="destructive">Azure Maps Unavailable</Badge>
      </Card>
    )
  }

  return (
    <div className="relative" style={{ height }}>
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" />

      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading Azure Maps...</p>
          </div>
        </div>
      )}

      {/* Map Controls Overlay */}
      <div className="absolute top-4 right-4 space-y-2">
        <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
          <MapPin className="h-3 w-3 mr-1" />
          {devices.filter((d) => d.status === "active").length} Active
        </Badge>

        {showHeatmap && (
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm text-orange-600">
            Heatmap On
          </Badge>
        )}

        {showWindOverlay && (
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm text-blue-600">
            Wind Data On
          </Badge>
        )}
      </div>

      {/* Device Count Overlay */}
      <div className="absolute bottom-4 left-4">
        <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
          {devices.length} Stations Total
        </Badge>
      </div>
    </div>
  )
}
