"use client"

/**
 * Satellite Tracker Widget
 * 
 * Displays real-time satellite tracking data
 * Inspired by https://satellitemap.space/
 */

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Satellite,
  RefreshCw,
  ChevronRight,
  Radio,
  Navigation2,
  Globe,
  Clock,
  Eye,
  Orbit,
  Signal,
} from "lucide-react"

interface SatelliteData {
  id: string
  name: string
  description: string
  location?: {
    latitude: number
    longitude: number
    altitude?: number
  }
  properties: {
    noradId: number
    intlDesignator: string
    objectType: string
    orbitType: string
    inclination: number
    apogee: number
    perigee: number
    period: number
    velocity?: number
    isActive: boolean
    owner?: string
  }
}

interface SatelliteTrackerData {
  source: string
  timestamp: string
  category: string
  total: number
  satellites: SatelliteData[]
}

type SatelliteCategory = "stations" | "starlink" | "weather" | "gnss"

const categoryConfig: Record<SatelliteCategory, { label: string; color: string; icon: React.ReactNode }> = {
  stations: { label: "Space Stations", color: "text-cyan-400", icon: <Satellite className="w-3 h-3" /> },
  starlink: { label: "Starlink", color: "text-blue-400", icon: <Signal className="w-3 h-3" /> },
  weather: { label: "Weather", color: "text-green-400", icon: <Globe className="w-3 h-3" /> },
  gnss: { label: "Navigation", color: "text-amber-400", icon: <Navigation2 className="w-3 h-3" /> },
}

function SatelliteIcon({ type }: { type: string }) {
  const isStation = type.includes("Station")
  const isComm = type.includes("Communication")
  const isNav = type.includes("Navigation")
  
  return (
    <div className={cn(
      "w-6 h-6 rounded flex items-center justify-center",
      isStation ? "bg-cyan-500/20 text-cyan-400" 
        : isComm ? "bg-blue-500/20 text-blue-400"
        : isNav ? "bg-amber-500/20 text-amber-400"
        : "bg-purple-500/20 text-purple-400"
    )}>
      <Satellite className="w-3.5 h-3.5" />
    </div>
  )
}

function SatelliteListItem({ satellite, onClick }: { satellite: SatelliteData; onClick: () => void }) {
  const { properties, location } = satellite
  
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-2 p-2 rounded bg-black/30 hover:bg-black/50 cursor-pointer transition-colors border border-transparent hover:border-purple-500/20"
    >
      <SatelliteIcon type={properties.objectType} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-white truncate">
            {satellite.name}
          </span>
          <Badge variant="outline" className="text-[7px] px-1 py-0 border-gray-600 text-gray-400 shrink-0">
            {properties.orbitType}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-gray-500">
          <span>NORAD: {properties.noradId}</span>
          <span>•</span>
          <span>{properties.objectType}</span>
        </div>
      </div>
      
      <div className="text-right shrink-0">
        <div className="text-[10px] text-purple-400">
          {Math.round(properties?.period ?? 0)} min
        </div>
        <div className="text-[8px] text-gray-500">
          {Math.round(properties?.apogee ?? 0)} km
        </div>
      </div>
      
      <ChevronRight className="w-3 h-3 text-gray-600 shrink-0" />
    </div>
  )
}

export function SatelliteTrackerWidget({
  className,
  defaultCategory = "stations",
  limit = 100,
  compact = false,
  onSatelliteClick,
}: {
  className?: string
  defaultCategory?: SatelliteCategory
  limit?: number
  compact?: boolean
  onSatelliteClick?: (satellite: SatelliteData) => void
}) {
  const [data, setData] = useState<SatelliteTrackerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<SatelliteCategory>(defaultCategory)

  const fetchData = useCallback(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)
    try {
      setLoading(true)
      setError(null)
      const url = `/api/oei/satellites?category=${category}&limit=${limit}`
      const response = await fetch(url, { signal: controller.signal })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        const msg = (json as { error?: string; message?: string }).error ?? (json as { message?: string }).message ?? `Server error ${response.status}`
        const is429 = response.status === 429 || String(msg).includes("429") || String(msg).toLowerCase().includes("rate limit")
        setError(is429 ? "Rate limit reached. Try again in a minute." : msg)
        setLoading(false)
        clearTimeout(timeoutId)
        return
      }
      setData(json)
      setError(null)
      // 200 + rateLimit means we returned stale cache; no error to show
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError"
      if (isAbort) {
        // Timeout or user navigated away; don't show error or log as error
        setError("Request took too long. Try again.")
        return
      }
      const message = err instanceof Error ? err.message : "Unable to fetch satellite data"
      const isNetwork = message === "Failed to fetch"
      const is429 = message.includes("429") || message.toLowerCase().includes("rate limit")
      setError(
        isNetwork
          ? "Network timeout or unreachable. Check connection and try again."
          : is429
            ? "Rate limit reached. Please wait a minute before refreshing."
            : message
      )
      console.error("[SatelliteTracker]", err)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [category, limit])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 90_000) // 90s refresh to reduce 429s (was 60s)
    return () => clearInterval(interval)
  }, [fetchData])

  const satellites = data?.satellites || []
  
  // Group by type with null checks
  const typeGroups = satellites.reduce((acc, sat) => {
    const type = sat.properties?.objectType || "Unknown"
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (compact) {
    return (
      <div className={cn("p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/30", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Satellite className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-bold text-white">SATELLITES</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[7px] px-1 py-0 border-purple-500/50 text-purple-400">
              {satellites.length} tracked
            </Badge>
            {loading && <RefreshCw className="w-3 h-3 text-gray-500 animate-spin" />}
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {Object.entries(typeGroups).slice(0, 3).map(([type, count]) => (
            <Badge 
              key={type}
              variant="outline" 
              className="text-[7px] px-1 py-0 border-gray-600 text-gray-400"
            >
              {type}: {count}
            </Badge>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/30 flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Satellite className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white">SATELLITE TRACKING</span>
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
          <Badge variant="outline" className="text-[8px] border-purple-500/50 text-purple-400">
            {data?.source || "CelesTrak"}
          </Badge>
        </div>
      </div>

      {/* Category Selector */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(Object.keys(categoryConfig) as SatelliteCategory[]).map(cat => (
          <Button
            key={cat}
            variant="ghost"
            size="sm"
            onClick={() => setCategory(cat)}
            className={cn(
              "h-6 px-2 text-[8px] gap-1",
              category === cat 
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            {categoryConfig[cat].icon}
            {categoryConfig[cat].label}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1 mb-3">
        <div className="text-center p-1.5 rounded bg-black/30">
          <div className="text-sm font-bold text-purple-400">{satellites.length}</div>
          <div className="text-[7px] text-gray-500">Total</div>
        </div>
        {Object.entries(typeGroups).slice(0, 3).map(([type, count]) => (
          <div key={type} className="text-center p-1.5 rounded bg-black/30">
            <div className="text-sm font-bold text-gray-400">{count}</div>
            <div className="text-[7px] text-gray-500 truncate">{type.split(" ")[0]}</div>
          </div>
        ))}
      </div>

      {/* Satellite List */}
      {error ? (
        <div className="text-center py-4 text-red-400 text-xs">{error}</div>
      ) : (
        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="space-y-1">
            {satellites.map(satellite => (
              <SatelliteListItem 
                key={satellite.id} 
                satellite={satellite}
                onClick={() => onSatelliteClick?.(satellite)}
              />
            ))}
            {satellites.length === 0 && !loading && (
              <div className="text-center py-4 text-gray-500 text-xs">
                No satellites found
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
          Category: {categoryConfig[category].label}
        </div>
      </div>
    </div>
  )
}

export default SatelliteTrackerWidget
