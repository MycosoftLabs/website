"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Layers, MapPin, RefreshCw, ZoomIn, ZoomOut, Globe, Activity, Loader2, Filter, Satellite, Map, Mountain } from "lucide-react"

// Google Maps API key - set in environment or use a default for dev
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

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

interface MyceliumMapProps {
  className?: string
  deviceLocations?: Array<{
    id: string
    name: string
    location: [number, number]
    status: string
  }>
  showDevices?: boolean
}

export function MyceliumMap({ className, deviceLocations, showDevices = true }: MyceliumMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const deviceMarkersRef = useRef<google.maps.Marker[]>([])
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [devices, setDevices] = useState<DeviceLocation[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [observations, setObservations] = useState<MyceliumObservation[]>([])
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showMarkers, setShowMarkers] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedObs, setSelectedObs] = useState<MyceliumObservation | null>(null)
  const [mapType, setMapType] = useState<"satellite" | "terrain" | "roadmap">("satellite")
  const [stats, setStats] = useState({ total: 0, species: 0, regions: 0, verified: 0 })

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === "undefined") return
    
    const loadGoogleMaps = async () => {
      if (window.google?.maps) {
        initializeMap()
        return
      }

      // Check if API key is available
      if (!GOOGLE_MAPS_API_KEY) {
        console.warn("Google Maps API key not set. Using fallback map.")
        setIsLoading(false)
        return
      }

      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=visualization,places&callback=initMap`
      script.async = true
      script.defer = true
      
      window.initMap = () => {
        initializeMap()
      }
      
      document.head.appendChild(script)
    }

    loadGoogleMaps()
  }, [])

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
  }, [])

  const fetchObservations = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/mindex/observations?limit=500")
      const data = await res.json()
      const obs = data.observations || []
      setObservations(obs)
      
      const uniqueSpecies = new Set(obs.map((o: MyceliumObservation) => o.scientificName))
      const regions = new Set(obs.map((o: MyceliumObservation) => `${Math.round(o.lat / 10)},${Math.round(o.lng / 10)}`))
      
      setStats({
        total: obs.length,
        species: uniqueSpecies.size,
        regions: regions.size,
        verified: obs.filter((o: MyceliumObservation) => o.verified).length,
      })

      // Update map markers and heatmap
      if (mapRef.current && window.google) {
        updateMapOverlays(obs)
      }
    } catch (err) {
      console.error("Failed to fetch observations:", err)
    }
    setIsLoading(false)
  }

  // Fetch MycoBrain devices
  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/mycobrain")
      const data = await res.json()
      const mycoBrainDevices: DeviceLocation[] = (data.devices || []).map((d: { port: string; connected: boolean; sensor_data?: { bme688_1?: { temperature?: number; humidity?: number; iaq?: number } }; location?: { lat: number; lng: number } }) => ({
        id: d.port,
        name: `MycoBrain ${d.port}`,
        type: "mycobrain" as const,
        location: d.location || { lat: 40.7128, lng: -74.006 }, // Default to NYC if no GPS
        status: d.connected ? "online" as const : "offline" as const,
        sensors: {
          temperature: d.sensor_data?.bme688_1?.temperature,
          humidity: d.sensor_data?.bme688_1?.humidity,
          iaq: d.sensor_data?.bme688_1?.iaq,
        },
      }))
      setDevices(mycoBrainDevices)
      
      // Update device markers on map
      if (mapRef.current && window.google && showDevices) {
        updateDeviceMarkers(mycoBrainDevices)
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err)
    }
  }

  // Update device markers on map
  const updateDeviceMarkers = (deviceList: DeviceLocation[]) => {
    if (!mapRef.current || !window.google) return

    // Clear existing device markers
    deviceMarkersRef.current.forEach(marker => marker.setMap(null))
    deviceMarkersRef.current = []

    deviceList.forEach(device => {
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
        infoWindow.open(mapRef.current, marker)
      })

      deviceMarkersRef.current.push(marker)
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

  const updateMapOverlays = (obs: MyceliumObservation[]) => {
    if (!mapRef.current || !window.google) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    // Clear existing heatmap
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null)
    }

    // Create heatmap data
    const heatmapData = obs.map(o => ({
      location: new google.maps.LatLng(o.lat, o.lng),
      weight: o.verified ? 2 : 1,
    }))

    // Create heatmap layer
    heatmapRef.current = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: showHeatmap ? mapRef.current : null,
      radius: 30,
      opacity: 0.7,
      gradient: [
        "rgba(0, 255, 0, 0)",
        "rgba(0, 255, 0, 0.2)",
        "rgba(34, 197, 94, 0.4)",
        "rgba(74, 222, 128, 0.6)",
        "rgba(134, 239, 172, 0.8)",
        "rgba(187, 247, 208, 1)",
      ],
    })

    // Create markers
    if (showMarkers) {
      obs.slice(0, 200).forEach(o => {
        const marker = new google.maps.Marker({
          position: { lat: o.lat, lng: o.lng },
          map: mapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: o.verified ? "#22c55e" : "#4ade80",
            fillOpacity: 0.8,
            strokeColor: "#16a34a",
            strokeWeight: 2,
          },
          title: o.species,
        })

        marker.addListener("click", () => {
          setSelectedObs(o)
        })

        markersRef.current.push(marker)
      })
    }
  }

  // Update overlays when toggles change
  useEffect(() => {
    if (mapRef.current && window.google && observations.length > 0) {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(showHeatmap ? mapRef.current : null)
      }
      
      markersRef.current.forEach(marker => {
        marker.setMap(showMarkers ? mapRef.current : null)
      })
    }
  }, [showHeatmap, showMarkers, observations])

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
      
      {observations.length === 0 && devices.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center bg-background/80 backdrop-blur p-4 rounded-lg">
            <Globe className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for full Google Earth integration</p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="relative h-full w-full min-h-[300px]" style={{ isolation: "isolate" }}>
      {/* Map Container */}
      {GOOGLE_MAPS_API_KEY ? (
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
        <Badge variant="secondary" className="bg-background/90 backdrop-blur">{stats.species} Species</Badge>
        <Badge variant="secondary" className="bg-background/90 backdrop-blur">{stats.regions} Regions</Badge>
        <Badge variant="outline" className="bg-background/90 backdrop-blur">{stats.verified} Verified</Badge>
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
