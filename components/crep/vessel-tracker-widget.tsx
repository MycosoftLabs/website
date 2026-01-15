"use client"

/**
 * Vessel Tracker Widget
 * 
 * Displays real-time maritime vessel tracking data from AISstream
 * Inspired by MarineTraffic UI patterns
 */

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Ship,
  Anchor,
  RefreshCw,
  ChevronRight,
  Navigation2,
  Clock,
  Eye,
  Filter,
  Waves,
} from "lucide-react"

interface Vessel {
  id: string
  name: string
  description: string
  location: {
    latitude: number
    longitude: number
  }
  properties: {
    mmsi: string
    imo?: string
    callSign?: string
    shipType?: string
    length?: number
    width?: number
    draft?: number
    destination?: string
    eta?: string
    heading?: number
    cog?: number
    sog?: number
    navStatus?: string
    cargo?: string
  }
}

interface VesselTrackerData {
  source: string
  timestamp: string
  total: number
  vessels: Vessel[]
  isLive: boolean
}

type VesselType = "all" | "cargo" | "tanker" | "passenger" | "fishing"

const vesselTypeConfig: Record<VesselType, { label: string; color: string }> = {
  all: { label: "All Vessels", color: "text-blue-400" },
  cargo: { label: "Cargo", color: "text-green-400" },
  tanker: { label: "Tanker", color: "text-red-400" },
  passenger: { label: "Passenger", color: "text-cyan-400" },
  fishing: { label: "Fishing", color: "text-amber-400" },
}

function VesselIcon({ type, heading = 0 }: { type?: string; heading?: number }) {
  const typeColors: Record<string, string> = {
    cargo: "bg-green-500/20 text-green-400",
    tanker: "bg-red-500/20 text-red-400",
    passenger: "bg-cyan-500/20 text-cyan-400",
    fishing: "bg-amber-500/20 text-amber-400",
    default: "bg-blue-500/20 text-blue-400",
  }
  
  const colorClass = typeColors[type?.toLowerCase() || "default"] || typeColors.default
  
  return (
    <div 
      className={cn(
        "w-6 h-6 rounded flex items-center justify-center",
        colorClass
      )}
      style={{ transform: heading ? `rotate(${heading}deg)` : undefined }}
    >
      <Ship className="w-3.5 h-3.5" />
    </div>
  )
}

function VesselListItem({ vessel, onClick }: { vessel: Vessel; onClick: () => void }) {
  const { properties } = vessel
  const speedKnots = properties?.sog != null ? properties.sog.toFixed(1) : "0.0"
  
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-2 p-2 rounded bg-black/30 hover:bg-black/50 cursor-pointer transition-colors border border-transparent hover:border-blue-500/20"
    >
      <VesselIcon type={properties.shipType} heading={properties.heading} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-blue-400 truncate">
            {vessel.name}
          </span>
          {properties.shipType && (
            <Badge variant="outline" className="text-[7px] px-1 py-0 border-gray-600 text-gray-400 shrink-0">
              {properties.shipType}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-[9px] text-gray-500">
          <span>MMSI: {properties.mmsi}</span>
          {properties.destination && (
            <>
              <span>→</span>
              <span className="truncate">{properties.destination}</span>
            </>
          )}
        </div>
      </div>
      
      <div className="text-right shrink-0">
        <div className="text-[10px] text-cyan-400">
          {speedKnots} kn
        </div>
        <div className="text-[8px] text-gray-500">
          {properties.navStatus || "Underway"}
        </div>
      </div>
      
      <ChevronRight className="w-3 h-3 text-gray-600 shrink-0" />
    </div>
  )
}

export function VesselTrackerWidget({
  className,
  bounds,
  limit = 20,
  compact = false,
  onVesselClick,
}: {
  className?: string
  bounds?: { north: number; south: number; east: number; west: number }
  limit?: number
  compact?: boolean
  onVesselClick?: (vessel: Vessel) => void
}) {
  const [data, setData] = useState<VesselTrackerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<VesselType>("all")

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      let url = `/api/oei/aisstream?limit=${limit}`
      
      if (bounds) {
        url += `&lamin=${bounds.south}&lamax=${bounds.north}&lomin=${bounds.west}&lomax=${bounds.east}`
      }
      
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch")
      const json = await response.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError("Unable to fetch vessel data")
      console.error("[VesselTracker]", err)
    } finally {
      setLoading(false)
    }
  }, [bounds, limit])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [fetchData])

  const vesselList = data?.vessels || []
  const filteredVessels = vesselList.filter(v => {
    if (filter === "all") return true
    return v.properties?.shipType?.toLowerCase().includes(filter)
  })

  // Group by type
  const typeStats = vesselList.reduce((acc, v) => {
    const type = v.properties?.shipType?.toLowerCase() || "other"
    if (type.includes("cargo")) acc.cargo++
    else if (type.includes("tanker")) acc.tanker++
    else if (type.includes("passenger")) acc.passenger++
    else if (type.includes("fishing")) acc.fishing++
    else acc.other++
    return acc
  }, { cargo: 0, tanker: 0, passenger: 0, fishing: 0, other: 0 })

  if (compact) {
    return (
      <div className={cn("p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/30", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Ship className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-bold text-white">VESSELS</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(
              "text-[7px] px-1 py-0",
              data?.isLive 
                ? "border-green-500/50 text-green-400" 
                : "border-amber-500/50 text-amber-400"
            )}>
              {data?.isLive ? "LIVE" : "SAMPLE"}
            </Badge>
            {loading && <RefreshCw className="w-3 h-3 text-gray-500 animate-spin" />}
          </div>
        </div>
        <div className="mt-1.5 grid grid-cols-5 gap-0.5 text-[7px]">
          <div className="text-center p-1 rounded bg-black/30">
            <div className="text-sm font-bold text-blue-400">{data?.total || 0}</div>
            <div className="text-[6px] text-gray-500">Total</div>
          </div>
          <div className="text-center p-1 rounded bg-black/30">
            <div className="text-sm font-bold text-green-400">{typeStats.cargo}</div>
            <div className="text-[6px] text-gray-500">Cargo</div>
          </div>
          <div className="text-center p-1 rounded bg-black/30">
            <div className="text-sm font-bold text-red-400">{typeStats.tanker}</div>
            <div className="text-[6px] text-gray-500">Tanker</div>
          </div>
          <div className="text-center p-1 rounded bg-black/30">
            <div className="text-sm font-bold text-cyan-400">{typeStats.passenger}</div>
            <div className="text-[6px] text-gray-500">Psgr</div>
          </div>
          <div className="text-center p-1 rounded bg-black/30">
            <div className="text-sm font-bold text-amber-400">{typeStats.fishing}</div>
            <div className="text-[6px] text-gray-500">Fish</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/30 flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Ship className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white">VESSEL TRACKING</span>
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
          <Badge variant="outline" className={cn(
            "text-[8px]",
            data?.isLive 
              ? "border-green-500/50 text-green-400" 
              : "border-amber-500/50 text-amber-400"
          )}>
            {data?.isLive ? "LIVE AIS" : "SAMPLE"}
          </Badge>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-1 mb-3">
        <div className="text-center p-2 rounded bg-black/30 border border-blue-500/20">
          <Waves className="w-3 h-3 text-blue-400 mx-auto mb-0.5" />
          <div className="text-lg font-bold text-blue-400">{data?.total || 0}</div>
          <div className="text-[7px] text-gray-500">TOTAL</div>
        </div>
        <div className="text-center p-2 rounded bg-black/30 border border-green-500/20">
          <div className="text-lg font-bold text-green-400">{typeStats.cargo}</div>
          <div className="text-[7px] text-gray-500">CARGO</div>
        </div>
        <div className="text-center p-2 rounded bg-black/30 border border-red-500/20">
          <div className="text-lg font-bold text-red-400">{typeStats.tanker}</div>
          <div className="text-[7px] text-gray-500">TANKER</div>
        </div>
        <div className="text-center p-2 rounded bg-black/30 border border-cyan-500/20">
          <div className="text-lg font-bold text-cyan-400">{typeStats.passenger}</div>
          <div className="text-[7px] text-gray-500">PSGR</div>
        </div>
        <div className="text-center p-2 rounded bg-black/30 border border-amber-500/20">
          <div className="text-lg font-bold text-amber-400">{typeStats.fishing}</div>
          <div className="text-[7px] text-gray-500">FISH</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 mb-2 overflow-x-auto">
        <Filter className="w-3 h-3 text-gray-500 shrink-0" />
        {(Object.keys(vesselTypeConfig) as VesselType[]).map(type => (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            onClick={() => setFilter(type)}
            className={cn(
              "h-5 px-2 text-[8px] shrink-0",
              filter === type 
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            {vesselTypeConfig[type].label}
          </Button>
        ))}
      </div>

      {/* Vessel List */}
      {error ? (
        <div className="text-center py-4 text-red-400 text-xs">{error}</div>
      ) : (
        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="space-y-1">
            {filteredVessels.slice(0, limit).map(vessel => (
              <VesselListItem 
                key={vessel.id} 
                vessel={vessel}
                onClick={() => onVesselClick?.(vessel)}
              />
            ))}
            {filteredVessels.length === 0 && !loading && (
              <div className="text-center py-4 text-gray-500 text-xs">
                No vessels in view
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
          Showing {Math.min(filteredVessels.length, limit)} of {data?.total || 0}
        </div>
      </div>
    </div>
  )
}

export default VesselTrackerWidget
