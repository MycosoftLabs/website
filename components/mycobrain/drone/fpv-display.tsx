"use client"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Video, 
  VideoOff, 
  Maximize2, 
  Settings, 
  Circle,
  Camera,
  Crosshair,
  Grid3X3
} from "lucide-react"

interface FPVDisplayProps {
  streamUrl?: string
  connected?: boolean
  armed?: boolean
  recording?: boolean
  // Telemetry overlay
  altitude?: number
  speed?: number
  heading?: number
  batteryPercent?: number
  gpsStatus?: string
  flightMode?: string
  // Camera settings
  showCrosshair?: boolean
  showGrid?: boolean
  showTelemetry?: boolean
  onToggleRecording?: () => void
  onSnapshot?: () => void
  onFullscreen?: () => void
  className?: string
}

export function FPVDisplay({
  streamUrl,
  connected = false,
  armed = false,
  recording = false,
  altitude = 0,
  speed = 0,
  heading = 0,
  batteryPercent = 100,
  gpsStatus = "3D",
  flightMode = "STAB",
  showCrosshair = true,
  showGrid = false,
  showTelemetry = true,
  onToggleRecording,
  onSnapshot,
  onFullscreen,
  className
}: FPVDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovering, setIsHovering] = useState(false)

  // Simulated horizon line based on attitude
  const [pitch] = useState(0) // Would come from telemetry
  const [roll] = useState(0)

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative rounded-lg bg-black border border-cyan-500/30 overflow-hidden",
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Video display area */}
      <div className="relative aspect-video bg-gray-900">
        {connected && streamUrl ? (
          // Real video stream would go here
          <video 
            src={streamUrl}
            autoPlay 
            muted 
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          // Placeholder when not connected
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <VideoOff className="w-16 h-16 text-gray-600 mb-4" />
            <span className="text-gray-500 text-sm">
              {connected ? "No video stream" : "Camera not connected"}
            </span>
          </div>
        )}

        {/* Horizon line overlay */}
        <svg 
          className="absolute inset-0 pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            transform: `rotate(${roll}deg)`
          }}
        >
          {/* Artificial horizon line */}
          <line 
            x1="0" 
            y1={50 + pitch / 2} 
            x2="100" 
            y2={50 + pitch / 2} 
            stroke="rgba(0, 255, 0, 0.3)" 
            strokeWidth="0.5"
          />
        </svg>

        {/* Crosshair overlay */}
        {showCrosshair && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Crosshair className="w-12 h-12 text-green-400/50" />
          </div>
        )}

        {/* Grid overlay */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/10" />
              ))}
            </div>
          </div>
        )}

        {/* Telemetry HUD overlay */}
        {showTelemetry && (
          <>
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] border-current",
                      armed ? "text-red-400" : "text-gray-400"
                    )}
                  >
                    {armed ? "ARMED" : "SAFE"}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-[10px] text-cyan-400 border-cyan-500/50"
                  >
                    {flightMode}
                  </Badge>
                </div>
                {recording && (
                  <div className="flex items-center gap-1">
                    <Circle className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" />
                    <span className="text-[10px] text-red-400">REC</span>
                  </div>
                )}
              </div>
            </div>

            {/* Left telemetry column */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              {/* Altitude tape */}
              <div className="bg-black/60 rounded px-2 py-1 text-right">
                <div className="text-[8px] text-gray-500">ALT</div>
                <div className="text-sm font-mono text-green-400">
                  {altitude.toFixed(1)}
                </div>
                <div className="text-[8px] text-gray-500">m</div>
              </div>
            </div>

            {/* Right telemetry column */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              {/* Speed tape */}
              <div className="bg-black/60 rounded px-2 py-1 text-left">
                <div className="text-[8px] text-gray-500">SPD</div>
                <div className="text-sm font-mono text-green-400">
                  {speed.toFixed(1)}
                </div>
                <div className="text-[8px] text-gray-500">m/s</div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
              <div className="flex items-center justify-between text-[10px]">
                {/* GPS */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">GPS:</span>
                  <span className="text-green-400">{gpsStatus}</span>
                </div>
                
                {/* Heading */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">HDG:</span>
                  <span className="text-cyan-400 font-mono">{heading.toFixed(0)}°</span>
                </div>

                {/* Battery */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">BAT:</span>
                  <span className={cn(
                    "font-mono",
                    batteryPercent > 50 ? "text-green-400" :
                    batteryPercent > 20 ? "text-yellow-400" : "text-red-400"
                  )}>
                    {batteryPercent}%
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Control buttons (visible on hover) */}
        <div 
          className={cn(
            "absolute top-2 right-2 flex gap-1 transition-opacity",
            isHovering ? "opacity-100" : "opacity-0"
          )}
        >
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 w-7 p-0 bg-black/50"
            onClick={onSnapshot}
          >
            <Camera className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant={recording ? "destructive" : "ghost"}
            className={cn("h-7 w-7 p-0", !recording && "bg-black/50")}
            onClick={onToggleRecording}
          >
            <Circle className={cn("w-4 h-4", recording && "fill-current")} />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 w-7 p-0 bg-black/50"
            onClick={onFullscreen}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="p-2 bg-gray-900/50 border-t border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            connected ? "bg-green-500" : "bg-red-500"
          )} />
          <span className="text-[10px] text-gray-400">
            {connected ? "Stream Active" : "Disconnected"}
          </span>
        </div>
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-6 px-2"
            onClick={() => {}}
          >
            <Grid3X3 className={cn("w-3 h-3", showGrid && "text-cyan-400")} />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-6 px-2"
            onClick={() => {}}
          >
            <Crosshair className={cn("w-3 h-3", showCrosshair && "text-cyan-400")} />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-6 px-2"
          >
            <Settings className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
