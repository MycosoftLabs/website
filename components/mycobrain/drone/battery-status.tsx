"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Battery, BatteryCharging, BatteryWarning, Zap, Thermometer, Clock } from "lucide-react"

interface BatteryStatusProps {
  voltage: number        // Volts
  current: number        // Amps (negative = discharging)
  percentage: number     // 0-100
  temperature: number    // Celsius
  cellCount: number      // Number of cells (e.g., 4S = 4)
  cellVoltages?: number[] // Individual cell voltages
  capacity: number       // mAh total
  consumed: number       // mAh consumed
  timeRemaining?: number // seconds
  charging?: boolean
  className?: string
}

export function BatteryStatus({
  voltage,
  current,
  percentage,
  temperature,
  cellCount,
  cellVoltages,
  capacity,
  consumed,
  timeRemaining,
  charging = false,
  className
}: BatteryStatusProps) {
  
  const getPercentageColor = (pct: number) => {
    if (pct > 50) return "text-green-400"
    if (pct > 25) return "text-yellow-400"
    if (pct > 10) return "text-orange-400"
    return "text-red-400"
  }

  const getVoltageStatus = (v: number, cells: number) => {
    const perCell = v / cells
    if (perCell > 3.8) return { status: "Good", color: "text-green-400" }
    if (perCell > 3.6) return { status: "OK", color: "text-yellow-400" }
    if (perCell > 3.4) return { status: "Low", color: "text-orange-400" }
    return { status: "Critical", color: "text-red-400" }
  }

  const voltageStatus = getVoltageStatus(voltage, cellCount)
  const perCellVoltage = voltage / cellCount

  const formatTime = (seconds?: number) => {
    if (!seconds || seconds < 0) return "--:--"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const BatteryIcon = charging ? BatteryCharging : percentage < 20 ? BatteryWarning : Battery

  return (
    <div className={cn("p-3 rounded-lg bg-black/60 border border-cyan-500/30", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BatteryIcon className={cn("w-4 h-4", getPercentageColor(percentage))} />
          <span className="text-xs font-bold text-cyan-400">BATTERY</span>
        </div>
        <Badge 
          variant="outline" 
          className={cn("text-[10px]", voltageStatus.color, "border-current")}
        >
          {voltageStatus.status}
        </Badge>
      </div>

      {/* Main battery visualization */}
      <div className="flex items-center gap-3 mb-3">
        {/* Battery icon with level */}
        <div className="relative w-16 h-8">
          <div className="absolute inset-0 border-2 border-gray-600 rounded-sm">
            <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-1 h-3 bg-gray-600 rounded-r-sm" />
          </div>
          <div 
            className={cn(
              "absolute left-0.5 top-0.5 bottom-0.5 rounded-sm transition-all",
              percentage > 50 ? "bg-green-500" :
              percentage > 25 ? "bg-yellow-500" :
              percentage > 10 ? "bg-orange-500" : "bg-red-500"
            )}
            style={{ width: `${percentage - 2}%` }}
          />
          {charging && (
            <Zap className="absolute inset-0 m-auto w-4 h-4 text-yellow-300 animate-pulse" />
          )}
        </div>

        {/* Percentage and voltage */}
        <div className="flex-1">
          <div className={cn("text-2xl font-bold font-mono", getPercentageColor(percentage))}>
            {percentage.toFixed(0)}%
          </div>
          <div className="text-[10px] text-gray-500">
            {voltage.toFixed(2)}V ({cellCount}S)
          </div>
        </div>

        {/* Time remaining */}
        <div className="text-right">
          <div className="flex items-center gap-1 text-gray-400">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-mono">{formatTime(timeRemaining)}</span>
          </div>
          <div className="text-[10px] text-gray-500">remaining</div>
        </div>
      </div>

      {/* Cell voltages */}
      {cellVoltages && cellVoltages.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 mb-1">CELL VOLTAGES</div>
          <div className="flex gap-1">
            {cellVoltages.map((cv, i) => {
              const cellStatus = cv > 3.8 ? "bg-green-500" :
                               cv > 3.6 ? "bg-yellow-500" :
                               cv > 3.4 ? "bg-orange-500" : "bg-red-500"
              return (
                <div key={i} className="flex-1">
                  <div className={cn("h-6 rounded-sm relative overflow-hidden bg-gray-800", cellStatus)}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[8px] font-mono text-white font-bold">
                        {cv.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="text-[8px] text-gray-500 text-center">C{i + 1}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 text-[9px]">
        <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
          <div className="flex items-center gap-1 text-gray-500 mb-0.5">
            <Zap className="w-2.5 h-2.5" />
            <span>Current</span>
          </div>
          <div className="font-mono text-cyan-400">{Math.abs(current).toFixed(1)}A</div>
          <div className="text-[8px] text-gray-600">{current < 0 ? "Draw" : "Charge"}</div>
        </div>

        <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
          <div className="flex items-center gap-1 text-gray-500 mb-0.5">
            <Thermometer className="w-2.5 h-2.5" />
            <span>Temp</span>
          </div>
          <div className={cn(
            "font-mono",
            temperature > 45 ? "text-red-400" :
            temperature > 35 ? "text-yellow-400" : "text-cyan-400"
          )}>
            {temperature}°C
          </div>
        </div>

        <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
          <span className="text-gray-500">Per Cell</span>
          <div className={cn("font-mono", voltageStatus.color)}>
            {perCellVoltage.toFixed(2)}V
          </div>
        </div>

        <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
          <span className="text-gray-500">Used</span>
          <div className="font-mono text-cyan-400">
            {consumed}/{capacity}
          </div>
          <div className="text-[8px] text-gray-600">mAh</div>
        </div>
      </div>

      {/* Low battery warning */}
      {percentage < 20 && (
        <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded flex items-center gap-2">
          <BatteryWarning className="w-4 h-4 text-red-400" />
          <span className="text-[10px] text-red-400">
            LOW BATTERY - LAND IMMEDIATELY
          </span>
        </div>
      )}
    </div>
  )
}
