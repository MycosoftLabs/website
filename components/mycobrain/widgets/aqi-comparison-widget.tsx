"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Wind, 
  MapPin, 
  RefreshCw, 
  ArrowUp, 
  ArrowDown, 
  Equal,
  AlertTriangle,
  ExternalLink
} from "lucide-react"

interface AQIStation {
  id: number
  name: string
  city?: string
  country: string
  coordinates: { latitude: number; longitude: number }
  distance_km: number
  last_updated: string
}

interface AQICategory {
  level: string
  color: string
  description: string
}

interface AQIComparison {
  device_iaq: number
  station_aqi: number
  difference: number
  deviceHigher: boolean
  assessment: string
}

interface AQIComparisonWidgetProps {
  deviceIAQ?: number
  deviceLat?: number
  deviceLng?: number
  compact?: boolean
}

export function AQIComparisonWidget({
  deviceIAQ = 0,
  deviceLat = 40.7128, // Default NYC
  deviceLng = -74.006,
  compact = false
}: AQIComparisonWidgetProps) {
  const [station, setStation] = useState<AQIStation | null>(null)
  const [stationAQI, setStationAQI] = useState<number | null>(null)
  const [category, setCategory] = useState<AQICategory | null>(null)
  const [comparison, setComparison] = useState<AQIComparison | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  
  const fetchAQI = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      let url = `/api/environment/aqi?lat=${deviceLat}&lng=${deviceLng}`
      if (deviceIAQ > 0) {
        url += `&device_iaq=${deviceIAQ}`
      }
      
      const res = await fetch(url)
      const data = await res.json()
      
      if (data.ok && data.found) {
        setStation(data.station)
        setStationAQI(data.aqi)
        setCategory(data.category)
        setComparison(data.comparison || null)
        setLastFetch(new Date())
      } else if (data.ok && !data.found) {
        setError("No monitoring stations nearby")
      } else {
        setError(data.error || "Failed to fetch AQI")
      }
    } catch (err) {
      setError("Network error")
      console.error("AQI fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [deviceLat, deviceLng, deviceIAQ])
  
  // Fetch on mount and when device IAQ changes significantly
  useEffect(() => {
    fetchAQI()
    
    // Refresh every 15 minutes
    const interval = setInterval(fetchAQI, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchAQI])
  
  // Get comparison arrow
  function getComparisonIcon() {
    if (!comparison) return <Equal className="h-4 w-4 text-gray-400" />
    if (comparison.difference <= 10) return <Equal className="h-4 w-4 text-green-400" />
    if (comparison.deviceHigher) return <ArrowUp className="h-4 w-4 text-red-400" />
    return <ArrowDown className="h-4 w-4 text-blue-400" />
  }
  
  // Get AQI color
  function getAQIColor(aqi: number): string {
    if (aqi <= 50) return "#00E400"
    if (aqi <= 100) return "#FFFF00"
    if (aqi <= 150) return "#FF7E00"
    if (aqi <= 200) return "#FF0000"
    if (aqi <= 300) return "#8F3F97"
    return "#7E0023"
  }
  
  // Compact version for small widget
  if (compact) {
    return (
      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Regional AQI</span>
          {loading && <RefreshCw className="h-3 w-3 animate-spin text-gray-500" />}
        </div>
        
        {stationAQI ? (
          <div className="flex items-center gap-2">
            <span 
              className="text-2xl font-bold"
              style={{ color: getAQIColor(stationAQI) }}
            >
              {stationAQI}
            </span>
            {deviceIAQ > 0 && comparison && (
              <div className="flex items-center gap-1">
                {getComparisonIcon()}
                <span className="text-xs text-gray-400">
                  {comparison.difference}
                </span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-500 text-sm">--</span>
        )}
        
        {station && (
          <p className="text-xs text-gray-500 mt-1 truncate">
            {station.distance_km}km away
          </p>
        )}
      </div>
    )
  }
  
  // Full widget
  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-blue-400" />
            Air Quality Comparison
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={fetchAQI}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {error ? (
          <div className="flex items-center gap-2 text-yellow-500 text-sm">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        ) : (
          <>
            {/* AQI Values */}
            <div className="grid grid-cols-2 gap-3">
              {/* Device IAQ */}
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-center">
                <p className="text-xs text-gray-400 mb-1">Device IAQ</p>
                <p 
                  className="text-3xl font-bold"
                  style={{ color: deviceIAQ > 0 ? getAQIColor(deviceIAQ) : "#6b7280" }}
                >
                  {deviceIAQ > 0 ? deviceIAQ.toFixed(0) : "--"}
                </p>
                <p className="text-xs text-gray-500">Local reading</p>
              </div>
              
              {/* Station AQI */}
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-center">
                <p className="text-xs text-gray-400 mb-1">Station AQI</p>
                <p 
                  className="text-3xl font-bold"
                  style={{ color: stationAQI ? getAQIColor(stationAQI) : "#6b7280" }}
                >
                  {stationAQI ?? "--"}
                </p>
                <p className="text-xs text-gray-500">
                  {station?.distance_km ? `${station.distance_km}km` : "Regional"}
                </p>
              </div>
            </div>
            
            {/* Category */}
            {category && (
              <div 
                className="p-2 rounded text-center text-sm"
                style={{ 
                  backgroundColor: `${category.color}20`,
                  borderColor: category.color,
                  borderWidth: 1
                }}
              >
                <span style={{ color: category.color }}>{category.level}</span>
              </div>
            )}
            
            {/* Comparison Assessment */}
            {comparison && (
              <div className="flex items-start gap-2 p-2 rounded bg-slate-800/30">
                {getComparisonIcon()}
                <p className="text-xs text-gray-400 flex-1">
                  {comparison.assessment}
                </p>
              </div>
            )}
            
            {/* Station Info */}
            {station && (
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-slate-700/50">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">{station.name}</span>
                </div>
                <a 
                  href={`https://openaq.org/locations/${station.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            
            {lastFetch && (
              <p className="text-xs text-gray-600 text-center">
                Updated {formatTimeAgo(lastFetch)}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export default AQIComparisonWidget
