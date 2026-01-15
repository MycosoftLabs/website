"use client"

/**
 * Flight Tracker Widget
 * 
 * Displays real-time aircraft tracking data
 * Inspired by FlightRadar24 UI patterns
 */

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plane,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Navigation,
  Gauge,
  MapPin,
  Clock,
  Eye,
  Filter,
} from "lucide-react"

interface Aircraft {
  id: string
  name: string
  description: string
  location: {
    latitude: number
    longitude: number
    altitude?: number
  }
  properties: {
    callsign?: string
    origin?: string
    destination?: string
    altitude?: number
    velocity?: number
    heading?: number
    verticalRate?: number
    squawk?: string
    onGround?: boolean
    category?: string
    registration?: string
    aircraftType?: string
    flightNumber?: string
  }
}

interface FlightTrackerData {
  source: string
  timestamp: string
  total: number
  aircraft: Aircraft[]
}

function AircraftIcon({ heading = 0, isGround = false }: { heading?: number; isGround?: boolean }) {
  return (
    <div 
      className={cn(
        "relative transition-transform",
        isGround ? "text-gray-500" : "text-amber-400"
      )}
      style={{ transform: `rotate(${heading}deg)` }}
    >
      <Plane className="w-4 h-4 fill-current" />
    </div>
  )
}

function AircraftListItem({ aircraft, onClick }: { aircraft: Aircraft; onClick: () => void }) {
  const { properties } = aircraft
  const altitudeFt = properties.altitude ? Math.round(properties.altitude * 3.28084) : 0
  const speedKts = properties.velocity ? Math.round(properties.velocity * 1.94384) : 0
  
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-2 p-2 rounded bg-black/30 hover:bg-black/50 cursor-pointer transition-colors border border-transparent hover:border-amber-500/20"
    >
      <AircraftIcon heading={properties.heading} isGround={properties.onGround} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-amber-400">
            {properties.callsign || aircraft.name}
          </span>
          {properties.aircraftType && (
            <Badge variant="outline" className="text-[7px] px-1 py-0 border-gray-600 text-gray-400">
              {properties.aircraftType}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-[9px] text-gray-500">
          {properties.origin && properties.destination && (
            <span>{properties.origin} → {properties.destination}</span>
          )}
        </div>
      </div>
      
      <div className="text-right">
        <div className="flex items-center gap-1 text-[10px] text-cyan-400">
          {properties.verticalRate && properties.verticalRate > 50 ? (
            <TrendingUp className="w-2.5 h-2.5" />
          ) : properties.verticalRate && properties.verticalRate < -50 ? (
            <TrendingDown className="w-2.5 h-2.5" />
          ) : null}
          {altitudeFt.toLocaleString()} ft
        </div>
        <div className="text-[9px] text-gray-500">{speedKts} kts</div>
      </div>
      
      <ChevronRight className="w-3 h-3 text-gray-600" />
    </div>
  )
}

export function FlightTrackerWidget({
  className,
  bounds,
  limit = 20,
  compact = false,
  onAircraftClick,
}: {
  className?: string
  bounds?: { north: number; south: number; east: number; west: number }
  limit?: number
  compact?: boolean
  onAircraftClick?: (aircraft: Aircraft) => void
}) {
  const [data, setData] = useState<FlightTrackerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "airborne" | "ground">("all")

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      let url = `/api/oei/flightradar24?limit=${limit}`
      
      if (bounds) {
        url += `&lamin=${bounds.south}&lamax=${bounds.north}&lomin=${bounds.west}&lomax=${bounds.east}`
      }
      
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch")
      const json = await response.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError("Unable to fetch flight data")
      console.error("[FlightTracker]", err)
    } finally {
      setLoading(false)
    }
  }, [bounds, limit])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [fetchData])

  const aircraftList = data?.aircraft || []
  const filteredAircraft = aircraftList.filter(a => {
    if (filter === "airborne") return !a.properties?.onGround
    if (filter === "ground") return a.properties?.onGround
    return true
  })

  const stats = {
    total: data?.total || aircraftList.length || 0,
    airborne: aircraftList.filter(a => !a.properties?.onGround).length,
    ground: aircraftList.filter(a => a.properties?.onGround).length,
  }

  if (compact) {
    return (
      <div className={cn("p-2 rounded-lg bg-gradient-to-br from-sky-500/10 to-cyan-500/5 border border-sky-500/30", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Plane className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] font-bold text-white">AIRCRAFT</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[7px] px-1 py-0 border-sky-500/50 text-sky-400">
              {stats.airborne} flying
            </Badge>
            {loading && <RefreshCw className="w-3 h-3 text-gray-500 animate-spin" />}
          </div>
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1 text-[8px]">
          <div className="text-center p-1 rounded bg-black/30">
            <div className="text-lg font-bold text-sky-400">{stats.total}</div>
            <div className="text-[7px] text-gray-500">Total</div>
          </div>
          <div className="text-center p-1 rounded bg-black/30">
            <div className="text-lg font-bold text-green-400">{stats.airborne}</div>
            <div className="text-[7px] text-gray-500">Airborne</div>
          </div>
          <div className="text-center p-1 rounded bg-black/30">
            <div className="text-lg font-bold text-gray-400">{stats.ground}</div>
            <div className="text-[7px] text-gray-500">Ground</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("p-3 rounded-lg bg-gradient-to-br from-sky-500/10 to-cyan-500/5 border border-sky-500/30 flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold text-white">AIRCRAFT TRACKING</span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchData}
            className="h-6 w-6"
            disabled={loading}
          >
            <RefreshCw className={cn("w-3 h-3 text-gray-400", loading && "animate-spin")} />
          </Button>
          <Badge variant="outline" className="text-[8px] border-sky-500/50 text-sky-400">
            {data?.source || "FR24"}
          </Badge>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <div className="text-center p-2 rounded bg-black/30 border border-sky-500/20">
          <Plane className="w-3 h-3 text-sky-400 mx-auto mb-0.5" />
          <div className="text-lg font-bold text-sky-400">{stats.total}</div>
          <div className="text-[7px] text-gray-500">TOTAL</div>
        </div>
        <div className="text-center p-2 rounded bg-black/30 border border-green-500/20">
          <Navigation className="w-3 h-3 text-green-400 mx-auto mb-0.5" />
          <div className="text-lg font-bold text-green-400">{stats.airborne}</div>
          <div className="text-[7px] text-gray-500">AIRBORNE</div>
        </div>
        <div className="text-center p-2 rounded bg-black/30 border border-gray-500/20">
          <MapPin className="w-3 h-3 text-gray-400 mx-auto mb-0.5" />
          <div className="text-lg font-bold text-gray-400">{stats.ground}</div>
          <div className="text-[7px] text-gray-500">GROUND</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 mb-2">
        <Filter className="w-3 h-3 text-gray-500" />
        {(["all", "airborne", "ground"] as const).map(f => (
          <Button
            key={f}
            variant="ghost"
            size="sm"
            onClick={() => setFilter(f)}
            className={cn(
              "h-5 px-2 text-[8px]",
              filter === f 
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/50"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            {f.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Aircraft List */}
      {error ? (
        <div className="text-center py-4 text-red-400 text-xs">{error}</div>
      ) : (
        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="space-y-1">
            {filteredAircraft.slice(0, limit).map(aircraft => (
              <AircraftListItem 
                key={aircraft.id} 
                aircraft={aircraft}
                onClick={() => onAircraftClick?.(aircraft)}
              />
            ))}
            {filteredAircraft.length === 0 && !loading && (
              <div className="text-center py-4 text-gray-500 text-xs">
                No aircraft in view
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center justify-between text-[7px] text-gray-600">
        <div className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          Updated: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "--"}
        </div>
        <div className="flex items-center gap-1">
          <Eye className="w-2.5 h-2.5" />
          Showing {Math.min(filteredAircraft.length, limit)} of {stats.total}
        </div>
      </div>
    </div>
  )
}

export default FlightTrackerWidget
