"use client"

/**
 * Space Weather Widget
 * 
 * Displays real-time space weather conditions from NOAA SWPC
 * Inspired by https://www.swpc.noaa.gov/
 */

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { 
  Sun, 
  Radio, 
  Zap, 
  Gauge, 
  Wind,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react"

interface SpaceWeatherData {
  conditions: {
    solarWindSpeed: number
    solarWindDensity: number
    solarWindTemperature: number
    bz: number
    bt: number
    gScale: number
    sScale: number
    rScale: number
    timestamp: string
  }
  scales: {
    radio: { current: number; label: string; description: string }
    solar: { current: number; label: string; description: string }
    geomagnetic: { current: number; label: string; description: string }
  }
  solarWind: {
    speed: number
    speedUnit: string
    density: number
    densityUnit: string
  }
  magneticField: {
    bz: number
    bt: number
    unit: string
    stormPotential: string
  }
}

function ScaleIndicator({ 
  label, 
  value, 
  description, 
  color 
}: { 
  label: string
  value: number
  description: string
  color: string
}) {
  const scaleColors: Record<number, string> = {
    0: "border-green-500/50 bg-green-500/10 text-green-400",
    1: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
    2: "border-orange-500/50 bg-orange-500/10 text-orange-400",
    3: "border-red-500/50 bg-red-500/10 text-red-400",
    4: "border-red-600/50 bg-red-600/10 text-red-300",
    5: "border-purple-500/50 bg-purple-500/10 text-purple-400",
  }
  
  return (
    <div className="flex flex-col items-center">
      <span className="text-[8px] text-gray-500 mb-1">{description.split(" ")[0]}</span>
      <div 
        className={cn(
          "w-10 h-10 rounded border-2 flex items-center justify-center transition-all",
          scaleColors[value] || scaleColors[0]
        )}
      >
        <span className="text-lg font-bold">{label}</span>
      </div>
      <span className="text-[7px] text-gray-500 mt-1">{value > 0 ? "active" : "none"}</span>
    </div>
  )
}

export function SpaceWeatherWidget({ 
  className,
  compact = false 
}: { 
  className?: string
  compact?: boolean
}) {
  const [data, setData] = useState<SpaceWeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/oei/space-weather")
        if (!response.ok) throw new Error("Failed to fetch")
        const json = await response.json()
        setData(json)
        setError(null)
      } catch (err) {
        setError("Unable to fetch space weather data")
        console.error("[SpaceWeather]", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className={cn("p-3 rounded-lg bg-black/40 border border-amber-500/20", className)}>
        <div className="flex items-center gap-2 text-amber-400 animate-pulse">
          <Sun className="w-4 h-4" />
          <span className="text-xs">Loading space weather...</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={cn("p-3 rounded-lg bg-black/40 border border-red-500/20", className)}>
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs">{error || "No data available"}</span>
        </div>
      </div>
    )
  }

  // Extract with defaults to handle missing data
  const conditions = data.conditions || { timestamp: new Date().toISOString() }
  const scales = data.scales || {
    radio: { current: 0, label: "R0", description: "None" },
    solar: { current: 0, label: "S0", description: "None" },
    geomagnetic: { current: 0, label: "G0", description: "None" },
  }
  const solarWind = data.solarWind || { speed: 0, speedUnit: "km/s", density: 0, densityUnit: "p/cm³" }
  const magneticField = data.magneticField || { bz: 0, bt: 0, unit: "nT", stormPotential: "Low" }

  if (compact) {
    return (
      <div className={cn("p-2 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/30", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-bold text-white">SPACE WX</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge 
              variant="outline" 
              className={cn(
                "text-[7px] px-1 py-0",
                scales.radio.current > 0 ? "border-red-500/50 text-red-400" : "border-green-500/50 text-green-400"
              )}
            >
              R{scales.radio.current}
            </Badge>
            <Badge 
              variant="outline" 
              className={cn(
                "text-[7px] px-1 py-0",
                scales.solar.current > 0 ? "border-orange-500/50 text-orange-400" : "border-green-500/50 text-green-400"
              )}
            >
              S{scales.solar.current}
            </Badge>
            <Badge 
              variant="outline" 
              className={cn(
                "text-[7px] px-1 py-0",
                scales.geomagnetic.current > 0 ? "border-purple-500/50 text-purple-400" : "border-green-500/50 text-green-400"
              )}
            >
              G{scales.geomagnetic.current}
            </Badge>
          </div>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1 text-[8px]">
          <div className="flex items-center gap-1 text-cyan-400">
            <Wind className="w-2.5 h-2.5" />
            {(solarWind.speed ?? 0).toFixed(0)} {solarWind.speedUnit}
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <Gauge className="w-2.5 h-2.5" />
            Bz: {(magneticField.bz ?? 0).toFixed(1)} nT
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/30", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white">SPACE WEATHER CONDITIONS</span>
        </div>
        <Badge variant="outline" className="text-[8px] border-amber-500/50 text-amber-400">
          NOAA SWPC
        </Badge>
      </div>

      {/* NOAA Scales */}
      <div className="mb-3">
        <div className="text-[9px] text-gray-500 mb-2">24-HOUR OBSERVED MAXIMUMS</div>
        <div className="flex items-center justify-around">
          <ScaleIndicator 
            label={`R${scales.radio.current}`}
            value={scales.radio.current}
            description="Radio Blackout"
            color="red"
          />
          <ScaleIndicator 
            label={`S${scales.solar.current}`}
            value={scales.solar.current}
            description="Solar Radiation"
            color="orange"
          />
          <ScaleIndicator 
            label={`G${scales.geomagnetic.current}`}
            value={scales.geomagnetic.current}
            description="Geomagnetic Storm"
            color="purple"
          />
        </div>
      </div>

      {/* Solar Wind Data */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="p-2 rounded bg-black/30 border border-cyan-500/20">
          <div className="flex items-center gap-1 mb-1">
            <Wind className="w-3 h-3 text-cyan-400" />
            <span className="text-[9px] text-gray-400">Solar Wind Speed</span>
          </div>
          <div className="text-lg font-bold text-cyan-400">
            {(solarWind.speed ?? 0).toFixed(0)}
            <span className="text-[10px] text-gray-500 ml-1">{solarWind.speedUnit}</span>
          </div>
        </div>
        <div className="p-2 rounded bg-black/30 border border-amber-500/20">
          <div className="flex items-center gap-1 mb-1">
            <Activity className="w-3 h-3 text-amber-400" />
            <span className="text-[9px] text-gray-400">Density</span>
          </div>
          <div className="text-lg font-bold text-amber-400">
            {(solarWind.density ?? 0).toFixed(1)}
            <span className="text-[10px] text-gray-500 ml-1">{solarWind.densityUnit}</span>
          </div>
        </div>
      </div>

      {/* Magnetic Field */}
      <div className="p-2 rounded bg-black/30 border border-purple-500/20">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-purple-400" />
            <span className="text-[9px] text-gray-400">Interplanetary Magnetic Field</span>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[7px] px-1",
              magneticField.stormPotential === "High" 
                ? "border-red-500/50 text-red-400" 
                : magneticField.stormPotential === "Moderate"
                  ? "border-orange-500/50 text-orange-400"
                  : "border-green-500/50 text-green-400"
            )}
          >
            {magneticField.stormPotential} Storm Potential
          </Badge>
        </div>
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-gray-500">Bz</span>
              {magneticField.bz < 0 ? (
                <TrendingDown className="w-3 h-3 text-red-400" />
              ) : (
                <TrendingUp className="w-3 h-3 text-green-400" />
              )}
            </div>
            <div className={cn(
              "text-lg font-bold",
              (magneticField.bz ?? 0) < -10 ? "text-red-400" : (magneticField.bz ?? 0) < 0 ? "text-orange-400" : "text-green-400"
            )}>
              {(magneticField.bz ?? 0).toFixed(1)}
              <span className="text-[10px] text-gray-500 ml-0.5">{magneticField.unit}</span>
            </div>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center">
            <div className="text-[8px] text-gray-500">Bt (Total)</div>
            <div className="text-lg font-bold text-purple-400">
              {(magneticField.bt ?? 0).toFixed(1)}
              <span className="text-[10px] text-gray-500 ml-0.5">{magneticField.unit}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between text-[7px] text-gray-600">
        <span>Source: NOAA/SWPC DSCOVR</span>
        <span>{new Date(conditions.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  )
}

export default SpaceWeatherWidget
