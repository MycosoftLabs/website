"use client"

/**
 * Elephant Marker Component for CREP Dashboard
 * 
 * Displays elephant trackers on the MapLibre map with real-time position,
 * heading indicator, health status, and popup with biosignal details.
 * 
 * Feb 05, 2026 - Ghana/Africa Elephant Conservation Demo
 */

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map"
import { Badge } from "@/components/ui/badge"
import { 
  Heart, 
  Thermometer, 
  Activity, 
  Droplets, 
  AlertTriangle, 
  Navigation,
  Clock
} from "lucide-react"

export interface ElephantData {
  id: string
  name: string
  age: number
  sex: "male" | "female"
  zone: string
  lat: number
  lng: number
  heading: number // 0-360 degrees
  speed: number // km/h
  biosignals: {
    heartRate: number // bpm
    temperature: number // °C
    activityLevel: string
    stressIndex: number // 0-100
    hydration: number // %
  }
  status: "healthy" | "warning" | "critical"
  lastUpdate: string
}

interface ElephantMarkerProps {
  elephant: ElephantData
  isSelected: boolean
  onClick: () => void
}

// Status colors
const statusColors = {
  healthy: { bg: "bg-green-500", border: "border-green-400", text: "text-green-400", glow: "#22c55e" },
  warning: { bg: "bg-amber-500", border: "border-amber-400", text: "text-amber-400", glow: "#f59e0b" },
  critical: { bg: "bg-red-500", border: "border-red-400", text: "text-red-400", glow: "#ef4444" },
}

// Activity labels
const activityLabels: Record<string, string> = {
  grazing: "Grazing",
  resting: "Resting",
  walking: "Walking",
  running: "Running",
  foraging: "Foraging",
  drinking: "Drinking",
}

export function ElephantMarker({ elephant, isSelected, onClick }: ElephantMarkerProps) {
  const colors = statusColors[elephant.status]
  
  // Validate coordinates
  const hasValidCoords = useMemo(() => {
    return typeof elephant.lng === 'number' && 
           typeof elephant.lat === 'number' && 
           !isNaN(elephant.lng) && 
           !isNaN(elephant.lat)
  }, [elephant.lat, elephant.lng])
  
  // Skip rendering if no valid coordinates
  if (!hasValidCoords) {
    return null
  }
  
  return (
    <MapMarker
      longitude={elephant.lng}
      latitude={elephant.lat}
      onClick={onClick}
    >
      <MarkerContent className="relative" data-marker="elephant">
        <div className={cn(
          "relative flex items-center justify-center transition-transform",
          isSelected ? "scale-150" : "scale-100"
        )}>
          {/* Direction indicator */}
          <div 
            className="absolute w-8 h-8 flex items-center justify-center"
            style={{ transform: `rotate(${elephant.heading}deg)` }}
          >
            <div 
              className={cn("w-0 h-0 absolute -top-1", colors.border)}
              style={{
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderBottom: `6px solid ${colors.glow}`,
              }}
            />
          </div>
          
          {/* Pulse for warning/critical */}
          {elephant.status !== "healthy" && (
            <div 
              className={cn("absolute w-8 h-8 rounded-full animate-ping", colors.bg)}
              style={{ opacity: 0.3 }}
            />
          )}
          
          {/* Main elephant icon */}
          <div 
            className={cn(
              "relative w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm",
              colors.bg, colors.border,
              isSelected && "ring-2 ring-white"
            )}
            style={{ boxShadow: `0 0 12px ${colors.glow}` }}
          >
            🐘
          </div>
        </div>
      </MarkerContent>
      
      {isSelected && (
        <MarkerPopup
          className="min-w-[300px] bg-[#0a1628]/95 backdrop-blur border-purple-500/30"
          closeButton
          onClose={onClick}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-xl",
                  `${colors.bg}/20`
                )}>
                  🐘
                </div>
                <div>
                  <div className="text-base font-bold text-white">{elephant.name}</div>
                  <div className="text-xs text-gray-400">
                    {elephant.sex === "male" ? "♂" : "♀"} {elephant.age} years • {elephant.zone}
                  </div>
                </div>
              </div>
              <Badge className={cn(colors.bg, "text-white text-xs")}>
                {elephant.status.toUpperCase()}
              </Badge>
            </div>
            
            {/* Biosignals Grid */}
            <div className="bg-slate-800/50 rounded-lg p-2">
              <div className="text-[9px] text-gray-400 uppercase font-mono mb-2 flex items-center gap-1">
                <Activity className="w-3 h-3" /> Biosignal Telemetry
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {/* Heart Rate */}
                <div className="bg-slate-900/50 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Heart className={cn("w-3 h-3", elephant.biosignals.heartRate > 40 ? "text-red-400" : "text-pink-400")} />
                    <span className="text-[8px] text-gray-500">HEART RATE</span>
                  </div>
                  <div className="text-sm font-bold text-pink-400">
                    {elephant.biosignals.heartRate} <span className="text-[9px] font-normal">bpm</span>
                  </div>
                </div>
                
                {/* Temperature */}
                <div className="bg-slate-900/50 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Thermometer className="w-3 h-3 text-orange-400" />
                    <span className="text-[8px] text-gray-500">BODY TEMP</span>
                  </div>
                  <div className="text-sm font-bold text-orange-400">
                    {elephant.biosignals.temperature.toFixed(1)} <span className="text-[9px] font-normal">°C</span>
                  </div>
                </div>
                
                {/* Activity */}
                <div className="bg-slate-900/50 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Activity className="w-3 h-3 text-blue-400" />
                    <span className="text-[8px] text-gray-500">ACTIVITY</span>
                  </div>
                  <div className="text-sm font-bold text-blue-400">
                    {activityLabels[elephant.biosignals.activityLevel] || elephant.biosignals.activityLevel}
                  </div>
                </div>
                
                {/* Hydration */}
                <div className="bg-slate-900/50 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Droplets className="w-3 h-3 text-cyan-400" />
                    <span className="text-[8px] text-gray-500">HYDRATION</span>
                  </div>
                  <div className="text-sm font-bold text-cyan-400">
                    {elephant.biosignals.hydration} <span className="text-[9px] font-normal">%</span>
                  </div>
                </div>
              </div>
              
              {/* Stress Alert */}
              {elephant.biosignals.stressIndex > 30 && (
                <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded p-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <div className="text-xs">
                    <span className="text-amber-400 font-medium">Elevated Stress: </span>
                    <span className="text-amber-300">{elephant.biosignals.stressIndex}/100</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Movement Info */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-slate-700/50">
              <div className="flex items-center gap-1">
                <Navigation 
                  className="w-4 h-4 text-purple-400" 
                  style={{ transform: `rotate(${elephant.heading}deg)` }}
                />
                <span>{elephant.heading}° @ {elephant.speed.toFixed(1)} km/h</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(elephant.lastUpdate).toLocaleTimeString()}</span>
              </div>
            </div>
            
            {/* Coordinates */}
            <div className="text-[9px] text-gray-500 font-mono">
              {elephant.lat.toFixed(4)}°N, {Math.abs(elephant.lng).toFixed(4)}°W • GPS Collar
            </div>
          </div>
        </MarkerPopup>
      )}
    </MapMarker>
  )
}

export default ElephantMarker
