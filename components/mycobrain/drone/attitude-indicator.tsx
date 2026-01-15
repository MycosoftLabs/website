"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface AttitudeIndicatorProps {
  pitch: number // degrees, -90 to 90
  roll: number  // degrees, -180 to 180
  heading: number // degrees, 0 to 360
  className?: string
}

export function AttitudeIndicator({ pitch, roll, heading, className }: AttitudeIndicatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - 10

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Save context for rotation
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate((-roll * Math.PI) / 180)

    // Draw sky (blue)
    ctx.fillStyle = "#0066CC"
    ctx.beginPath()
    ctx.rect(-radius, -radius + (pitch * radius) / 45, radius * 2, radius)
    ctx.fill()

    // Draw ground (brown)
    ctx.fillStyle = "#663300"
    ctx.beginPath()
    ctx.rect(-radius, (pitch * radius) / 45, radius * 2, radius)
    ctx.fill()

    // Horizon line
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-radius, (pitch * radius) / 45)
    ctx.lineTo(radius, (pitch * radius) / 45)
    ctx.stroke()

    // Pitch marks
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 1
    ctx.font = "10px monospace"
    ctx.fillStyle = "#FFFFFF"
    ctx.textAlign = "center"
    
    for (let p = -30; p <= 30; p += 10) {
      if (p === 0) continue
      const y = (pitch - p) * radius / 45
      const markWidth = p % 20 === 0 ? 40 : 20
      
      ctx.beginPath()
      ctx.moveTo(-markWidth, y)
      ctx.lineTo(markWidth, y)
      ctx.stroke()
      
      if (p % 20 === 0) {
        ctx.fillText(`${Math.abs(p)}`, -markWidth - 15, y + 3)
        ctx.fillText(`${Math.abs(p)}`, markWidth + 15, y + 3)
      }
    }

    ctx.restore()

    // Draw fixed aircraft symbol
    ctx.strokeStyle = "#FFD700"
    ctx.lineWidth = 3
    ctx.beginPath()
    // Center dot
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2)
    ctx.stroke()
    // Wings
    ctx.beginPath()
    ctx.moveTo(centerX - 50, centerY)
    ctx.lineTo(centerX - 15, centerY)
    ctx.moveTo(centerX + 15, centerY)
    ctx.lineTo(centerX + 50, centerY)
    // Tail
    ctx.moveTo(centerX, centerY + 15)
    ctx.lineTo(centerX, centerY + 30)
    ctx.stroke()

    // Draw bank angle markers
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 2
    const bankAngles = [0, 10, 20, 30, 45, 60, 90, -10, -20, -30, -45, -60, -90]
    
    for (const angle of bankAngles) {
      const rad = ((angle - 90) * Math.PI) / 180
      const innerR = radius - 15
      const outerR = angle % 30 === 0 ? radius - 5 : radius - 10
      
      ctx.beginPath()
      ctx.moveTo(centerX + innerR * Math.cos(rad), centerY + innerR * Math.sin(rad))
      ctx.lineTo(centerX + outerR * Math.cos(rad), centerY + outerR * Math.sin(rad))
      ctx.stroke()
    }

    // Draw roll pointer
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate((-roll * Math.PI) / 180)
    ctx.fillStyle = "#FFD700"
    ctx.beginPath()
    ctx.moveTo(0, -radius + 20)
    ctx.lineTo(-8, -radius + 35)
    ctx.lineTo(8, -radius + 35)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Draw outer ring
    ctx.strokeStyle = "#333333"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()

    // Heading display
    ctx.fillStyle = "#00FF00"
    ctx.font = "bold 14px monospace"
    ctx.textAlign = "center"
    ctx.fillText(`HDG ${heading.toFixed(0).padStart(3, "0")}°`, centerX, height - 10)

  }, [pitch, roll, heading])

  return (
    <div className={cn("p-3 rounded-lg bg-black/60 border border-cyan-500/30", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-cyan-400">ATTITUDE</span>
        <span className="text-[10px] text-gray-500 font-mono">
          P:{pitch.toFixed(1)}° R:{roll.toFixed(1)}°
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className="mx-auto"
      />
    </div>
  )
}
