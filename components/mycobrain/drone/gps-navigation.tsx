"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { 
  Navigation2, 
  MapPin, 
  Satellite, 
  Signal, 
  Compass,
  MoveUp,
  Clock
} from "lucide-react"

interface GPSNavigationProps {
  latitude: number
  longitude: number
  altitude: number        // meters
  groundSpeed: number     // m/s
  heading: number         // degrees
  hdop: number           // horizontal dilution of precision
  satellites: number
  fixType: "no_fix" | "2d" | "3d" | "rtk_float" | "rtk_fixed"
  homeDistance?: number   // meters
  homeBearing?: number    // degrees
  homeSet?: boolean
  className?: string
}

export function GPSNavigation({
  latitude,
  longitude,
  altitude,
  groundSpeed,
  heading,
  hdop,
  satellites,
  fixType,
  homeDistance,
  homeBearing,
  homeSet = false,
  className
}: GPSNavigationProps) {

  const getFixColor = () => {
    switch (fixType) {
      case "rtk_fixed": return "text-purple-400 border-purple-500/50"
      case "rtk_float": return "text-blue-400 border-blue-500/50"
      case "3d": return "text-green-400 border-green-500/50"
      case "2d": return "text-yellow-400 border-yellow-500/50"
      default: return "text-red-400 border-red-500/50"
    }
  }

  const getFixLabel = () => {
    switch (fixType) {
      case "rtk_fixed": return "RTK FIXED"
      case "rtk_float": return "RTK FLOAT"
      case "3d": return "3D FIX"
      case "2d": return "2D FIX"
      default: return "NO FIX"
    }
  }

  const getHDOPStatus = (h: number) => {
    if (h < 1) return { label: "Excellent", color: "text-green-400" }
    if (h < 2) return { label: "Good", color: "text-green-400" }
    if (h < 5) return { label: "Moderate", color: "text-yellow-400" }
    if (h < 10) return { label: "Fair", color: "text-orange-400" }
    return { label: "Poor", color: "text-red-400" }
  }

  const hdopStatus = getHDOPStatus(hdop)

  const formatCoordinate = (value: number, isLat: boolean) => {
    const direction = isLat ? (value >= 0 ? "N" : "S") : (value >= 0 ? "E" : "W")
    const absValue = Math.abs(value)
    const degrees = Math.floor(absValue)
    const minutes = (absValue - degrees) * 60
    return `${degrees}°${minutes.toFixed(4)}'${direction}`
  }

  const formatDistance = (meters?: number) => {
    if (!meters) return "--"
    if (meters < 1000) return `${meters.toFixed(0)}m`
    return `${(meters / 1000).toFixed(2)}km`
  }

  return (
    <div className={cn("p-3 rounded-lg bg-black/60 border border-cyan-500/30", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Navigation2 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-400">GPS / NAVIGATION</span>
        </div>
        <Badge 
          variant="outline" 
          className={cn("text-[10px]", getFixColor())}
        >
          {getFixLabel()}
        </Badge>
      </div>

      {/* Satellite status bar */}
      <div className="flex items-center gap-2 mb-3 p-2 bg-gray-900/50 rounded">
        <Satellite className="w-4 h-4 text-green-400" />
        <div className="flex-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-400">Satellites</span>
            <span className="text-cyan-400 font-mono">{satellites}</span>
          </div>
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div 
                key={i}
                className={cn(
                  "h-2 flex-1 rounded-sm",
                  i < satellites ? "bg-green-500" : "bg-gray-700"
                )}
              />
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-400">HDOP</div>
          <div className={cn("text-xs font-mono", hdopStatus.color)}>
            {hdop.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 bg-gray-900/50 rounded">
          <div className="flex items-center gap-1 text-gray-400 text-[10px] mb-1">
            <MapPin className="w-3 h-3" />
            <span>LAT</span>
          </div>
          <div className="text-sm font-mono text-cyan-400">
            {formatCoordinate(latitude, true)}
          </div>
          <div className="text-[9px] text-gray-500 font-mono">
            {latitude.toFixed(7)}°
          </div>
        </div>
        <div className="p-2 bg-gray-900/50 rounded">
          <div className="flex items-center gap-1 text-gray-400 text-[10px] mb-1">
            <MapPin className="w-3 h-3" />
            <span>LON</span>
          </div>
          <div className="text-sm font-mono text-cyan-400">
            {formatCoordinate(longitude, false)}
          </div>
          <div className="text-[9px] text-gray-500 font-mono">
            {longitude.toFixed(7)}°
          </div>
        </div>
      </div>

      {/* Flight data */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-[9px]">
        <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
          <div className="flex items-center gap-1 text-gray-500 mb-0.5">
            <MoveUp className="w-2.5 h-2.5" />
            <span>ALT</span>
          </div>
          <div className="font-mono text-cyan-400">{altitude.toFixed(1)}m</div>
        </div>

        <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
          <div className="flex items-center gap-1 text-gray-500 mb-0.5">
            <Signal className="w-2.5 h-2.5" />
            <span>SPD</span>
          </div>
          <div className="font-mono text-cyan-400">{groundSpeed.toFixed(1)}m/s</div>
          <div className="text-[8px] text-gray-600">{(groundSpeed * 3.6).toFixed(1)}km/h</div>
        </div>

        <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
          <div className="flex items-center gap-1 text-gray-500 mb-0.5">
            <Compass className="w-2.5 h-2.5" />
            <span>HDG</span>
          </div>
          <div className="font-mono text-cyan-400">{heading.toFixed(0)}°</div>
          <div className="text-[8px] text-gray-600">
            {heading >= 337.5 || heading < 22.5 ? "N" :
             heading < 67.5 ? "NE" :
             heading < 112.5 ? "E" :
             heading < 157.5 ? "SE" :
             heading < 202.5 ? "S" :
             heading < 247.5 ? "SW" :
             heading < 292.5 ? "W" : "NW"}
          </div>
        </div>

        <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
          <span className="text-gray-500">Accuracy</span>
          <div className={cn("font-mono", hdopStatus.color)}>
            {hdopStatus.label}
          </div>
        </div>
      </div>

      {/* Home position */}
      {homeSet && (
        <div className="p-2 bg-blue-900/20 border border-blue-500/30 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                <span className="text-[10px] text-blue-400">H</span>
              </div>
              <div>
                <div className="text-[10px] text-blue-400">HOME POSITION</div>
                <div className="text-[9px] text-gray-500">Return point set</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono text-blue-400">
                {formatDistance(homeDistance)}
              </div>
              <div className="text-[9px] text-gray-500">
                {homeBearing?.toFixed(0)}° bearing
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No fix warning */}
      {fixType === "no_fix" && (
        <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded flex items-center gap-2">
          <Satellite className="w-4 h-4 text-red-400" />
          <span className="text-[10px] text-red-400">
            NO GPS FIX - Searching for satellites...
          </span>
        </div>
      )}
    </div>
  )
}
