"use client"

import { FC, useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { 
  RTFWatchdog, 
  RTFStatus, 
  getRTFStatusColor, 
  getRTFStatusLabel,
  formatRTF 
} from "@/lib/voice/rtf-watchdog"

interface AudioStats {
  playedAudioDuration: number
  missedAudioDuration: number
  totalAudioMessages: number
  latency: number
  minPlaybackDelay: number
  maxPlaybackDelay: number
  packetsReceived?: number
  packetsSent?: number
}

/**
 * RTF Statistics for monitoring real-time performance
 */
interface RTFStats {
  currentRTF: number
  rollingAvg5s: number
  status: RTFStatus
  droppedFrames: number
}

interface ConsoleMessage {
  timestamp: Date
  type: "info" | "warn" | "error" | "debug"
  message: string
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

interface VoiceMonitorDashboardProps {
  status?: ConnectionStatus
  stats?: AudioStats
  rtfStats?: RTFStats           // New: RTF monitoring
  micLevel?: number
  agentLevel?: number
  consoleMessages?: ConsoleMessage[]
  websocketUrl?: string
  className?: string
  compact?: boolean
}

export const VoiceMonitorDashboard: FC<VoiceMonitorDashboardProps> = ({
  status = "disconnected",
  stats,
  rtfStats,
  micLevel = 0,
  agentLevel = 0,
  consoleMessages = [],
  websocketUrl = "ws://localhost:8998/api/chat",
  className,
  compact = false,
}) => {
  const consoleRef = useRef<HTMLDivElement>(null)
  const micCanvasRef = useRef<HTMLCanvasElement>(null)
  const agentCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  
  const [localMicLevel, setLocalMicLevel] = useState(micLevel)
  const [localAgentLevel, setLocalAgentLevel] = useState(agentLevel)

  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const cents = Math.floor((seconds - Math.floor(seconds)) * 100)
    return `${mins}:${secs.toString().padStart(2, "0")}.${cents.toString().padStart(2, "0")}`
  }

  // Draw microphone visualizer
  const drawMicVisualizer = useCallback(() => {
    const canvas = micCanvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const barCount = 16
    const barWidth = (width / barCount) - 2
    const barGap = 2

    ctx.fillStyle = "#0a0a0a"
    ctx.fillRect(0, 0, width, height)

    // Simulate frequency bars based on level
    for (let i = 0; i < barCount; i++) {
      const variance = Math.random() * 0.3
      const barIntensity = Math.max(0, localMicLevel + variance - 0.15)
      const barHeight = barIntensity * height
      
      // Color gradient from green to orange to red
      let color: string
      if (barIntensity < 0.5) {
        color = `rgb(${Math.floor(barIntensity * 2 * 255)}, 185, 0)`
      } else if (barIntensity < 0.8) {
        color = `rgb(255, ${Math.floor((1 - (barIntensity - 0.5) / 0.3) * 185)}, 0)`
      } else {
        color = "#ff3300"
      }
      
      ctx.fillStyle = color
      ctx.fillRect(
        i * (barWidth + barGap) + barGap,
        height - barHeight,
        barWidth,
        barHeight
      )
    }
  }, [localMicLevel])

  // Draw agent visualizer
  const drawAgentVisualizer = useCallback(() => {
    const canvas = agentCanvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) / 2 - 5

    ctx.fillStyle = "#0a0a0a"
    ctx.fillRect(0, 0, width, height)

    // Draw outer ring
    ctx.beginPath()
    ctx.arc(centerX, centerY, maxRadius, 0, 2 * Math.PI)
    ctx.strokeStyle = "#333"
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw pulsing circle based on audio level
    const pulseRadius = maxRadius * (0.3 + 0.7 * localAgentLevel)
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius)
    gradient.addColorStop(0, "#76B900")
    gradient.addColorStop(0.7, "#4E8800")
    gradient.addColorStop(1, "#265600")
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, pulseRadius, 0, 2 * Math.PI)
    ctx.fillStyle = gradient
    ctx.fill()

    // Draw inner core when speaking
    if (localAgentLevel > 0.1) {
      ctx.beginPath()
      ctx.arc(centerX, centerY, maxRadius * 0.15, 0, 2 * Math.PI)
      ctx.fillStyle = "#9be900"
      ctx.fill()
    }
  }, [localAgentLevel])

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawMicVisualizer()
      drawAgentVisualizer()
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animate()
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [drawMicVisualizer, drawAgentVisualizer])

  // Update local levels from props
  useEffect(() => {
    setLocalMicLevel(micLevel)
  }, [micLevel])
  
  useEffect(() => {
    setLocalAgentLevel(agentLevel)
  }, [agentLevel])

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [consoleMessages])

  const getStatusColor = () => {
    switch (status) {
      case "connected": return "bg-green-500"
      case "connecting": return "bg-yellow-500 animate-pulse"
      case "error": return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  const getConsoleColor = (type: ConsoleMessage["type"]) => {
    switch (type) {
      case "error": return "text-red-400"
      case "warn": return "text-yellow-400"
      case "debug": return "text-gray-400"
      default: return "text-green-400"
    }
  }

  const defaultStats: AudioStats = {
    playedAudioDuration: 0,
    missedAudioDuration: 0,
    totalAudioMessages: 0,
    latency: 0,
    minPlaybackDelay: 0,
    maxPlaybackDelay: 0,
  }

  const currentStats = stats || defaultStats

  if (compact) {
    return (
      <div className={cn("bg-zinc-900 text-white p-2 rounded-lg border border-zinc-700", className)}>
        <div className="flex items-center gap-3">
          <span className={cn("w-2 h-2 rounded-full", getStatusColor())} />
          <span className="text-xs font-mono">
            {status === "connected" ? "MYCA Active" : status}
          </span>
          <span className="text-xs text-zinc-400 font-mono">
            Lat: {currentStats.latency.toFixed(3)}s
          </span>
          {/* RTF indicator in compact mode */}
          {rtfStats && (
            <span 
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{ 
                backgroundColor: `${getRTFStatusColor(rtfStats.status)}20`,
                color: getRTFStatusColor(rtfStats.status),
              }}
            >
              RTF: {formatRTF(rtfStats.rollingAvg5s)}
            </span>
          )}
          <div className="flex-1 h-1 bg-zinc-700 rounded overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-75"
              style={{ width: `${localMicLevel * 100}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("bg-zinc-900 text-white p-4 rounded-xl border border-zinc-700 w-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className={cn("w-3 h-3 rounded-full", getStatusColor())} />
          MYCA Voice Monitor
        </h2>
        <div className="text-sm text-zinc-400">
          {status === "connected" ? "Full Duplex Active" : status}
        </div>
      </div>

      {/* Visualizers */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-zinc-800 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium">Mic Input</span>
            <span className="text-xs text-zinc-400">{Math.round(localMicLevel * 100)}%</span>
          </div>
          <canvas
            ref={micCanvasRef}
            width={200}
            height={60}
            className="w-full rounded bg-zinc-900"
          />
        </div>

        <div className="bg-zinc-800 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium">MYCA Response</span>
            <span className="text-xs text-zinc-400">{Math.round(localAgentLevel * 100)}%</span>
          </div>
          <canvas
            ref={agentCanvasRef}
            width={200}
            height={60}
            className="w-full rounded bg-zinc-900"
          />
        </div>
      </div>

      {/* RTF Indicator - Real-Time Factor Monitoring */}
      {rtfStats && (
        <div 
          className="bg-zinc-800 rounded-lg p-2 mb-3 border-l-4"
          style={{ borderColor: getRTFStatusColor(rtfStats.status) }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getRTFStatusColor(rtfStats.status) }}
              />
              <span className="text-xs font-medium">
                RTF: {getRTFStatusLabel(rtfStats.status)}
              </span>
            </div>
            <div className="flex gap-4 text-xs">
              <div>
                <span className="text-zinc-400">Current: </span>
                <span 
                  className="font-mono"
                  style={{ color: getRTFStatusColor(rtfStats.status) }}
                >
                  {formatRTF(rtfStats.currentRTF)}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">Avg 5s: </span>
                <span className="font-mono text-blue-400">
                  {formatRTF(rtfStats.rollingAvg5s)}
                </span>
              </div>
              {rtfStats.droppedFrames > 0 && (
                <div>
                  <span className="text-zinc-400">Dropped: </span>
                  <span className="font-mono text-red-400">
                    {rtfStats.droppedFrames}
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* RTF Progress Bar */}
          <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-200 rounded-full"
              style={{ 
                width: `${Math.min(100, rtfStats.currentRTF * 100)}%`,
                backgroundColor: getRTFStatusColor(rtfStats.status),
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-zinc-500">
            <span>0</span>
            <span>0.7 (target)</span>
            <span>1.0</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="bg-zinc-800 rounded-lg p-2 mb-3">
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <div className="text-zinc-400">Played</div>
            <div className="font-mono text-green-400">{formatTime(currentStats.playedAudioDuration)}</div>
          </div>
          <div>
            <div className="text-zinc-400">Missed</div>
            <div className="font-mono text-red-400">{formatTime(currentStats.missedAudioDuration)}</div>
          </div>
          <div>
            <div className="text-zinc-400">Latency</div>
            <div className="font-mono text-yellow-400">{currentStats.latency.toFixed(3)}s</div>
          </div>
          <div>
            <div className="text-zinc-400">Buffer</div>
            <div className="font-mono text-blue-400">
              {currentStats.minPlaybackDelay === Infinity ? "0" : currentStats.minPlaybackDelay.toFixed(2)}/
              {currentStats.maxPlaybackDelay.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Console */}
      <div className="bg-zinc-950 rounded-lg p-2 border border-zinc-700">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-medium">Console</h3>
          <span className="text-xs text-zinc-500 font-mono">{websocketUrl}</span>
        </div>
        <div
          ref={consoleRef}
          className="h-20 overflow-y-auto font-mono text-xs space-y-0.5"
        >
          {consoleMessages.slice(-20).map((msg, idx) => (
            <div key={idx} className={cn(getConsoleColor(msg.type))}>
              <span className="text-zinc-500">
                [{msg.timestamp.toLocaleTimeString()}]
              </span>{" "}
              <span className="text-zinc-400 uppercase">[{msg.type}]</span>{" "}
              {msg.message}
            </div>
          ))}
          {consoleMessages.length === 0 && (
            <div className="text-zinc-500 italic">Waiting for connection...</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VoiceMonitorDashboard
