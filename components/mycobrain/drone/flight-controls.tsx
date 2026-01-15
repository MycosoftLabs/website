"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  Pause,
  Home,
  Navigation,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  RotateCw,
  AlertTriangle,
  Gamepad2,
  MousePointer2,
  Keyboard,
} from "lucide-react"

interface FlightControlsProps {
  onCommand?: (command: FlightCommand) => void
  armed?: boolean
  flightMode?: string
  className?: string
}

export interface FlightCommand {
  type: "arm" | "disarm" | "takeoff" | "land" | "rth" | "move" | "rotate" | "altitude" | "mode"
  value?: number | string
  throttle?: number
  yaw?: number
  pitch?: number
  roll?: number
}

type ControlMode = "keyboard" | "joystick" | "mouse"

export function FlightControls({ 
  onCommand, 
  armed = false, 
  flightMode = "STABILIZE",
  className 
}: FlightControlsProps) {
  const [throttle, setThrottle] = useState(0)
  const [yaw, setYaw] = useState(0)
  const [pitch, setPitch] = useState(0)
  const [roll, setRoll] = useState(0)
  const [controlMode, setControlMode] = useState<ControlMode>("keyboard")
  const [keyState, setKeyState] = useState<Record<string, boolean>>({})
  
  const containerRef = useRef<HTMLDivElement>(null)

  // Keyboard controls
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (controlMode !== "keyboard") return
      setKeyState(prev => ({ ...prev, [e.key.toLowerCase()]: true }))
    }
    
    function handleKeyUp(e: KeyboardEvent) {
      if (controlMode !== "keyboard") return
      setKeyState(prev => ({ ...prev, [e.key.toLowerCase()]: false }))
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [controlMode])

  // Update controls based on key state
  useEffect(() => {
    if (controlMode !== "keyboard") return

    let newThrottle = throttle
    let newYaw = 0
    let newPitch = 0
    let newRoll = 0

    if (keyState["w"]) newThrottle = Math.min(100, throttle + 2)
    if (keyState["s"]) newThrottle = Math.max(0, throttle - 2)
    if (keyState["a"]) newYaw = -50
    if (keyState["d"]) newYaw = 50
    if (keyState["arrowup"]) newPitch = 50
    if (keyState["arrowdown"]) newPitch = -50
    if (keyState["arrowleft"]) newRoll = -50
    if (keyState["arrowright"]) newRoll = 50

    setThrottle(newThrottle)
    setYaw(newYaw)
    setPitch(newPitch)
    setRoll(newRoll)

    if (armed && onCommand) {
      onCommand({
        type: "move",
        throttle: newThrottle,
        yaw: newYaw,
        pitch: newPitch,
        roll: newRoll,
      })
    }
  }, [keyState, controlMode, armed, onCommand, throttle])

  // Reset controls when no keys pressed
  useEffect(() => {
    if (controlMode !== "keyboard") return
    
    const hasActiveKeys = Object.values(keyState).some(v => v)
    if (!hasActiveKeys) {
      setYaw(0)
      setPitch(0)
      setRoll(0)
    }
  }, [keyState, controlMode])

  const handleArm = useCallback(() => {
    onCommand?.({ type: armed ? "disarm" : "arm" })
  }, [armed, onCommand])

  const handleTakeoff = useCallback(() => {
    onCommand?.({ type: "takeoff", value: 10 }) // 10m default
  }, [onCommand])

  const handleLand = useCallback(() => {
    onCommand?.({ type: "land" })
  }, [onCommand])

  const handleRTH = useCallback(() => {
    onCommand?.({ type: "rth" })
  }, [onCommand])

  return (
    <div ref={containerRef} className={cn("p-4 rounded-lg bg-black/60 border border-cyan-500/30", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-cyan-400">FLIGHT CONTROLS</span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px]",
              armed ? "border-red-500 text-red-400" : "border-gray-500 text-gray-400"
            )}
          >
            {armed ? "ARMED" : "DISARMED"}
          </Badge>
          <Badge variant="outline" className="text-[10px] border-cyan-500/50 text-cyan-400">
            {flightMode}
          </Badge>
        </div>
        
        {/* Control mode selector */}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={controlMode === "keyboard" ? "default" : "ghost"}
            className="h-6 px-2"
            onClick={() => setControlMode("keyboard")}
          >
            <Keyboard className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant={controlMode === "joystick" ? "default" : "ghost"}
            className="h-6 px-2"
            onClick={() => setControlMode("joystick")}
          >
            <Gamepad2 className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant={controlMode === "mouse" ? "default" : "ghost"}
            className="h-6 px-2"
            onClick={() => setControlMode("mouse")}
          >
            <MousePointer2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Main control buttons */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <Button
          size="sm"
          variant={armed ? "destructive" : "default"}
          className="h-10"
          onClick={handleArm}
        >
          {armed ? "DISARM" : "ARM"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-10 border-green-500/50 text-green-400 hover:bg-green-500/20"
          onClick={handleTakeoff}
          disabled={!armed}
        >
          <ArrowUp className="w-4 h-4 mr-1" />
          TAKEOFF
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-10 border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
          onClick={handleLand}
          disabled={!armed}
        >
          <ArrowDown className="w-4 h-4 mr-1" />
          LAND
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-10 border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
          onClick={handleRTH}
          disabled={!armed}
        >
          <Home className="w-4 h-4 mr-1" />
          RTH
        </Button>
      </div>

      {/* Virtual joysticks */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Left stick - Throttle/Yaw */}
        <div className="relative">
          <div className="text-[10px] text-gray-500 mb-1 text-center">THROTTLE / YAW</div>
          <div className="w-32 h-32 mx-auto bg-gray-900/50 rounded-full border border-gray-700/50 relative">
            {/* Center crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-px h-full bg-gray-700/50" />
              <div className="absolute w-full h-px bg-gray-700/50" />
            </div>
            {/* Stick position indicator */}
            <div 
              className="absolute w-8 h-8 bg-cyan-500/50 rounded-full border-2 border-cyan-400 transform -translate-x-1/2 -translate-y-1/2 transition-all"
              style={{
                left: `${50 + yaw / 2}%`,
                top: `${50 - throttle / 2}%`
              }}
            />
          </div>
          <div className="text-[9px] text-gray-500 text-center mt-1">
            W/S: Throttle | A/D: Yaw
          </div>
        </div>

        {/* Right stick - Pitch/Roll */}
        <div className="relative">
          <div className="text-[10px] text-gray-500 mb-1 text-center">PITCH / ROLL</div>
          <div className="w-32 h-32 mx-auto bg-gray-900/50 rounded-full border border-gray-700/50 relative">
            {/* Center crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-px h-full bg-gray-700/50" />
              <div className="absolute w-full h-px bg-gray-700/50" />
            </div>
            {/* Stick position indicator */}
            <div 
              className="absolute w-8 h-8 bg-cyan-500/50 rounded-full border-2 border-cyan-400 transform -translate-x-1/2 -translate-y-1/2 transition-all"
              style={{
                left: `${50 + roll / 2}%`,
                top: `${50 - pitch / 2}%`
              }}
            />
          </div>
          <div className="text-[9px] text-gray-500 text-center mt-1">
            ↑/↓: Pitch | ←/→: Roll
          </div>
        </div>
      </div>

      {/* Throttle slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500">THROTTLE</span>
          <span className="text-[10px] font-mono text-cyan-400">{throttle.toFixed(0)}%</span>
        </div>
        <Slider
          value={[throttle]}
          onValueChange={([v]) => setThrottle(v)}
          min={0}
          max={100}
          step={1}
          className="w-full"
          disabled={!armed}
        />
      </div>

      {/* Telemetry readout */}
      <div className="grid grid-cols-4 gap-2 text-[10px]">
        <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
          <span className="text-gray-500">THR</span>
          <div className="font-mono text-cyan-400">{throttle.toFixed(0)}%</div>
        </div>
        <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
          <span className="text-gray-500">YAW</span>
          <div className="font-mono text-cyan-400">{yaw.toFixed(0)}°</div>
        </div>
        <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
          <span className="text-gray-500">PCH</span>
          <div className="font-mono text-cyan-400">{pitch.toFixed(0)}°</div>
        </div>
        <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
          <span className="text-gray-500">ROL</span>
          <div className="font-mono text-cyan-400">{roll.toFixed(0)}°</div>
        </div>
      </div>

      {/* Warning */}
      {armed && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-[10px] text-red-400">MOTORS ARMED - EXERCISE CAUTION</span>
        </div>
      )}
    </div>
  )
}
