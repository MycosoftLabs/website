"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Flower2, 
  Network, 
  Sparkles, 
  Leaf, 
  AlertTriangle, 
  Flame, 
  FlaskConical, 
  Wind,
  Clock,
  Activity,
  HelpCircle
} from "lucide-react"

// Smell signature from API
interface SmellSignature {
  id: string
  name: string
  category: string
  subcategory: string
  description: string
  bsec_class_id: number
  voc_pattern: Record<string, number>
  icon_type: string
  color_hex: string
  species_id?: string
  species_name?: string
  confidence_threshold: number
}

// Detected smell with history
interface DetectedSmell {
  smell: SmellSignature
  probability: number
  timestamp: Date
  gas_estimates: number[]
}

interface SmellDetectionWidgetProps {
  port: string
  gasClass?: number
  gasProbability?: number
  gasEstimates?: number[]
  co2eq?: number
  bvoc?: number
  sensorMode?: string
}

// Map icon type to Lucide icon
function getSmellIcon(iconType: string) {
  const icons: Record<string, React.ReactNode> = {
    mushroom: <Flower2 className="h-8 w-8" />,
    fungus: <Flower2 className="h-8 w-8" />,
    mycelium: <Network className="h-8 w-8" />,
    spore: <Sparkles className="h-8 w-8" />,
    decay: <Leaf className="h-8 w-8" />,
    warning: <AlertTriangle className="h-8 w-8" />,
    plant: <Leaf className="h-8 w-8" />,
    fire: <Flame className="h-8 w-8" />,
    chemical: <FlaskConical className="h-8 w-8" />,
    clean: <Wind className="h-8 w-8" />
  }
  return icons[iconType] || <HelpCircle className="h-8 w-8" />
}

// Format VOC pattern for display
function formatVOCName(key: string): string {
  const names: Record<string, string> = {
    octanol: "1-Octen-3-ol",
    ethanol: "Ethanol",
    acetaldehyde: "Acetaldehyde",
    methanol: "Methanol",
    hydrogen_sulfide: "H₂S",
    ammonia: "NH₃",
    co2: "CO₂",
    other: "Other VOCs"
  }
  return names[key] || key
}

export function SmellDetectionWidget({
  port,
  gasClass = -1,
  gasProbability = 0,
  gasEstimates = [],
  co2eq = 0,
  bvoc = 0,
  sensorMode = "adafruit"
}: SmellDetectionWidgetProps) {
  const [currentSmell, setCurrentSmell] = useState<SmellSignature | null>(null)
  const [smellHistory, setSmellHistory] = useState<DetectedSmell[]>([])
  const [loading, setLoading] = useState(false)
  const lastClassRef = useRef<number>(-1)
  
  // Fetch smell from API when gas class changes
  const fetchSmell = useCallback(async () => {
    if (gasClass < 0 || sensorMode !== "bsec2") {
      setCurrentSmell(null)
      return
    }
    
    try {
      setLoading(true)
      const res = await fetch(`/api/mindex/smells`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gas_class: gasClass,
          gas_probability: gasProbability,
          gas_estimates: gasEstimates
        })
      })
      
      const data = await res.json()
      
      if (data.ok && data.matched && data.smell) {
        const smell = data.smell as SmellSignature
        setCurrentSmell(smell)
        
        // Add to history if different from last detection
        if (lastClassRef.current !== gasClass || gasProbability > 0.5) {
          setSmellHistory(prev => {
            const newHistory = [
              {
                smell,
                probability: gasProbability,
                timestamp: new Date(),
                gas_estimates: gasEstimates
              },
              ...prev.slice(0, 4) // Keep last 5
            ]
            return newHistory
          })
          lastClassRef.current = gasClass
        }
      }
    } catch (error) {
      console.error("Failed to fetch smell:", error)
    } finally {
      setLoading(false)
    }
  }, [gasClass, gasProbability, gasEstimates, sensorMode])
  
  useEffect(() => {
    fetchSmell()
  }, [fetchSmell])
  
  // Not in BSEC2 mode
  if (sensorMode !== "bsec2") {
    return (
      <Card className="col-span-2 row-span-2 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="h-5 w-5 text-gray-400" />
            Smell Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[200px] text-center">
          <Wind className="h-16 w-16 text-gray-600 mb-4" />
          <p className="text-gray-400 text-sm">
            Smell detection requires BSEC2 mode
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Current mode: {sensorMode || "unknown"}
          </p>
          <Badge variant="outline" className="mt-4 text-yellow-500 border-yellow-500">
            Upgrade firmware for smell detection
          </Badge>
        </CardContent>
      </Card>
    )
  }
  
  // No smell detected yet
  if (!currentSmell && gasClass < 0) {
    return (
      <Card className="col-span-2 row-span-2 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-blue-400" />
            Smell Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[200px]">
          <div className="animate-pulse">
            <Wind className="h-16 w-16 text-blue-400/50" />
          </div>
          <p className="text-gray-400 text-sm mt-4">Analyzing air composition...</p>
          <p className="text-gray-500 text-xs mt-1">BSEC2 gas classification active</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="col-span-2 row-span-2 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 border-slate-700 overflow-hidden">
      <CardHeader className="pb-2 border-b border-slate-700/50">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            Smell Detection
          </span>
          <Badge 
            variant="outline" 
            className="text-xs"
            style={{ 
              borderColor: currentSmell?.color_hex || "#6366f1",
              color: currentSmell?.color_hex || "#6366f1"
            }}
          >
            BSEC2 Active
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Main Detection Display */}
        {currentSmell && (
          <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            {/* Icon */}
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${currentSmell.color_hex}20` }}
            >
              <div style={{ color: currentSmell.color_hex }}>
                {getSmellIcon(currentSmell.icon_type)}
              </div>
            </div>
            
            {/* Details */}
            <div className="flex-1">
              <h3 className="font-semibold text-white text-lg">
                {currentSmell.name}
              </h3>
              {currentSmell.species_name && (
                <p className="text-sm italic text-gray-400">
                  {currentSmell.species_name}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {currentSmell.category}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Class {currentSmell.bsec_class_id}
                </Badge>
              </div>
              
              {/* Probability meter */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Confidence</span>
                  <span>{(gasProbability * 100).toFixed(0)}%</span>
                </div>
                <Progress 
                  value={gasProbability * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Gas Composition */}
        {currentSmell?.voc_pattern && Object.keys(currentSmell.voc_pattern).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-400">VOC Composition</h4>
            <div className="grid gap-2">
              {Object.entries(currentSmell.voc_pattern)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 4)
                .map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-24 truncate">
                      {formatVOCName(key)}
                    </span>
                    <div className="flex-1">
                      <Progress value={value * 100} className="h-1.5" />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">
                      {(value * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-2">
          {co2eq > 0 && (
            <div className="p-2 rounded bg-slate-800/30 border border-slate-700/30">
              <span className="text-xs text-gray-500">eCO₂</span>
              <p className="text-sm font-medium text-white">
                {co2eq.toFixed(0)} <span className="text-xs text-gray-400">ppm</span>
              </p>
            </div>
          )}
          {bvoc > 0 && (
            <div className="p-2 rounded bg-slate-800/30 border border-slate-700/30">
              <span className="text-xs text-gray-500">bVOC</span>
              <p className="text-sm font-medium text-white">
                {bvoc.toFixed(2)} <span className="text-xs text-gray-400">ppm</span>
              </p>
            </div>
          )}
        </div>
        
        {/* Detection History */}
        {smellHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Recent Detections
            </h4>
            <div className="space-y-1">
              {smellHistory.slice(0, 3).map((detection, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between text-xs p-2 rounded bg-slate-800/20"
                >
                  <span className="text-gray-300 truncate flex-1">
                    {detection.smell.name}
                  </span>
                  <span className="text-gray-500 ml-2">
                    {formatTimeAgo(detection.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Format time ago
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default SmellDetectionWidget
