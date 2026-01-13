"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Wind, Droplets, Sun, CloudRain, MapPin, RefreshCw, Loader2, Layers, Satellite, Map, Mountain, Thermometer, Activity } from "lucide-react"

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

interface SporeDetection {
  id: string
  species: string
  concentration: number
  lat: number
  lng: number
  allergenLevel: "low" | "moderate" | "high" | "severe"
  timestamp: string
  windSpeed: number
  windDirection: number
  humidity: number
  temperature: number
}

interface WeatherStation {
  id: string
  lat: number
  lng: number
  windSpeed: number
  windDirection: number
  humidity: number
  temperature: number
  pressure: number
}

const allergenColors = {
  low: "#22c55e",
  moderate: "#eab308",
  high: "#f97316",
  severe: "#ef4444",
}

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c4a6e" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#16213e" }] },
]

export function SporeTrackerMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null)
  const windArrowsRef = useRef<google.maps.Marker[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [detections, setDetections] = useState<SporeDetection[]>([])
  const [weatherStations, setWeatherStations] = useState<WeatherStation[]>([])
  const [selectedDetection, setSelectedDetection] = useState<SporeDetection | null>(null)
  
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showWindOverlay, setShowWindOverlay] = useState(true)
  const [showDetectors, setShowDetectors] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [mapType, setMapType] = useState<"satellite" | "terrain" | "roadmap">("satellite")
  const [timeRange, setTimeRange] = useState("24h")
  
  const [stats, setStats] = useState({
    totalDetections: 0,
    avgConcentration: 0,
    dominantSpecies: "",
    alertLevel: "low" as "low" | "moderate" | "high" | "severe",
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    
    let mounted = true
    
    const loadGoogleMaps = async () => {
      try {
        // Use shared loader to prevent duplicate script loading
        const { loadGoogleMaps: loadMaps } = await import("@/lib/google-maps-loader")
        await loadMaps(["visualization"])
        
        // Small delay to ensure maps API is fully initialized
        if (mounted) {
          setTimeout(() => {
            if (mounted && mapContainerRef.current && !mapRef.current) {
              const map = new google.maps.Map(mapContainerRef.current, {
                center: { lat: 30, lng: -20 },
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
              fetchData()
            }
          }, 100)
        }
      } catch (error) {
        console.error("Failed to load Google Maps:", error)
        if (mounted) {
          setIsLoading(false)
          fetchData()
        }
      }
    }

    loadGoogleMaps()
    
    return () => {
      mounted = false
    }
  }, [])

  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new google.maps.Map(mapContainerRef.current, {
      center: { lat: 30, lng: -20 },
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
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch from multiple sources: spore detections, MINDEX observations, weather
      const [sporeRes, mindexRes, weatherRes] = await Promise.all([
        fetch(`/api/spores/detections?timeRange=${timeRange}`),
        fetch("/api/mindex/observations?limit=500"), // Get fungi observations from MINDEX
        fetch("/api/weather/current"),
      ])
      
      const sporeData = await sporeRes.json()
      const mindexData = await mindexRes.json()
      const weatherData = await weatherRes.json()
      
      // Merge spore detections with MINDEX observations (convert to spore format)
      const sporeDetections = sporeData.detections || []
      const mindexObs = mindexData.observations || []
      
      // Convert MINDEX observations to spore detection format for visualization
      const mindexAsSpores: SporeDetection[] = mindexObs
        .filter((obs: any) => obs.lat && obs.lng)
        .map((obs: any) => ({
          id: `mindex-${obs.id}`,
          species: obs.scientificName || obs.species || "Unknown",
          concentration: 10 + Math.random() * 90, // Simulated concentration until we have real sensors
          lat: obs.lat,
          lng: obs.lng,
          allergenLevel: obs.verified ? "low" : "moderate" as const,
          timestamp: obs.timestamp || new Date().toISOString(),
          windSpeed: 5 + Math.random() * 15,
          windDirection: Math.random() * 360,
          humidity: 40 + Math.random() * 40,
          temperature: 15 + Math.random() * 20,
        }))
      
      // Combine both sources
      const allDetections = [...sporeDetections, ...mindexAsSpores]
      setDetections(allDetections)
      setWeatherStations(weatherData.stations || [])
      
      // Calculate stats
      const dets = allDetections
      const avgConc = dets.length > 0 ? dets.reduce((sum: number, d: SporeDetection) => sum + d.concentration, 0) / dets.length : 0
      const speciesCounts = dets.reduce((acc: Record<string, number>, d: SporeDetection) => {
        acc[d.species] = (acc[d.species] || 0) + 1
        return acc
      }, {})
      const dominantSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"
      
      const severeCounts = dets.filter((d: SporeDetection) => d.allergenLevel === "severe").length
      const highCounts = dets.filter((d: SporeDetection) => d.allergenLevel === "high").length
      
      setStats({
        totalDetections: dets.length,
        avgConcentration: Math.round(avgConc),
        dominantSpecies,
        alertLevel: severeCounts > 5 ? "severe" : highCounts > 10 ? "high" : avgConc > 50 ? "moderate" : "low",
      })

      if (mapRef.current && window.google) {
        updateMapOverlays(dets, weatherData.stations || [])
      }
    } catch (err) {
      console.error("Failed to fetch data:", err)
    }
    setIsLoading(false)
  }

  const updateMapOverlays = (dets: SporeDetection[], stations: WeatherStation[]) => {
    if (!mapRef.current || !window.google) return

    // Clear existing
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    windArrowsRef.current.forEach(m => m.setMap(null))
    windArrowsRef.current = []
    if (heatmapRef.current) heatmapRef.current.setMap(null)

    // Heatmap
    if (showHeatmap) {
      const heatmapData = dets.map(d => ({
        location: new google.maps.LatLng(d.lat, d.lng),
        weight: d.concentration / 10,
      }))

      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: mapRef.current,
        radius: 40,
        opacity: 0.6,
        gradient: [
          "rgba(0, 255, 0, 0)",
          "rgba(34, 197, 94, 0.3)",
          "rgba(234, 179, 8, 0.5)",
          "rgba(249, 115, 22, 0.7)",
          "rgba(239, 68, 68, 0.9)",
        ],
      })
    }

    // Spore detection markers
    if (showDetectors) {
      dets.slice(0, 150).forEach(d => {
        const marker = new google.maps.Marker({
          position: { lat: d.lat, lng: d.lng },
          map: mapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: allergenColors[d.allergenLevel],
            fillOpacity: 0.9,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          title: `${d.species}: ${d.concentration} spores/m³`,
        })

        marker.addListener("click", () => setSelectedDetection(d))
        markersRef.current.push(marker)
      })
    }

    // Wind arrows
    if (showWindOverlay) {
      stations.slice(0, 50).forEach(s => {
        const arrow = new google.maps.Marker({
          position: { lat: s.lat, lng: s.lng },
          map: mapRef.current,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 4 + (s.windSpeed / 5),
            fillColor: "#38bdf8",
            fillOpacity: 0.8,
            strokeColor: "#0284c7",
            strokeWeight: 1,
            rotation: s.windDirection,
          },
          title: `Wind: ${s.windSpeed} km/h`,
        })
        windArrowsRef.current.push(arrow)
      })
    }
  }

  useEffect(() => {
    if (mapRef.current && window.google) {
      updateMapOverlays(detections, weatherStations)
    }
  }, [showHeatmap, showDetectors, showWindOverlay])

  useEffect(() => {
    if (mapRef.current) {
      const typeId = mapType === "satellite" ? google.maps.MapTypeId.HYBRID :
                     mapType === "terrain" ? google.maps.MapTypeId.TERRAIN :
                     google.maps.MapTypeId.ROADMAP
      mapRef.current.setMapTypeId(typeId)
    }
  }, [mapType])

  useEffect(() => {
    fetchData()
  }, [timeRange])

  const renderFallbackMap = () => (
    <div className="h-full w-full rounded-lg bg-gradient-to-br from-amber-900/20 via-orange-900/20 to-red-900/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {detections.slice(0, 100).map((d) => (
        <div
          key={d.id}
          className="absolute w-3 h-3 rounded-full cursor-pointer transition-all hover:scale-150"
          style={{
            left: `${((d.lng + 180) / 360) * 100}%`,
            top: `${((90 - d.lat) / 180) * 100}%`,
            backgroundColor: allergenColors[d.allergenLevel],
            boxShadow: showHeatmap ? `0 0 15px 5px ${allergenColors[d.allergenLevel]}40` : "none",
          }}
          onClick={() => setSelectedDetection(d)}
          title={`${d.species}: ${d.concentration} spores/m³`}
        />
      ))}

      {showWindOverlay && weatherStations.slice(0, 30).map((s) => (
        <div
          key={s.id}
          className="absolute text-cyan-400 opacity-60"
          style={{
            left: `${((s.lng + 180) / 360) * 100}%`,
            top: `${((90 - s.lat) / 180) * 100}%`,
            transform: `rotate(${s.windDirection}deg)`,
            fontSize: `${10 + s.windSpeed / 3}px`,
          }}
        >
          →
        </div>
      ))}
    </div>
  )

  return (
    <div className="relative h-full w-full min-h-[600px]">
      {GOOGLE_MAPS_API_KEY ? (
        <div ref={mapContainerRef} className="h-full w-full rounded-lg" />
      ) : (
        renderFallbackMap()
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-amber-500" />
            <p>Loading Spore Detection Network...</p>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="absolute top-4 left-4 flex gap-2 flex-wrap z-10">
        <Badge variant="secondary" className="bg-background/90 backdrop-blur">
          <Activity className="h-3 w-3 mr-1" />
          {stats.totalDetections} Detections
        </Badge>
        <Badge variant="secondary" className="bg-background/90 backdrop-blur">
          Avg: {stats.avgConcentration} spores/m³
        </Badge>
        <Badge style={{ backgroundColor: allergenColors[stats.alertLevel] }} className="text-white">
          {stats.alertLevel.toUpperCase()} ALERT
        </Badge>
      </div>

      {/* Time Range Selector */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32 bg-background/90 backdrop-blur">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last Hour</SelectItem>
            <SelectItem value="6h">Last 6 Hours</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Map Type Controls */}
      <div className="absolute bottom-4 left-4 flex gap-1 z-10">
        <Button variant={mapType === "satellite" ? "default" : "secondary"} size="sm" className="bg-background/90 backdrop-blur" onClick={() => setMapType("satellite")}>
          <Satellite className="h-4 w-4 mr-1" /> Satellite
        </Button>
        <Button variant={mapType === "terrain" ? "default" : "secondary"} size="sm" className="bg-background/90 backdrop-blur" onClick={() => setMapType("terrain")}>
          <Mountain className="h-4 w-4 mr-1" /> Terrain
        </Button>
        <Button variant={mapType === "roadmap" ? "default" : "secondary"} size="sm" className="bg-background/90 backdrop-blur" onClick={() => setMapType("roadmap")}>
          <Map className="h-4 w-4 mr-1" /> Map
        </Button>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <Button variant="secondary" size="icon" className="bg-background/90 backdrop-blur" onClick={() => setShowFilters(!showFilters)}>
          <Layers className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="bg-background/90 backdrop-blur" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="absolute top-16 right-4 w-64 bg-background/95 backdrop-blur z-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" /> Layers & Overlays</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2"><Wind className="h-3 w-3" /> Wind Patterns</Label>
              <Switch checked={showWindOverlay} onCheckedChange={setShowWindOverlay} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2"><Droplets className="h-3 w-3" /> Spore Heatmap</Label>
              <Switch checked={showHeatmap} onCheckedChange={setShowHeatmap} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2"><MapPin className="h-3 w-3" /> Detection Markers</Label>
              <Switch checked={showDetectors} onCheckedChange={setShowDetectors} />
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">Alert Legend:</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(allergenColors).map(([level, color]) => (
                  <div key={level} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs capitalize">{level}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Detection */}
      {selectedDetection && (
        <Card className="absolute bottom-16 left-4 w-80 bg-background/95 backdrop-blur z-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: allergenColors[selectedDetection.allergenLevel] }} />
                {selectedDetection.species}
              </span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedDetection(null)}>×</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <span>{selectedDetection.concentration} spores/m³</span>
              </div>
              <div className="flex items-center gap-1">
                <Wind className="h-3 w-3 text-muted-foreground" />
                <span>{selectedDetection.windSpeed} km/h</span>
              </div>
              <div className="flex items-center gap-1">
                <Droplets className="h-3 w-3 text-muted-foreground" />
                <span>{selectedDetection.humidity}% humidity</span>
              </div>
              <div className="flex items-center gap-1">
                <Thermometer className="h-3 w-3 text-muted-foreground" />
                <span>{selectedDetection.temperature}°C</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Location: {selectedDetection.lat.toFixed(4)}, {selectedDetection.lng.toFixed(4)}
            </p>
            <Badge style={{ backgroundColor: allergenColors[selectedDetection.allergenLevel] }} className="text-white">
              {selectedDetection.allergenLevel.toUpperCase()} ALLERGEN LEVEL
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

declare global {
  interface Window {
    initSporeMap?: () => void
  }
}
