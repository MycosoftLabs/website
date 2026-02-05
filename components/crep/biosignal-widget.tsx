"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Heart, 
  Thermometer, 
  Activity,
  Droplets,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react"
import type { ElephantData } from "./markers/elephant-marker"

interface BiosignalWidgetProps {
  elephants: ElephantData[]
  onElephantClick?: (elephant: ElephantData) => void
}

// Normal ranges for elephant biosignals
const NORMAL_RANGES = {
  heartRate: { min: 25, max: 35, unit: "bpm" },
  temperature: { min: 35.5, max: 37.0, unit: "°C" },
  stressIndex: { min: 0, max: 30, unit: "" },
  hydration: { min: 70, max: 100, unit: "%" },
}

function getValueStatus(value: number, range: { min: number; max: number }): "normal" | "warning" | "critical" {
  if (value >= range.min && value <= range.max) return "normal"
  const deviation = Math.max(
    Math.abs(value - range.min) / range.min,
    Math.abs(value - range.max) / range.max
  )
  return deviation > 0.3 ? "critical" : "warning"
}

function getTrendIcon(current: number, range: { min: number; max: number }) {
  const mid = (range.min + range.max) / 2
  if (current > range.max) return <TrendingUp className="h-3 w-3 text-red-400" />
  if (current < range.min) return <TrendingDown className="h-3 w-3 text-blue-400" />
  return <Minus className="h-3 w-3 text-gray-400" />
}

export function BiosignalWidget({ elephants, onElephantClick }: BiosignalWidgetProps) {
  const [selectedElephant, setSelectedElephant] = useState<string | null>(
    elephants.length > 0 ? elephants[0].id : null
  )
  
  const healthyCount = elephants.filter(e => e.status === "healthy").length
  const warningCount = elephants.filter(e => e.status === "warning").length
  const criticalCount = elephants.filter(e => e.status === "critical").length
  
  const selected = elephants.find(e => e.id === selectedElephant)
  
  const statusColors = {
    healthy: "bg-green-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
  }
  
  const statusTextColors = {
    healthy: "text-green-400",
    warning: "text-amber-400",
    critical: "text-red-400",
  }
  
  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-400" />
            Elephant Biosignals
          </span>
          <div className="flex gap-1">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-amber-500 text-xs">
                {warningCount} Warning
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Health Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
            <CheckCircle className="h-4 w-4 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-400">{healthyCount}</p>
            <p className="text-xs text-gray-400">Healthy</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-amber-400">{warningCount}</p>
            <p className="text-xs text-gray-400">Warning</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
            <AlertTriangle className="h-4 w-4 text-red-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-400">{criticalCount}</p>
            <p className="text-xs text-gray-400">Critical</p>
          </div>
        </div>
        
        {/* Elephant Selector */}
        <div className="flex gap-2 flex-wrap">
          {elephants.map((elephant) => (
            <button
              key={elephant.id}
              onClick={() => {
                setSelectedElephant(elephant.id)
                onElephantClick?.(elephant)
              }}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all
                flex items-center gap-1
                ${selectedElephant === elephant.id 
                  ? "bg-slate-600 text-white ring-2 ring-cyan-500" 
                  : "bg-slate-800/50 text-gray-300 hover:bg-slate-700"
                }
              `}
            >
              <span>🐘</span>
              <span>{elephant.name}</span>
              <span className={`w-2 h-2 rounded-full ${statusColors[elephant.status]}`} />
            </button>
          ))}
        </div>
        
        {/* Selected Elephant Details */}
        {selected && (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🐘</span>
                <div>
                  <p className="font-bold text-white">{selected.name}</p>
                  <p className="text-xs text-gray-400">
                    {selected.sex === "male" ? "♂" : "♀"} {selected.age}y • {selected.biosignals.activityLevel}
                  </p>
                </div>
              </div>
              <Badge className={`${statusColors[selected.status]} text-white`}>
                {selected.status.toUpperCase()}
              </Badge>
            </div>
            
            {/* Biosignal Meters */}
            <div className="space-y-3">
              {/* Heart Rate */}
              <div className="bg-slate-800/30 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-400" />
                    <span className="text-sm text-gray-300">Heart Rate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-bold ${
                      statusTextColors[getValueStatus(selected.biosignals.heartRate, NORMAL_RANGES.heartRate)]
                    }`}>
                      {selected.biosignals.heartRate} {NORMAL_RANGES.heartRate.unit}
                    </span>
                    {getTrendIcon(selected.biosignals.heartRate, NORMAL_RANGES.heartRate)}
                  </div>
                </div>
                <Progress 
                  value={(selected.biosignals.heartRate / 60) * 100} 
                  className="h-1.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Normal: {NORMAL_RANGES.heartRate.min}-{NORMAL_RANGES.heartRate.max} {NORMAL_RANGES.heartRate.unit}
                </p>
              </div>
              
              {/* Body Temperature */}
              <div className="bg-slate-800/30 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-orange-400" />
                    <span className="text-sm text-gray-300">Body Temperature</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-bold ${
                      statusTextColors[getValueStatus(selected.biosignals.temperature, NORMAL_RANGES.temperature)]
                    }`}>
                      {selected.biosignals.temperature.toFixed(1)} {NORMAL_RANGES.temperature.unit}
                    </span>
                    {getTrendIcon(selected.biosignals.temperature, NORMAL_RANGES.temperature)}
                  </div>
                </div>
                <Progress 
                  value={((selected.biosignals.temperature - 34) / 5) * 100} 
                  className="h-1.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Normal: {NORMAL_RANGES.temperature.min}-{NORMAL_RANGES.temperature.max} {NORMAL_RANGES.temperature.unit}
                </p>
              </div>
              
              {/* Stress Index */}
              <div className="bg-slate-800/30 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-gray-300">Stress Index</span>
                  </div>
                  <span className={`text-sm font-bold ${
                    statusTextColors[getValueStatus(selected.biosignals.stressIndex, NORMAL_RANGES.stressIndex)]
                  }`}>
                    {selected.biosignals.stressIndex}/100
                  </span>
                </div>
                <Progress 
                  value={selected.biosignals.stressIndex} 
                  className="h-1.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Normal: {NORMAL_RANGES.stressIndex.min}-{NORMAL_RANGES.stressIndex.max}
                </p>
              </div>
              
              {/* Hydration */}
              <div className="bg-slate-800/30 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-gray-300">Hydration Level</span>
                  </div>
                  <span className={`text-sm font-bold ${
                    selected.biosignals.hydration >= 70 ? "text-green-400" : "text-amber-400"
                  }`}>
                    {selected.biosignals.hydration}%
                  </span>
                </div>
                <Progress 
                  value={selected.biosignals.hydration} 
                  className="h-1.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Normal: {NORMAL_RANGES.hydration.min}%+
                </p>
              </div>
            </div>
          </div>
        )}
        
        {elephants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No elephant trackers connected</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BiosignalWidget
