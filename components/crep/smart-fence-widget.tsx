"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Wifi,
  ThermometerSun,
  Droplets,
  Wind,
  MapPin
} from "lucide-react"

export interface FenceSegment {
  id: string
  name: string
  zone: string
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  status: "active" | "breach" | "offline" | "maintenance"
  lastCheck: string
  sensors: FenceSensor[]
}

export interface FenceSensor {
  id: string
  type: string
  name: string
  lat: number
  lng: number
  status: "online" | "offline"
  firmware: string
  readings: {
    presence: boolean
    vibration: number
    breakDetected: boolean
    temperature: number
    humidity: number
    gasResistance: number
  }
}

interface SmartFenceWidgetProps {
  fenceSegments: FenceSegment[]
  onSegmentClick?: (segment: FenceSegment) => void
}

export function SmartFenceWidget({ fenceSegments, onSegmentClick }: SmartFenceWidgetProps) {
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null)
  
  const activeCount = fenceSegments.filter(f => f.status === "active").length
  const breachCount = fenceSegments.filter(f => f.status === "breach").length
  const totalSensors = fenceSegments.reduce((acc, f) => acc + f.sensors.length, 0)
  const onlineSensors = fenceSegments.reduce(
    (acc, f) => acc + f.sensors.filter(s => s.status === "online").length, 
    0
  )
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500"
      case "breach": return "bg-red-500"
      case "offline": return "bg-gray-500"
      case "maintenance": return "bg-amber-500"
      default: return "bg-gray-500"
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="h-4 w-4 text-green-500" />
      case "breach": return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "offline": return <Wifi className="h-4 w-4 text-gray-500" />
      case "maintenance": return <Activity className="h-4 w-4 text-amber-500" />
      default: return null
    }
  }
  
  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            Smart Fence Network
          </span>
          <div className="flex gap-2">
            {breachCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {breachCount} Breach{breachCount > 1 ? "es" : ""}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800/50 rounded p-2">
            <p className="text-2xl font-bold text-green-400">{activeCount}</p>
            <p className="text-xs text-gray-400">Active</p>
          </div>
          <div className="bg-slate-800/50 rounded p-2">
            <p className="text-2xl font-bold text-red-400">{breachCount}</p>
            <p className="text-xs text-gray-400">Breaches</p>
          </div>
          <div className="bg-slate-800/50 rounded p-2">
            <p className="text-2xl font-bold text-blue-400">{onlineSensors}/{totalSensors}</p>
            <p className="text-xs text-gray-400">Sensors</p>
          </div>
        </div>
        
        {/* Fence Segments List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {fenceSegments.map((segment) => (
            <div 
              key={segment.id}
              className={`
                bg-slate-800/30 rounded-lg border border-slate-700/50 
                cursor-pointer hover:border-slate-600 transition-colors
                ${expandedSegment === segment.id ? "border-cyan-500/50" : ""}
              `}
              onClick={() => {
                setExpandedSegment(expandedSegment === segment.id ? null : segment.id)
                onSegmentClick?.(segment)
              }}
            >
              {/* Segment Header */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(segment.status)}
                  <div>
                    <p className="font-medium text-white text-sm">{segment.name}</p>
                    <p className="text-xs text-gray-400">{segment.zone}</p>
                  </div>
                </div>
                <Badge className={`${getStatusColor(segment.status)} text-white text-xs`}>
                  {segment.status.toUpperCase()}
                </Badge>
              </div>
              
              {/* Expanded Details */}
              {expandedSegment === segment.id && (
                <div className="border-t border-slate-700/50 p-3 space-y-3">
                  {/* Sensors */}
                  {segment.sensors.map((sensor) => (
                    <div key={sensor.id} className="bg-slate-900/50 rounded p-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white">{sensor.name}</span>
                        <Badge variant={sensor.status === "online" ? "default" : "secondary"} className="text-xs">
                          {sensor.status}
                        </Badge>
                      </div>
                      
                      {/* Sensor Readings */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <Activity className={`h-3 w-3 ${sensor.readings.presence ? "text-red-400" : "text-gray-500"}`} />
                          <span className={sensor.readings.presence ? "text-red-400" : "text-gray-400"}>
                            {sensor.readings.presence ? "MOTION" : "Clear"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3 text-blue-400" />
                          <span className="text-gray-400">
                            Vibration: {(sensor.readings.vibration * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ThermometerSun className="h-3 w-3 text-orange-400" />
                          <span className="text-gray-400">{sensor.readings.temperature.toFixed(1)}°C</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Droplets className="h-3 w-3 text-cyan-400" />
                          <span className="text-gray-400">{sensor.readings.humidity.toFixed(0)}%</span>
                        </div>
                      </div>
                      
                      {/* Break Alert */}
                      {sensor.readings.breakDetected && (
                        <div className="mt-2 bg-red-500/20 border border-red-500/50 rounded p-1 text-center">
                          <span className="text-xs text-red-400 font-medium">FENCE BREAK DETECTED</span>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Location */}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {segment.startLat.toFixed(4)}°N, {Math.abs(segment.startLng).toFixed(4)}°W
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default SmartFenceWidget
