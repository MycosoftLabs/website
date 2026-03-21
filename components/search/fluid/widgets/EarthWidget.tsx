"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Map, MapPin, AlertTriangle, Maximize2, Minimize2, Loader2, Thermometer, Droplets, CloudRain, Wind, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
)
const MarkerClusterGroup = dynamic(
  () => import("react-leaflet-cluster").then((mod) => mod.default),
  { ssr: false }
)

export interface MapObservation {
  id: string
  species: string
  scientificName?: string
  commonName?: string
  lat: number
  lng: number
  timestamp?: string
  imageUrl?: string
  isToxic?: boolean
  observer?: string
}

export interface WeatherCondition {
  temperature: number // Celsius
  humidity: number // Percentage
  precipitation: number // mm
  windSpeed: number // m/s
  cloudCover: number // Percentage
  uvIndex: number
}

export interface Earth2Data {
  currentConditions?: WeatherCondition
  sporeZones?: any[]
  growthPrediction?: { score: number; factors: string[]; recommendation: string }
}

export interface EventObservation {
  id: string
  title: string
  type: string
  severity?: string
  lat: number
  lng: number
  timestamp?: string
  magnitude?: number
}

interface EarthWidgetProps {
  data: MapObservation[]
  eventsData?: EventObservation[]
  earth2Data?: Earth2Data | null
  searchLocation?: { lat: number; lng: number; name?: string }
  isFocused?: boolean
  error?: string
  isLoading?: boolean
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
}

export function EarthWidget({
  data = [],
  eventsData = [],
  earth2Data,
  searchLocation,
  isFocused = false,
  error,
  isLoading = false,
  onAddToNotepad,
}: EarthWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [selectedObservation, setSelectedObservation] = useState<MapObservation | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const mapCenter = useMemo(() => {
    if (searchLocation) {
      return [searchLocation.lat, searchLocation.lng] as [number, number]
    }
    if (data.length > 0) {
      const avgLat = data.reduce((sum, obs) => sum + obs.lat, 0) / data.length
      const avgLng = data.reduce((sum, obs) => sum + obs.lng, 0) / data.length
      return [avgLat, avgLng] as [number, number]
    }
    return [40.7128, -74.0060] as [number, number] 
  }, [data, searchLocation])

  const toxicCount = data.filter((o) => o.isToxic).length
  const safeCount = data.length - toxicCount

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500 opacity-60" />
        <p className="text-sm font-medium text-red-400">Earth Error</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-muted-foreground">Loading Earth data...</p>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  const mapHeight = isFocused || isExpanded ? "h-[400px]" : "h-[250px]"
  const conditions = earth2Data?.currentConditions

  return (
    <div className={cn("space-y-3", isFocused && "")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <MapPin className="h-3.5 w-3.5" />
            {safeCount} observations
          </span>
          {toxicCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {toxicCount} toxic
          </span>
          )}
          {eventsData.length > 0 && (
            <span className="flex items-center gap-1.5 text-orange-400 font-bold">
              <AlertCircle className="h-3.5 w-3.5" />
              {eventsData.length} events
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <motion.div
        className={cn(
          "rounded-xl overflow-hidden border border-emerald-500/20 bg-black/20 relative",
          mapHeight,
          "transition-all duration-300"
        )}
        layout
      >
        <MapContainer
          center={mapCenter}
          zoom={8}
          className="h-full w-full z-0"
          scrollWheelZoom={isFocused || isExpanded}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerClusterGroup
            chunkedLoading
            spiderfyOnMaxZoom
            showCoverageOnHover={false}
            maxClusterRadius={50}
            disableClusteringAtZoom={15}
          >
            {data.map((observation) => (
              <Marker
                key={observation.id}
                position={[observation.lat, observation.lng]}
                eventHandlers={{
                  click: () => setSelectedObservation(observation),
                }}
              >
                <Popup>
                  <div className="min-w-[150px]">
                    <p className="font-semibold text-sm">
                      {observation.commonName || observation.species}
                    </p>
                    <p className="text-xs text-gray-500 italic">
                      {observation.scientificName || observation.species}
                    </p>
                    {observation.isToxic && (
                      <span className="inline-block mt-1 text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">
                        ⚠️ Toxic
                      </span>
                    )}
                    {observation.timestamp && (
                      <p className="text-xs text-gray-400 mt-1">
                        Observed: {new Date(observation.timestamp).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {eventsData.map((event) => {
              const radius = event.magnitude ? Math.pow(1.5, event.magnitude) * 5000 : 20000;
              const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
              const ageMs = event.timestamp ? (new Date().getTime() - new Date(event.timestamp).getTime()) : 0;
              const ageRatio = Math.max(0, Math.min(1, 1 - (ageMs / maxAgeMs)));
              const strokeOpacity = 0.4 + (0.6 * ageRatio);
              const fillOpacity = 0.1 + (0.3 * ageRatio);
              const color = event.type.toLowerCase().includes("fire") ? "#ef4444" : 
                            event.type.toLowerCase().includes("storm") ? "#3b82f6" : "#f97316";

              return (
              <div key={event.id}>
                <Circle 
                  center={[event.lat, event.lng]} 
                  radius={radius} 
                  pathOptions={{ color, stroke: true, weight: 2, opacity: strokeOpacity, fillColor: color, fillOpacity }} 
                />
                <Marker
                  position={[event.lat, event.lng]}
                  eventHandlers={{
                    click: () => {
                      if (onAddToNotepad) {
                        onAddToNotepad({
                          type: "event",
                          title: event.title || event.type,
                          content: `Global Event at [${event.lat.toFixed(2)}, ${event.lng.toFixed(2)}]. Magnitude: ${event.magnitude || event.severity || "N/A"}`,
                          source: "Earth Simulator",
                        })
                      }
                    },
                  }}
                >
                  <Popup>
                    <div className="min-w-[150px]">
                      <p className="font-semibold text-sm flex items-center gap-1.5 text-orange-500">
                        <AlertCircle className="w-4 h-4" />
                        {event.title || event.type}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 capitalize">{event.type}</p>
                      {(event.magnitude || event.severity) && (
                        <p className="text-xs font-semibold text-red-600 mt-1">
                          {event.magnitude ? `Magnitude: ${event.magnitude}` : event.severity}
                        </p>
                      )}
                      {event.timestamp && (
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </div>
            )})}
          </MarkerClusterGroup>
        </MapContainer>

        {conditions && (
          <div className="absolute top-2 right-2 z-[400] bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/10 text-xs shadow-lg pointer-events-none">
            <div className="flex flex-col gap-2 font-medium">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-orange-400"><Thermometer className="w-3.5 h-3.5"/> Temp</div>
                <span>{conditions.temperature}°C</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-blue-400"><Droplets className="w-3.5 h-3.5"/> Humid</div>
                <span>{conditions.humidity}%</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-gray-300"><Wind className="w-3.5 h-3.5"/> Wind</div>
                <span>{conditions.windSpeed} m/s</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default EarthWidget
