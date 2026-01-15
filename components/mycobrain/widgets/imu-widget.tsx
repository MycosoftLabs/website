"use client"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Move3d, Compass, RotateCcw, Activity } from "lucide-react"

interface IMUWidgetProps {
  accel?: { x: number; y: number; z: number }
  gyro?: { x: number; y: number; z: number }
  heading?: number
  pitch?: number
  roll?: number
  quaternion?: [number, number, number, number]
  className?: string
}

export function IMUWidget({
  accel = { x: 0, y: 0, z: 9.8 },
  gyro = { x: 0, y: 0, z: 0 },
  heading = 0,
  pitch = 0,
  roll = 0,
  quaternion,
  className
}: IMUWidgetProps) {
  const cubeRef = useRef<HTMLDivElement>(null)

  // Update cube rotation based on orientation
  useEffect(() => {
    if (cubeRef.current) {
      cubeRef.current.style.transform = `rotateX(${-pitch}deg) rotateY(${heading}deg) rotateZ(${-roll}deg)`
    }
  }, [pitch, roll, heading])

  const formatAxis = (value: number, unit: string) => {
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(2)} ${unit}`
  }

  return (
    <div className={cn("p-3 rounded-lg bg-black/40 border border-purple-500/30", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Move3d className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-purple-400">BNO085 IMU</span>
        </div>
        <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-400">
          9-DOF
        </Badge>
      </div>

      {/* 3D Orientation visualization */}
      <div className="flex justify-center mb-3">
        <div className="w-24 h-24 perspective-[200px]">
          <div
            ref={cubeRef}
            className="w-full h-full relative transform-style-preserve-3d transition-transform duration-100"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Front face */}
            <div 
              className="absolute inset-0 bg-purple-500/30 border border-purple-400 flex items-center justify-center text-purple-400 text-[10px] font-bold"
              style={{ transform: "translateZ(48px)" }}
            >
              FRONT
            </div>
            {/* Back face */}
            <div 
              className="absolute inset-0 bg-purple-500/20 border border-purple-400/50"
              style={{ transform: "rotateY(180deg) translateZ(48px)" }}
            />
            {/* Left face */}
            <div 
              className="absolute inset-0 bg-cyan-500/20 border border-cyan-400/50"
              style={{ transform: "rotateY(-90deg) translateZ(48px)" }}
            />
            {/* Right face */}
            <div 
              className="absolute inset-0 bg-cyan-500/20 border border-cyan-400/50"
              style={{ transform: "rotateY(90deg) translateZ(48px)" }}
            />
            {/* Top face */}
            <div 
              className="absolute inset-0 bg-green-500/20 border border-green-400/50"
              style={{ transform: "rotateX(90deg) translateZ(48px)" }}
            />
            {/* Bottom face */}
            <div 
              className="absolute inset-0 bg-gray-500/20 border border-gray-400/50"
              style={{ transform: "rotateX(-90deg) translateZ(48px)" }}
            />
          </div>
        </div>
      </div>

      {/* Euler angles */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 bg-gray-900/50 rounded text-center">
          <div className="text-[9px] text-gray-500">HEADING</div>
          <div className="text-sm font-mono text-cyan-400">{heading.toFixed(1)}°</div>
        </div>
        <div className="p-2 bg-gray-900/50 rounded text-center">
          <div className="text-[9px] text-gray-500">PITCH</div>
          <div className="text-sm font-mono text-cyan-400">{pitch.toFixed(1)}°</div>
        </div>
        <div className="p-2 bg-gray-900/50 rounded text-center">
          <div className="text-[9px] text-gray-500">ROLL</div>
          <div className="text-sm font-mono text-cyan-400">{roll.toFixed(1)}°</div>
        </div>
      </div>

      {/* Accelerometer */}
      <div className="mb-2 p-2 bg-gray-900/50 rounded">
        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
          <Activity className="w-3 h-3" />
          ACCELEROMETER (m/s²)
        </div>
        <div className="grid grid-cols-3 gap-1 text-[9px]">
          <div>
            <span className="text-red-400">X:</span>
            <span className="text-white font-mono ml-1">{formatAxis(accel.x, "")}</span>
          </div>
          <div>
            <span className="text-green-400">Y:</span>
            <span className="text-white font-mono ml-1">{formatAxis(accel.y, "")}</span>
          </div>
          <div>
            <span className="text-blue-400">Z:</span>
            <span className="text-white font-mono ml-1">{formatAxis(accel.z, "")}</span>
          </div>
        </div>
      </div>

      {/* Gyroscope */}
      <div className="p-2 bg-gray-900/50 rounded">
        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
          <RotateCcw className="w-3 h-3" />
          GYROSCOPE (°/s)
        </div>
        <div className="grid grid-cols-3 gap-1 text-[9px]">
          <div>
            <span className="text-red-400">X:</span>
            <span className="text-white font-mono ml-1">{formatAxis(gyro.x, "")}</span>
          </div>
          <div>
            <span className="text-green-400">Y:</span>
            <span className="text-white font-mono ml-1">{formatAxis(gyro.y, "")}</span>
          </div>
          <div>
            <span className="text-blue-400">Z:</span>
            <span className="text-white font-mono ml-1">{formatAxis(gyro.z, "")}</span>
          </div>
        </div>
      </div>

      {/* Quaternion (if available) */}
      {quaternion && (
        <div className="mt-2 p-2 bg-gray-900/50 rounded">
          <div className="text-[10px] text-gray-500 mb-1">QUATERNION</div>
          <div className="text-[9px] font-mono text-gray-400">
            [{quaternion.map(q => q.toFixed(4)).join(", ")}]
          </div>
        </div>
      )}
    </div>
  )
}
