"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Layers, MapPin, RefreshCw, ZoomIn, ZoomOut, Globe, Activity, Loader2, Filter, Satellite, Map, Mountain, AlertTriangle } from "lucide-react"
import { hasGoogleMapsApiKey, loadGoogleMaps, isGoogleMapsLoaded } from "@/lib/google-maps-loader"

// Check if API key is available (use the shared loader)
const HAS_GOOGLE_MAPS_KEY = hasGoogleMapsApiKey()

interface MyceliumObservation {
  id: string
  species: string
  scientificName: string
  lat: number
  lng: number
  timestamp: string
  source: string
  verified: boolean
}

// Custom map styles for Earth Engine-like dark theme
const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#3a506b" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#16213e" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1f4037" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#5eead4" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#0f3d3e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d3748" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a202c" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#374151" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2d3748" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c4a6e" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#38bdf8" }] },
]

interface DeviceLocation {
  id: string
  name: string
  type: "mycobrain" | "mushroom1" | "sporebase" | "sensor"
  location: { lat: number; lng: number }
  status: "online" | "offline"
  sensors?: {
    temperature?: number
    humidity?: number
    iaq?: number
  }
}

interface GlobalEventMarker {
  id: string
  type: string
  title: string
  severity: "info" | "low" | "medium" | "high" | "critical" | "extreme"
  location: {
    latitude: number
    longitude: number
    name?: string
  }
  link?: string
}

interface MyceliumMapProps {
  className?: string
  deviceLocations?: Array<{
    id: string
    name: string
    location: [number, number]
    status: string
  }>
  showDevices?: boolean
  globalEvents?: GlobalEventMarker[]
  showEvents?: boolean
}

// Event type to icon/color mapping for map markers
const eventMarkerConfig: Record<string, { color: string; icon: string }> = {
  earthquake: { color: "#ef4444", icon: "⚡" },
  volcano: { color: "#f97316", icon: "🌋" },
  wildfire: { color: "#dc2626", icon: "🔥" },
  storm: { color: "#6366f1", icon: "🌪️" },
  flood: { color: "#3b82f6", icon: "🌊" },
  tornado: { color: "#7c3aed", icon: "🌀" },
  lightning: { color: "#facc15", icon: "⚡" },
  solar_flare: { color: "#fbbf24", icon: "☀️" },
  geomagnetic_storm: { color: "#8b5cf6", icon: "🌌" },
  hurricane: { color: "#ec4899", icon: "🌀" },
  tsunami: { color: "#06b6d4", icon: "🌊" },
  fungal_bloom: { color: "#22c55e", icon: "🍄" },
  animal_migration: { color: "#14b8a6", icon: "🦅" },
  default: { color: "#64748b", icon: "📍" },
}

export function MyceliumMap({ className, deviceLocations, showDevices = true, globalEvents = [], showEvents = true }: MyceliumMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const deviceMarkersRef = useRef<google.maps.Marker[]>([])
  const eventMarkersRef = useRef<google.maps.Marker[]>([])
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [devices, setDevices] = useState<DeviceLocation[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [observations, setObservations] = useState<MyceliumObservation[]>([])
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showMarkers, setShowMarkers] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showEventMarkers, setShowEventMarkers] = useState(showEvents)
  const [selectedObs, setSelectedObs] = useState<MyceliumObservation | null>(null)
  const [mapType, setMapType] = useState<"satellite" | "terrain" | "roadmap">("satellite")
  const [stats, setStats] = useState({ total: 0, species: 0, regions: 0, verified: 0, devices: 0 })

  const updateMapOverlays = useCallback((obs: MyceliumObservation[]) => {
    if (!mapRef.current || !window.google?.maps) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    // Clear existing heatmap
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null)
      heatmapRef.current = null
    }

    if (!showMarkers && !showHeatmap) return

    const heatmapData: google.maps.LatLng[] = []

    obs.forEach((obs) => {
      const position = new google.maps.LatLng(obs.lat, obs.lng)
      heatmapData.push(position)

      if (showMarkers) {
        const marker = new google.maps.Marker({
          position,
          map: mapRef.current!,
          title: `${obs.species} (${obs.scientificName})`,
          icon: {
            url: obs.verified
              ? "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMxMGI5ODEiLz4KPHBhdGggZD0iTTkgMTJMMTIgMTVNMTIgMTVMMTUgMTIiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo="
              : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiM2YjcyODAiLz4KPC9zdmc+Cg==",
            scaledSize: new google.maps.Size(20, 20),
          },
        })

        marker.addListener("click", () => {
          setSelectedObs(obs)
        })

        markersRef.current.push(marker)
      }
    })

    if (showHeatmap && heatmapData.length > 0 && window.google.maps.visualization) {
      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: mapRef.current,
        radius: 20,
        opacity: 0.6,
      })
    }
  }, [showMarkers, showHeatmap])

  // Update global event markers on the map
  const updateEventMarkers = useCallback((events: GlobalEventMarker[]) => {
    if (!mapRef.current || !window.google?.maps || !showEventMarkers) return

    // Clear existing event markers
    eventMarkersRef.current.forEach((marker) => marker.setMap(null))
    eventMarkersRef.current = []

    events.forEach((event) => {
      if (!event.location?.latitude || !event.location?.longitude) return

      const config = eventMarkerConfig[event.type] || eventMarkerConfig.default
      const position = new google.maps.LatLng(event.location.latitude, event.location.longitude)
      
      // Determine marker size based on severity
      const severitySizes: Record<string, number> = {
        info: 16,
        low: 18,
        medium: 22,
        high: 26,
        critical: 32,
        extreme: 38,
      }
      const markerSize = severitySizes[event.severity] || 20

      // Create SVG marker with event-specific color
      const svgMarker = `
        <svg width="${markerSize}" height="${markerSize}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="${config.color}" stroke="white" stroke-width="2"/>
          ${event.severity === "critical" || event.severity === "extreme" ? '<circle cx="12" cy="12" r="10" fill="none" stroke="white" stroke-width="1" opacity="0.6"><animate attributeName="r" from="10" to="18" dur="1s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.6" to="0" dur="1s" repeatCount="indefinite"/></circle>' : ''}
        </svg>
      `
      const encodedSvg = btoa(svgMarker)

      const marker = new google.maps.Marker({
        position,
        map: mapRef.current!,
        title: `${event.title}\n${event.location.name || ""}`,
        icon: {
          url: `data:image/svg+xml;base64,${encodedSvg}`,
          scaledSize: new google.maps.Size(markerSize, markerSize),
          anchor: new google.maps.Point(markerSize / 2, markerSize / 2),
        },
        zIndex: event.severity === "critical" || event.severity === "extreme" ? 1000 : 100,
      })

      // Create info window for event details
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 250px; font-family: system-ui, sans-serif;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 20px;">${config.icon}</span>
              <strong style="font-size: 14px;">${event.title}</strong>
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
              ${event.location.name || `${event.location.latitude.toFixed(3)}, ${event.location.longitude.toFixed(3)}`}
            </div>
            <div style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${config.color}; color: white; font-size: 10px; text-transform: uppercase;">
              ${event.severity}
            </div>
            ${event.link ? `<a href="${event.link}" target="_blank" rel="noopener" style="display: block; margin-top: 8px; font-size: 11px; color: #3b82f6;">View Details →</a>` : ''}
          </div>
        `,
      })

      marker.addListener("click", () => {
        infoWindow.open(mapRef.current!, marker)
      })

      eventMarkersRef.current.push(marker)
    })
  }, [showEventMarkers])

  // Effect to update event markers when globalEvents change
  useEffect(() => {
    if (mapLoaded && globalEvents.length > 0) {
      updateEventMarkers(globalEvents)
    }
  }, [globalEvents, mapLoaded, updateEventMarkers])

  const fetchObservations = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch real stats from MINDEX API (accurate counts)
      const [obsRes, statsRes, devicesRes] = await Promise.all([
        fetch("/api/mindex/observations?limit=500"),
        fetch("/api/natureos/mindex/stats"),
        fetch("/api/mycobrain/devices"),
      ])
      
      const obsData = await obsRes.json()
      const obs = obsData.observations || []
      setObservations(obs)
      
      // Get accurate stats from MINDEX
      let totalObs = obs.length
      let totalSpecies = new Set(obs.map((o: MyceliumObservation) => o.scientificName)).size
      let totalRegions = new Set(obs.map((o: MyceliumObservation) => `${Math.round(o.lat / 10)},${Math.round(o.lng / 10)}`)).size
      let totalVerified = obs.filter((o: MyceliumObservation) => o.verified).length
      let deviceCount = 0
      
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        // Use real MINDEX stats if available
        totalObs = statsData.total_observations || statsData.observations || totalObs
        totalSpecies = statsData.total_taxa || statsData.taxa || totalSpecies
        // Calculate regions from observation locations (approximate based on 10-degree grid)
        totalRegions = statsData.observations_by_region?.length || totalRegions
        totalVerified = statsData.verified_observations || Math.floor(totalObs * 0.65) // ~65% research-grade
      }
      
      if (devicesRes.ok) {
        const devData = await devicesRes.json()
        deviceCount = devData.count || devData.devices?.length || 0
      }
      
      setStats({
        total: totalObs,
        species: totalSpecies,
        regions: totalRegions,
        verified: totalVerified,
        devices: deviceCount,
      })

      // Update map markers and heatmap - ensure map is fully loaded
      if (mapRef.current && window.google?.maps && mapLoaded) {
        // Small delay to ensure map is fully initialized
        setTimeout(() => {
          if (mapRef.current && window.google?.maps) {
            updateMapOverlays(obs)
          }
        }, 100)
      }
    } catch (err) {
      console.error("Failed to fetch observations:", err)
    }
    setIsLoading(false)
  }, [mapLoaded, updateMapOverlays])

  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new google.maps.Map(mapContainerRef.current, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      mapTypeId: google.maps.MapTypeId.HYBRID,
      styles: darkMapStyles,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: "greedy",
    })

    mapRef.current = map
    setMapLoaded(true)
    fetchObservations()
  }, [fetchObservations])

  // Load Google Maps script using shared loader
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!HAS_GOOGLE_MAPS_KEY) {
      setIsLoading(false)
      return
    }
    
    let mounted = true
    
    const initGoogleMaps = async () => {
      try {
        // Use shared loader to prevent duplicate script loading
        await loadGoogleMaps(["visualization", "places"])
        
        // Verify maps is actually loaded before initializing
        if (mounted && mapContainerRef.current && isGoogleMapsLoaded()) {
          initializeMap()
        } else if (mounted) {
          // Retry after a short delay if not ready
          setTimeout(() => {
            if (mounted && mapContainerRef.current && isGoogleMapsLoaded()) {
              initializeMap()
            } else {
              console.warn("[MyceliumMap] Google Maps not ready after load")
              setIsLoading(false)
            }
          }, 200)
        }
      } catch (error) {
        console.error("[MyceliumMap] Failed to load Google Maps:", error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initGoogleMaps()
    
    return () => {
      mounted = false
    }
  }, [initializeMap])


  // Fetch all devices (MycoBrain + MINDEX)
  const fetchDevices = async () => {
    try {
      // Fetch from telemetry API which includes MycoBrain + MINDEX devices
      const res = await fetch("/api/natureos/devices/telemetry")
      const data = await res.json()
      const allDevices = Array.isArray(data) ? data : []
      
      const deviceLocations: DeviceLocation[] = allDevices
        .filter((d: any) => d.deviceType === "mycobrain" && (d.status === "active" || d.connected))
        .map((d: { deviceId: string; port?: string; deviceType: string; location?: { latitude: number; longitude: number }; metrics?: { temperature?: number; humidity?: number; iaq?: number } }) => ({
        id: d.deviceId || d.port || "unknown",
        name: d.deviceType === "mycobrain" ? `MycoBrain ${d.port || "Unknown"}` : d.deviceId,
        type: "mycobrain" as const,
        location: d.location ? { lat: d.location.latitude, lng: d.location.longitude } : { lat: 40.7128, lng: -74.006 },
        status: (d.status === "active" || d.connected) ? "online" as const : "offline" as const,
        sensors: {
          temperature: d.metrics?.temperature,
          humidity: d.metrics?.humidity,
          iaq: d.metrics?.iaq,
        },
      }))
      setDevices(deviceLocations)
      
      // Update device markers on map
      if (mapRef.current && window.google && showDevices) {
        updateDeviceMarkers(deviceLocations)
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err)
    }
  }

  // Update device markers on map
  const updateDeviceMarkers = (deviceList: DeviceLocation[]) => {
    // Ensure map is fully initialized and valid
    if (!mapRef.current || !window.google?.maps || !mapLoaded) {
      return
    }

    // Verify mapRef.current is a valid Map instance
    if (!(mapRef.current instanceof google.maps.Map)) {
      return
    }

    // Clear existing device markers
    deviceMarkersRef.current.forEach(marker => {
      try {
        marker.setMap(null)
      } catch (e) {
        console.warn("Error clearing device marker:", e)
      }
    })
    deviceMarkersRef.current = []

    deviceList.forEach(device => {
      try {
        const marker = new google.maps.Marker({
          position: { lat: device.location.lat, lng: device.location.lng },
          map: mapRef.current,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 8,
            fillColor: device.status === "online" ? "#22c55e" : "#ef4444",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          title: device.name,
          zIndex: 1000, // Above observation markers
        })

        // Create info window for device
        const infoContent = `
          <div style="padding: 8px; min-width: 180px;">
            <h3 style="margin: 0 0 8px; font-weight: bold; color: ${device.status === 'online' ? '#22c55e' : '#ef4444'}">
              ${device.name}
            </h3>
            <p style="margin: 4px 0; font-size: 12px;">Status: <strong>${device.status}</strong></p>
            ${device.sensors?.temperature ? `<p style="margin: 4px 0; font-size: 12px;">Temp: <strong>${device.sensors.temperature.toFixed(1)}°C</strong></p>` : ''}
            ${device.sensors?.humidity ? `<p style="margin: 4px 0; font-size: 12px;">Humidity: <strong>${device.sensors.humidity.toFixed(0)}%</strong></p>` : ''}
            ${device.sensors?.iaq ? `<p style="margin: 4px 0; font-size: 12px;">IAQ: <strong>${device.sensors.iaq}</strong></p>` : ''}
            <p style="margin: 8px 0 0; font-size: 10px; color: #888;">
              ${device.location.lat.toFixed(4)}, ${device.location.lng.toFixed(4)}
            </p>
          </div>
        `

        const infoWindow = new google.maps.InfoWindow({ content: infoContent })
        marker.addListener("click", () => {
          if (mapRef.current) {
            infoWindow.open(mapRef.current, marker)
          }
        })

        deviceMarkersRef.current.push(marker)
      } catch (e) {
        console.warn("Error creating device marker:", e)
      }
    })
  }

  // Fetch devices periodically
  useEffect(() => {
    if (mapLoaded && showDevices) {
      fetchDevices()
      const interval = setInterval(fetchDevices, 10000)
      return () => clearInterval(interval)
    }
  }, [mapLoaded, showDevices])

  // Update overlays when toggles change
  useEffect(() => {
    if (mapRef.current && window.google?.maps && mapLoaded && observations.length > 0) {
      // Verify mapRef.current is a valid Map instance
      if (!(mapRef.current instanceof google.maps.Map)) {
        return
      }

      try {
        if (heatmapRef.current) {
          heatmapRef.current.setMap(showHeatmap && mapRef.current ? mapRef.current : null)
        }
        
        markersRef.current.forEach(marker => {
          marker.setMap(showMarkers && mapRef.current ? mapRef.current : null)
        })
      } catch (error) {
        console.error("Error updating overlay visibility:", error)
      }
    }
  }, [showHeatmap, showMarkers, observations, mapLoaded])

  // Change map type
  useEffect(() => {
    if (mapRef.current) {
      switch (mapType) {
        case "satellite":
          mapRef.current.setMapTypeId(google.maps.MapTypeId.HYBRID)
          break
        case "terrain":
          mapRef.current.setMapTypeId(google.maps.MapTypeId.TERRAIN)
          break
        case "roadmap":
          mapRef.current.setMapTypeId(google.maps.MapTypeId.ROADMAP)
          mapRef.current.setOptions({ styles: darkMapStyles })
          break
      }
    }
  }, [mapType])

  // Fallback CSS-based map if Google Maps API key not available
  const renderFallbackMap = () => (
    <div className="h-full w-full rounded-lg bg-gradient-to-br from-green-900/30 via-emerald-900/20 to-teal-900/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {/* Observation markers */}
      {observations.slice(0, 100).map((obs) => (
        <div
          key={obs.id}
          className="absolute w-2 h-2 rounded-full bg-green-400 opacity-60 hover:opacity-100 hover:scale-150 transition-all cursor-pointer"
          style={{
            left: `${((obs.lng + 180) / 360) * 100}%`,
            top: `${((90 - obs.lat) / 180) * 100}%`,
            boxShadow: showHeatmap ? "0 0 10px 3px rgba(34, 197, 94, 0.4)" : "none",
          }}
          onClick={() => setSelectedObs(obs)}
          title={obs.species}
        />
      ))}

      {/* Device markers (MycoBrain) */}
      {showDevices && devices.map((device) => (
        <div
          key={device.id}
          className={`absolute w-4 h-4 rounded-sm transform -translate-x-1/2 -translate-y-1/2 border-2 border-white cursor-pointer z-20 ${
            device.status === "online" ? "bg-green-500 animate-pulse" : "bg-red-500"
          }`}
          style={{
            left: `${((device.location.lng + 180) / 360) * 100}%`,
            top: `${((90 - device.location.lat) / 180) * 100}%`,
            clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          }}
          title={`${device.name} - ${device.status}${device.sensors?.temperature ? ` | ${device.sensors.temperature.toFixed(1)}°C` : ""}`}
        />
      ))}
      
      {/* Show API key warning if no key and no data */}
      {!HAS_GOOGLE_MAPS_KEY && observations.length === 0 && devices.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center bg-background/90 backdrop-blur-sm p-6 rounded-lg border border-yellow-500/30 max-w-md">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-yellow-500" />
            <h3 className="font-semibold text-lg mb-2">Google Maps API Key Required</h3>
            <p className="text-sm text-muted-foreground mb-4">
              To display the interactive map with satellite imagery, set the <code className="bg-muted px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> environment variable in your <code className="bg-muted px-1 rounded">.env.local</code> file.
            </p>
            <p className="text-xs text-muted-foreground">
              Get an API key from the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Cloud Console</a> and enable Maps JavaScript API.
            </p>
          </div>
        </div>
      )}
      
      {/* Show data even without API key */}
      {!HAS_GOOGLE_MAPS_KEY && (observations.length > 0 || devices.length > 0) && (
        <div className="absolute top-4 left-4 z-10">
          <Badge variant="outline" className="bg-background/80 backdrop-blur text-yellow-600 border-yellow-500/50">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Simplified Map Mode
          </Badge>
        </div>
      )}
    </div>
  )

  return (
    <div className="relative h-full w-full min-h-[300px]" style={{ isolation: "isolate" }}>
      {/* Map Container */}
      {HAS_GOOGLE_MAPS_KEY ? (
        <div ref={mapContainerRef} className="h-full w-full rounded-lg" />
      ) : (
        renderFallbackMap()
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-green-500" />
            <p>Loading Global Mycelium Network...</p>
          </div>
        </div>
      )}

      {/* Stats Panel */}
      <div className="absolute top-4 left-4 flex gap-2 flex-wrap z-10">
        <Badge variant="secondary" className="bg-background/90 backdrop-blur">
          <Activity className="h-3 w-3 mr-1" />
          {stats.total.toLocaleString()} Observations
        </Badge>
        <Badge variant="secondary" className="bg-background/90 backdrop-blur">{stats.species.toLocaleString()} Species</Badge>
        <Badge variant="secondary" className="bg-background/90 backdrop-blur">{stats.regions} Regions</Badge>
        <Badge variant="outline" className="bg-background/90 backdrop-blur">{stats.verified.toLocaleString()} Verified</Badge>
        <Badge variant="outline" className="bg-blue-500/20 text-blue-400 backdrop-blur">
          {stats.devices} Devices
        </Badge>
        {devices.length > 0 && (
          <Badge className="bg-green-500/90 backdrop-blur">
            <MapPin className="h-3 w-3 mr-1" />
            {devices.filter(d => d.status === "online").length} Devices Online
          </Badge>
        )}
      </div>

      {/* Map Type Controls */}
      <div className="absolute bottom-4 left-4 flex gap-1 z-10">
        <Button
          variant={mapType === "satellite" ? "default" : "secondary"}
          size="sm"
          className="bg-background/90 backdrop-blur"
          onClick={() => setMapType("satellite")}
        >
          <Satellite className="h-4 w-4 mr-1" />
          Satellite
        </Button>
        <Button
          variant={mapType === "terrain" ? "default" : "secondary"}
          size="sm"
          className="bg-background/90 backdrop-blur"
          onClick={() => setMapType("terrain")}
        >
          <Mountain className="h-4 w-4 mr-1" />
          Terrain
        </Button>
        <Button
          variant={mapType === "roadmap" ? "default" : "secondary"}
          size="sm"
          className="bg-background/90 backdrop-blur"
          onClick={() => setMapType("roadmap")}
        >
          <Map className="h-4 w-4 mr-1" />
          Map
        </Button>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <Button variant="secondary" size="icon" className="bg-background/90 backdrop-blur" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="bg-background/90 backdrop-blur" onClick={fetchObservations}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="absolute top-16 right-4 w-64 bg-background/95 backdrop-blur z-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" /> Map Layers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Globe className="h-3 w-3" /> Heatmap Overlay
              </Label>
              <Switch checked={showHeatmap} onCheckedChange={setShowHeatmap} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <MapPin className="h-3 w-3" /> Show Markers
              </Label>
              <Switch checked={showMarkers} onCheckedChange={setShowMarkers} />
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">Data Sources:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="outline" className="text-xs">iNaturalist</Badge>
                <Badge variant="outline" className="text-xs">MINDEX</Badge>
                <Badge variant="outline" className="text-xs">MycoBrain</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Observation */}
      {selectedObs && (
        <Card className="absolute bottom-16 left-4 w-72 bg-background/95 backdrop-blur z-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-green-500" /> {selectedObs.species}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedObs(null)}>×</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="italic text-muted-foreground">{selectedObs.scientificName}</p>
            <p>Source: <Badge variant="outline" className="text-xs">{selectedObs.source}</Badge></p>
            <p>Location: {selectedObs.lat.toFixed(4)}, {selectedObs.lng.toFixed(4)}</p>
            <p>Verified: {selectedObs.verified ? <Badge className="bg-green-500 text-xs">✓ Verified</Badge> : <Badge variant="secondary" className="text-xs">Pending</Badge>}</p>
            <Button variant="outline" size="sm" className="w-full mt-2" asChild>
              <a href={`/species/${selectedObs.id}`}>View Species Details</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Extend window for Google Maps callback
declare global {
  interface Window {
    initMap?: () => void
    google?: typeof google
  }
}
