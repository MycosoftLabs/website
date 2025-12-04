"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import * as atlas from "azure-maps-control"
import "azure-maps-control/dist/atlas.min.css"

interface SporeLocation {
  id: string
  name: string
  location: [number, number]
  sporeCount: number
  type: string
}

interface SporeMapProps {
  locations?: SporeLocation[]
  onLocationClick?: (locationId: string) => void
}

const defaultLocations: SporeLocation[] = [
  {
    id: "loc-1",
    name: "Pacific Northwest",
    location: [-122.3321, 47.6062],
    sporeCount: 1250,
    type: "Chanterelle",
  },
  {
    id: "loc-2",
    name: "Appalachian Trail",
    location: [-78.8784, 42.8864],
    sporeCount: 890,
    type: "Morel",
  },
  {
    id: "loc-3",
    name: "Great Smoky Mountains",
    location: [-83.5102, 35.5951],
    sporeCount: 2100,
    type: "Oyster",
  },
]

export function SporeMap({ locations = defaultLocations, onLocationClick }: SporeMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<atlas.Map | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authInfo, setAuthInfo] = useState<{ clientId: string } | null>(null)

  // Fetch authentication token from our secure API endpoint
  useEffect(() => {
    async function fetchAuthInfo() {
      try {
        const response = await fetch("/api/maps/auth")
        if (!response.ok) {
          throw new Error("Failed to fetch authentication token")
        }
        const data = await response.json()
        setAuthInfo(data)
      } catch (err) {
        console.error("Error fetching auth token:", err)
        setError("Failed to authenticate with Azure Maps")
        setIsLoading(false)
      }
    }

    fetchAuthInfo()
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map || !authInfo) return

    try {
      if (!authInfo.clientId) {
        throw new Error("Azure Maps authentication information is missing")
      }

      // Initialize map with anonymous authentication
      const newMap = new atlas.Map(mapRef.current, {
        authOptions: {
          authType: "anonymous",
          clientId: authInfo.clientId,
          getToken: async () => {
            try {
              // Fetch token from our secure API
              const response = await fetch("/api/maps/auth")
              if (!response.ok) {
                throw new Error(`Failed to get map authentication: ${response.status}`)
              }
              const authData = await response.json()
              return authData.clientId // Use the client ID for anonymous auth
            } catch (error) {
              console.error("Map authentication error:", error)
              throw error
            }
          },
        },
        center: [-95.7129, 37.0902],
        zoom: 4,
        style: "satellite_road_labels",
        view: "Auto",
      })

      // Wait for the map to load
      newMap.events.add("load", () => {
        setIsLoading(false)

        // Create a data source for spore locations
        const source = new atlas.source.DataSource()
        setMap(newMap)
        newMap.sources.add(source)

        // Add spore locations points to the map
        locations.forEach((location) => {
          const point = new atlas.data.Point(location.location)
          const feature = new atlas.data.Feature(point, {
            id: location.id,
            name: location.name,
            sporeCount: location.sporeCount,
            type: location.type,
          })
          source.add(feature)
        })

        // Add bubble layer for spore locations
        newMap.layers.add(
          new atlas.layer.BubbleLayer(source, "spore-locations", {
            radius: ["interpolate", ["linear"], ["get", "sporeCount"], 0, 5, 1000, 15, 3000, 25],
            color: "rgba(34, 197, 94, 0.6)",
            strokeColor: "rgba(34, 197, 94, 1)",
            strokeWidth: 2,
            blur: 0.5,
          }),
        )

        // Add symbol layer for labels
        newMap.layers.add(
          new atlas.layer.SymbolLayer(source, "spore-location-labels", {
            iconOptions: {
              image: "marker-green",
              size: 0.6,
              allowOverlap: true,
            },
            textOptions: {
              textField: ["get", "name"],
              offset: [0, 2],
              color: "#ffffff",
              haloColor: "#000000",
              haloWidth: 2,
              size: 12,
            },
          }),
        )

        // Add click event for spore locations
        newMap.events.add("click", "spore-locations", (e) => {
          if (e.shapes && e.shapes[0]) {
            const properties = e.shapes[0].getProperties()
            onLocationClick?.(properties.id)
          }
        })

        // Add hover state
        const popup = new atlas.Popup({
          pixelOffset: [0, -30],
          closeButton: false,
        })

        newMap.events.add("mouseover", "spore-locations", (e) => {
          if (e.shapes && e.shapes[0]) {
            const shape = e.shapes[0]
            const properties = shape.getProperties()

            // Show popup
            popup.setOptions({
              content: `<div style="padding: 12px; min-width: 200px;">
                <p style="font-weight: bold; margin: 0; color: #22c55e;">${properties.name}</p>
                <p style="margin: 4px 0 0 0; font-size: 0.875rem;">
                  Type: ${properties.type}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 0.875rem;">
                  Spore Count: ${properties.sporeCount.toLocaleString()}
                </p>
              </div>`,
              position: shape.getCoordinates(),
            })

            popup.open(newMap)
          }
        })

        newMap.events.add("mouseout", () => {
          if (map) {
            map.popups.clear()
          }
        })
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize map")
      setIsLoading(false)
    }

    return () => {
      if (map) {
        map.dispose()
      }
    }
  }, [locations, onLocationClick, map, authInfo])

  return (
    <Card className="w-full">
      <div className="relative w-full h-[600px] bg-zinc-900 rounded-lg overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="text-center space-y-2 p-4">
              <p className="text-destructive font-semibold">Failed to load map</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full [&_.azure-maps-control-container]:!hidden" />
      </div>
    </Card>
  )
}
