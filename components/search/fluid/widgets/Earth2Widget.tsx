/**
 * Earth2Widget - Weather and Spore Dispersal Predictions
 * 
 * Displays Earth2 simulation data relevant to fungi:
 * - Current weather conditions (temperature, humidity)
 * - Spore dispersal predictions
 * - Growth-favorable conditions alerts
 */

"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { 
  CloudRain, 
  Thermometer, 
  Droplets, 
  Wind, 
  Loader2, 
  TrendingUp,
  AlertCircle,
  Leaf,
  Sun,
  CloudFog
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface WeatherCondition {
  temperature: number // Celsius
  humidity: number // Percentage
  precipitation: number // mm
  windSpeed: number // m/s
  cloudCover: number // Percentage
  uvIndex: number
}

export interface SporeZone {
  id: string
  name: string
  lat: number
  lng: number
  intensity: "low" | "moderate" | "high"
  species?: string[]
  timestamp: string
}

export interface Earth2Data {
  currentConditions?: WeatherCondition
  forecast?: WeatherCondition[]
  sporeZones?: SporeZone[]
  growthPrediction?: {
    score: number // 0-100
    factors: string[]
    recommendation: string
  }
}

interface Earth2WidgetProps {
  data: Earth2Data | null
  isLoading?: boolean
  isFocused?: boolean
  searchQuery?: string
  error?: string
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
}

// Helper to determine growth favorability
function getGrowthIndicator(conditions?: WeatherCondition): { level: string; color: string; icon: React.ReactNode } {
  if (!conditions) return { level: "Unknown", color: "text-gray-400", icon: <AlertCircle className="h-4 w-4" /> }
  
  const { temperature, humidity } = conditions
  
  // Ideal fungi conditions: 15-25°C, 70-90% humidity
  const tempIdeal = temperature >= 15 && temperature <= 25
  const humidityIdeal = humidity >= 70 && humidity <= 90
  
  if (tempIdeal && humidityIdeal) {
    return { level: "Excellent", color: "text-green-400", icon: <Leaf className="h-4 w-4" /> }
  }
  if ((tempIdeal || humidityIdeal) && temperature > 5 && humidity > 50) {
    return { level: "Good", color: "text-emerald-400", icon: <TrendingUp className="h-4 w-4" /> }
  }
  if (temperature > 0 && temperature < 35 && humidity > 40) {
    return { level: "Moderate", color: "text-yellow-400", icon: <Sun className="h-4 w-4" /> }
  }
  return { level: "Poor", color: "text-red-400", icon: <CloudFog className="h-4 w-4" /> }
}

export function Earth2Widget({
  data,
  isLoading = false,
  isFocused = false,
  searchQuery,
  error,
  onAddToNotepad,
}: Earth2WidgetProps) {
  const conditions = data?.currentConditions
  const sporeZones = data?.sporeZones || []
  const growthIndicator = useMemo(() => getGrowthIndicator(conditions), [conditions])

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-500 opacity-60" />
        <p className="text-sm font-medium text-red-400">Earth2 Error</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    )
  }

  // Empty state
  if (!isLoading && !data) {
    return (
      <div className="text-center py-8">
        <CloudRain className="h-12 w-12 mx-auto mb-3 text-blue-500 opacity-60" />
        <p className="text-sm text-muted-foreground">
          No weather data available
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Earth2 provides weather conditions for fungi growth
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[150px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-muted-foreground">Loading Earth2 data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 overflow-hidden flex-1">
      {/* Growth conditions banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center justify-between p-3 rounded-xl",
          "bg-gradient-to-r from-blue-500/10 to-purple-500/10",
          "border border-blue-500/20"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-black/20", growthIndicator.color)}>
            {growthIndicator.icon}
          </div>
          <div>
            <p className="text-sm font-medium">Fungi Growth Conditions</p>
            <p className={cn("text-xs", growthIndicator.color)}>
              {growthIndicator.level}
            </p>
          </div>
        </div>
        {onAddToNotepad && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onAddToNotepad({
              type: "earth2",
              title: `Growth Conditions: ${growthIndicator.level}`,
              content: conditions 
                ? `Temp: ${conditions.temperature}°C, Humidity: ${conditions.humidity}%`
                : "No data",
              source: "Earth2",
            })}
          >
            Save
          </Button>
        )}
      </motion.div>

      {/* Current conditions */}
      {conditions && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-black/10 border border-white/5">
            <Thermometer className="h-4 w-4 text-orange-400" />
            <div>
              <p className="text-xs text-muted-foreground">Temperature</p>
              <p className="text-sm font-medium">{conditions.temperature}°C</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-black/10 border border-white/5">
            <Droplets className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">Humidity</p>
              <p className="text-sm font-medium">{conditions.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-black/10 border border-white/5">
            <CloudRain className="h-4 w-4 text-cyan-400" />
            <div>
              <p className="text-xs text-muted-foreground">Precipitation</p>
              <p className="text-sm font-medium">{conditions.precipitation} mm</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-black/10 border border-white/5">
            <Wind className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-muted-foreground">Wind</p>
              <p className="text-sm font-medium">{conditions.windSpeed} m/s</p>
            </div>
          </div>
        </div>
      )}

      {/* Spore dispersal zones */}
      {sporeZones.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Spore Dispersal Zones
          </p>
          {sporeZones.slice(0, isFocused ? 5 : 2).map((zone, index) => (
            <motion.div
              key={zone.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg",
                "bg-gradient-to-r",
                zone.intensity === "high" && "from-red-500/10 to-orange-500/10 border-red-500/20",
                zone.intensity === "moderate" && "from-yellow-500/10 to-amber-500/10 border-yellow-500/20",
                zone.intensity === "low" && "from-green-500/10 to-emerald-500/10 border-green-500/20",
                "border"
              )}
            >
              <div>
                <p className="text-sm font-medium">{zone.name}</p>
                {zone.species && zone.species.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {zone.species.slice(0, 2).join(", ")}
                    {zone.species.length > 2 && ` +${zone.species.length - 2}`}
                  </p>
                )}
              </div>
              <span className={cn(
                "text-xs px-2 py-1 rounded-full",
                zone.intensity === "high" && "bg-red-500/20 text-red-300",
                zone.intensity === "moderate" && "bg-yellow-500/20 text-yellow-300",
                zone.intensity === "low" && "bg-green-500/20 text-green-300"
              )}>
                {zone.intensity}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Growth prediction */}
      {data?.growthPrediction && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Growth Score</p>
            <span className={cn(
              "text-lg font-bold",
              data.growthPrediction.score >= 70 && "text-green-400",
              data.growthPrediction.score >= 40 && data.growthPrediction.score < 70 && "text-yellow-400",
              data.growthPrediction.score < 40 && "text-red-400"
            )}>
              {data.growthPrediction.score}/100
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {data.growthPrediction.recommendation}
          </p>
        </div>
      )}
    </div>
  )
}

export default Earth2Widget
