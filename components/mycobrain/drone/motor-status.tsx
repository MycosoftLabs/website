"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Circle } from "lucide-react"

interface MotorStatusProps {
  motors: MotorData[]
  armed?: boolean
  className?: string
}

export interface MotorData {
  id: number
  rpm: number
  current: number // Amps
  temperature: number // Celsius
  status: "ok" | "warning" | "error" | "offline"
  throttle: number // 0-100%
}

export function MotorStatus({ motors, armed = false, className }: MotorStatusProps) {
  // Calculate positions for quad layout (X configuration)
  const getMotorPosition = (index: number): { x: number; y: number; rotation: number } => {
    // Standard X-quad layout:
    // Motor 1: Front Right (CW)
    // Motor 2: Back Left (CW)
    // Motor 3: Front Left (CCW)
    // Motor 4: Back Right (CCW)
    const positions: Record<number, { x: number; y: number; rotation: number }> = {
      0: { x: 70, y: 30, rotation: -45 },  // Front Right
      1: { x: 30, y: 70, rotation: 135 },  // Back Left
      2: { x: 30, y: 30, rotation: 45 },   // Front Left
      3: { x: 70, y: 70, rotation: -135 }, // Back Right
    }
    return positions[index] || { x: 50, y: 50, rotation: 0 }
  }

  const getStatusColor = (status: MotorData["status"]) => {
    switch (status) {
      case "ok": return "text-green-400 border-green-500/50"
      case "warning": return "text-yellow-400 border-yellow-500/50"
      case "error": return "text-red-400 border-red-500/50"
      case "offline": return "text-gray-500 border-gray-500/50"
    }
  }

  const getThrottleColor = (throttle: number) => {
    if (throttle > 80) return "bg-red-500"
    if (throttle > 50) return "bg-orange-500"
    if (throttle > 20) return "bg-green-500"
    return "bg-gray-600"
  }

  return (
    <div className={cn("p-3 rounded-lg bg-black/60 border border-cyan-500/30", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-cyan-400">MOTOR STATUS</span>
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px]",
            armed ? "border-red-500 text-red-400" : "border-gray-500 text-gray-400"
          )}
        >
          {armed ? "ARMED" : "DISARMED"}
        </Badge>
      </div>

      {/* Drone top-down view */}
      <div className="relative w-full aspect-square max-w-[200px] mx-auto mb-3">
        {/* Drone body */}
        <div className="absolute inset-[25%] bg-gray-800/50 rounded-lg border border-gray-600/50">
          {/* Direction indicator (front) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-cyan-400" />
          </div>
        </div>

        {/* Arms */}
        <svg className="absolute inset-0" viewBox="0 0 100 100">
          <line x1="35" y1="35" x2="15" y2="15" stroke="#444" strokeWidth="2" />
          <line x1="65" y1="35" x2="85" y2="15" stroke="#444" strokeWidth="2" />
          <line x1="35" y1="65" x2="15" y2="85" stroke="#444" strokeWidth="2" />
          <line x1="65" y1="65" x2="85" y2="85" stroke="#444" strokeWidth="2" />
        </svg>

        {/* Motors */}
        {motors.map((motor, index) => {
          const pos = getMotorPosition(index)
          const isCW = index === 0 || index === 1
          
          return (
            <div
              key={motor.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              {/* Motor circle */}
              <div
                className={cn(
                  "w-12 h-12 rounded-full border-2 flex items-center justify-center relative",
                  getStatusColor(motor.status),
                  armed && motor.throttle > 0 && "animate-pulse"
                )}
              >
                {/* Propeller animation */}
                {armed && motor.throttle > 0 && (
                  <div 
                    className="absolute inset-1 rounded-full border-2 border-dashed border-current opacity-50"
                    style={{ 
                      animation: `spin ${Math.max(0.1, 1 - motor.throttle / 100)}s linear infinite`,
                      animationDirection: isCW ? "normal" : "reverse"
                    }}
                  />
                )}
                
                {/* Motor number */}
                <span className="text-xs font-bold">{motor.id}</span>
                
                {/* Status indicator */}
                <div className="absolute -top-1 -right-1">
                  {motor.status === "ok" && <CheckCircle className="w-3 h-3 text-green-400" />}
                  {motor.status === "warning" && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
                  {motor.status === "error" && <AlertTriangle className="w-3 h-3 text-red-400" />}
                  {motor.status === "offline" && <Circle className="w-3 h-3 text-gray-500" />}
                </div>
              </div>

              {/* Throttle bar */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all", getThrottleColor(motor.throttle))}
                  style={{ width: `${motor.throttle}%` }}
                />
              </div>

              {/* Rotation direction indicator */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] text-gray-500">
                {isCW ? "CW" : "CCW"}
              </div>
            </div>
          )
        })}
      </div>

      {/* Motor details */}
      <div className="grid grid-cols-2 gap-2">
        {motors.map((motor, index) => (
          <div 
            key={motor.id}
            className={cn(
              "p-2 rounded bg-gray-900/50 border text-[9px]",
              getStatusColor(motor.status)
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold">M{motor.id}</span>
              <span className="uppercase">{motor.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-gray-400">
              <span>RPM:</span>
              <span className="text-right text-cyan-400 font-mono">{motor.rpm.toLocaleString()}</span>
              <span>Amps:</span>
              <span className="text-right text-cyan-400 font-mono">{motor.current.toFixed(1)}A</span>
              <span>Temp:</span>
              <span className={cn(
                "text-right font-mono",
                motor.temperature > 80 ? "text-red-400" : 
                motor.temperature > 60 ? "text-yellow-400" : "text-cyan-400"
              )}>
                {motor.temperature}°C
              </span>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
