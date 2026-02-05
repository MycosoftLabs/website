"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Eye, 
  EyeOff,
  Activity,
  Clock,
  MapPin,
  Wifi,
  AlertCircle,
  Footprints
} from "lucide-react"

export interface PresenceReading {
  monitorId: string
  monitorName: string
  zone: string
  lat: number
  lng: number
  presenceDetected: boolean
  lastMovement: string
  motionIntensity?: number // 0-100
  smellDetected?: string
  animalType?: string
}

interface PresenceDetectionWidgetProps {
  readings: PresenceReading[]
  onMonitorClick?: (reading: PresenceReading) => void
}

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function PresenceDetectionWidget({ readings, onMonitorClick }: PresenceDetectionWidgetProps) {
  const [now, setNow] = useState(Date.now())
  
  // Update time display every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])
  
  const activePresence = readings.filter(r => r.presenceDetected)
  const recentActivity = readings.filter(r => {
    const lastMove = new Date(r.lastMovement).getTime()
    return (now - lastMove) < 30 * 60 * 1000 // Within 30 minutes
  })
  
  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Footprints className="h-5 w-5 text-purple-400" />
            Presence Detection
          </span>
          {activePresence.length > 0 && (
            <Badge className="bg-purple-500 animate-pulse">
              {activePresence.length} Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/50 rounded p-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <Eye className="h-4 w-4 text-purple-400" />
              <p className="text-xl font-bold text-purple-400">{activePresence.length}</p>
            </div>
            <p className="text-xs text-gray-400">Motion Now</p>
          </div>
          <div className="bg-slate-800/50 rounded p-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              <p className="text-xl font-bold text-blue-400">{recentActivity.length}</p>
            </div>
            <p className="text-xs text-gray-400">Recent (30m)</p>
          </div>
        </div>
        
        {/* Monitor List */}
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {readings.map((reading) => (
            <div
              key={reading.monitorId}
              className={`
                bg-slate-800/30 rounded-lg p-3 border cursor-pointer
                transition-all hover:border-purple-500/50
                ${reading.presenceDetected 
                  ? "border-purple-500/30 bg-purple-500/5" 
                  : "border-slate-700/50"
                }
              `}
              onClick={() => onMonitorClick?.(reading)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {reading.presenceDetected ? (
                    <Eye className="h-4 w-4 text-purple-400 animate-pulse" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  )}
                  <div>
                    <p className="font-medium text-white text-sm">{reading.monitorName}</p>
                    <p className="text-xs text-gray-400">{reading.zone}</p>
                  </div>
                </div>
                <Badge 
                  variant={reading.presenceDetected ? "default" : "secondary"}
                  className={reading.presenceDetected ? "bg-purple-500" : ""}
                >
                  {reading.presenceDetected ? "MOTION" : "Clear"}
                </Badge>
              </div>
              
              {/* Motion Intensity Bar */}
              {reading.motionIntensity !== undefined && reading.presenceDetected && (
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Motion Intensity</span>
                    <span>{reading.motionIntensity}%</span>
                  </div>
                  <Progress 
                    value={reading.motionIntensity} 
                    className="h-1.5"
                  />
                </div>
              )}
              
              {/* Smell Detection */}
              {reading.smellDetected && (
                <div className="flex items-center gap-1 text-xs text-amber-400 mb-2">
                  <AlertCircle className="h-3 w-3" />
                  <span>Smell: {reading.smellDetected.replace(/_/g, " ")}</span>
                </div>
              )}
              
              {/* Animal Type */}
              {reading.animalType && (
                <div className="flex items-center gap-1 text-xs text-cyan-400 mb-2">
                  <span>🐘</span>
                  <span>Identified: {reading.animalType}</span>
                </div>
              )}
              
              {/* Last Movement */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Last: {formatTimeAgo(reading.lastMovement)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{reading.lat.toFixed(2)}°, {reading.lng.toFixed(2)}°</span>
                </div>
              </div>
            </div>
          ))}
          
          {readings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No monitors connected</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default PresenceDetectionWidget
