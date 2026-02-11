/**
 * Scientific Oscilloscope - Fungal Electrophysiology
 * 
 * Real-time multi-channel voltage visualization with full scientific controls.
 */

"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  Play, Pause, RotateCcw, ZoomIn, ZoomOut, 
  Download, Crosshair, Layers, Grid3X3,
  Clock, Zap
} from "lucide-react"

interface ChannelConfig {
  id: number
  name: string
  color: string
  enabled: boolean
  gain: number
  offset: number
}

interface OscilloscopeProps {
  className?: string
}

const TIME_SCALES = [
  { label: "1ms", value: 0.001 },
  { label: "10ms", value: 0.01 },
  { label: "100ms", value: 0.1 },
  { label: "1s", value: 1 },
  { label: "10s", value: 10 },
  { label: "1min", value: 60 },
  { label: "10min", value: 600 },
  { label: "1hr", value: 3600 },
]

const VOLT_SCALES = [
  { label: "1µV", value: 1 },
  { label: "5µV", value: 5 },
  { label: "10µV", value: 10 },
  { label: "50µV", value: 50 },
  { label: "100µV", value: 100 },
  { label: "500µV", value: 500 },
  { label: "1mV", value: 1000 },
  { label: "5mV", value: 5000 },
]

const DIVISIONS = 10
const INITIAL_CHANNELS: ChannelConfig[] = [
  { id: 0, name: "FCI-1", color: "#00ff88", enabled: true, gain: 1, offset: 0 },
  { id: 1, name: "FCI-2", color: "#00d4ff", enabled: true, gain: 1, offset: 0 },
  { id: 2, name: "FCI-3", color: "#ff6b6b", enabled: false, gain: 1, offset: 2 },
  { id: 3, name: "FCI-4", color: "#ffa94d", enabled: false, gain: 1, offset: -2 },
]

export function Oscilloscope({ className }: OscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const persistenceRef = useRef<ImageData | null>(null)
  const dataBufferRef = useRef<{ time: number; values: number[] }[]>([])
  const timeRef = useRef(0)
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isPaused, setIsPaused] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [showPersistence, setShowPersistence] = useState(false)
  const [showCursor, setShowCursor] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  
  const [timeScaleIdx, setTimeScaleIdx] = useState(4)
  const [voltScaleIdx, setVoltScaleIdx] = useState(4)
  const [channels, setChannels] = useState<ChannelConfig[]>(INITIAL_CHANNELS)
  const [triggerLevel] = useState(50)
  
  const timeScale = TIME_SCALES[timeScaleIdx]
  const voltScale = VOLT_SCALES[voltScaleIdx]

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current
        setDimensions(prev => {
          if (prev.width !== clientWidth || prev.height !== clientHeight) {
            return { width: clientWidth, height: clientHeight }
          }
          return prev
        })
      }
    }

    const timer = setTimeout(updateDimensions, 50)
    const resizeObserver = new ResizeObserver(() => setTimeout(updateDimensions, 50))
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
    }
  }, [])
  
  // Generate signal (pure function)
  const generateSignal = (t: number, channelIdx: number): number => {
    let voltage = 0
    voltage += 20 * Math.sin(t * 0.005 + channelIdx * 1.3)
    voltage += 10 * Math.sin(t * 0.002 + channelIdx * 0.7)
    voltage += 15 * Math.sin(t * 0.3 + channelIdx * 2.1)
    voltage += 8 * Math.sin(t * 0.7 + channelIdx * 0.5)
    
    const spikePhases = [
      { freq: 0.12, threshold: 0.96, amp: 40 },
      { freq: 0.08, threshold: 0.97, amp: 60 },
      { freq: 0.18, threshold: 0.98, amp: 35 },
    ]
    
    spikePhases.forEach(({ freq, threshold, amp }) => {
      const phase = Math.sin(t * freq + channelIdx * 1.1)
      if (phase > threshold) {
        const spikeT = (t * freq) % (Math.PI * 2)
        const spike = Math.exp(-Math.pow(spikeT - Math.PI, 2) * 0.5)
        voltage += spike * amp * (1 + Math.random() * 0.3)
      }
    })
    
    if (Math.sin(t * 0.02 + channelIdx) > 0.85) {
      for (let i = 0; i < 4; i++) {
        if (Math.sin(t * 1.5 + i * 0.3) > 0.6) {
          voltage += 25 * Math.exp(-Math.pow(Math.sin(t * 1.5 + i * 0.3) - 1, 2) * 5)
        }
      }
    }
    
    voltage += (Math.random() - 0.5) * 8
    return voltage
  }
  
  // Main animation loop
  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    let lastTime = performance.now()
    
    const draw = (now: number) => {
      const dt = (now - lastTime) / 1000
      lastTime = now
      
      const w = canvas.width
      const h = canvas.height
      
      if (!isPaused) {
        timeRef.current += dt
      }
      
      const t = timeRef.current
      
      // Generate new data
      if (!isPaused) {
        const newValues = channels.map((ch, idx) => generateSignal(t, idx))
        dataBufferRef.current.push({ time: t, values: newValues })
        
        const windowTime = timeScale.value * DIVISIONS
        const minTime = t - windowTime * 2
        dataBufferRef.current = dataBufferRef.current.filter(d => d.time >= minTime)
      }
      
      // Apply persistence
      if (showPersistence && persistenceRef.current) {
        ctx.putImageData(persistenceRef.current, 0, 0)
        ctx.fillStyle = "rgba(5, 8, 16, 0.1)"
        ctx.fillRect(0, 0, w, h)
      } else {
        ctx.fillStyle = "#050810"
        ctx.fillRect(0, 0, w, h)
      }
      
      // Grid
      if (showGrid) {
        const divW = w / DIVISIONS
        const divH = h / 8
        
        ctx.strokeStyle = "rgba(0, 200, 255, 0.08)"
        ctx.lineWidth = 1
        
        for (let i = 0; i <= DIVISIONS; i++) {
          ctx.beginPath()
          ctx.moveTo(i * divW, 0)
          ctx.lineTo(i * divW, h)
          ctx.stroke()
        }
        
        for (let i = 0; i <= 8; i++) {
          ctx.beginPath()
          ctx.moveTo(0, i * divH)
          ctx.lineTo(w, i * divH)
          ctx.stroke()
        }
        
        ctx.strokeStyle = "rgba(0, 200, 255, 0.25)"
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(w / 2, 0)
        ctx.lineTo(w / 2, h)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, h / 2)
        ctx.lineTo(w, h / 2)
        ctx.stroke()
      }
      
      // Signals
      const data = dataBufferRef.current
      if (data.length >= 2) {
        const windowTime = timeScale.value * DIVISIONS
        const startTime = t - windowTime
        const baseline = h / 2
        const pixelsPerMicrovolt = (h / 8) / voltScale.value
        
        channels.forEach((ch, chIdx) => {
          if (!ch.enabled) return
          
          ctx.strokeStyle = ch.color
          ctx.lineWidth = 2
          ctx.lineCap = "round"
          ctx.lineJoin = "round"
          ctx.shadowColor = ch.color
          ctx.shadowBlur = 6
          
          ctx.beginPath()
          let firstPoint = true
          
          data.forEach(sample => {
            const relTime = sample.time - startTime
            if (relTime < 0 || relTime > windowTime) return
            
            const x = (relTime / windowTime) * w
            const voltage = (sample.values[chIdx] || 0) * ch.gain
            const offsetPx = ch.offset * (h / 8)
            const y = baseline - (voltage * pixelsPerMicrovolt) + offsetPx
            
            if (firstPoint) {
              ctx.moveTo(x, y)
              firstPoint = false
            } else {
              ctx.lineTo(x, y)
            }
          })
          
          ctx.stroke()
          ctx.shadowBlur = 0
        })
      }
      
      // Trigger level
      const triggerY = h / 2 - (triggerLevel * (h / 8) / voltScale.value)
      ctx.strokeStyle = "#fbbf24"
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(0, triggerY)
      ctx.lineTo(w, triggerY)
      ctx.stroke()
      ctx.setLineDash([])
      
      // Cursor
      if (showCursor && cursorPos.x > 0) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(cursorPos.x, 0)
        ctx.lineTo(cursorPos.x, h)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, cursorPos.y)
        ctx.lineTo(w, cursorPos.y)
        ctx.stroke()
        ctx.setLineDash([])
        
        const windowTime = timeScale.value * DIVISIONS
        const time = (cursorPos.x / w) * windowTime
        const voltage = ((h / 2 - cursorPos.y) / (h / 8)) * voltScale.value
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
        ctx.fillRect(cursorPos.x + 10, cursorPos.y - 30, 80, 25)
        ctx.fillStyle = "#ffffff"
        ctx.font = "10px monospace"
        ctx.textAlign = "left"
        ctx.fillText(`t: ${time.toFixed(2)}s`, cursorPos.x + 15, cursorPos.y - 18)
        ctx.fillText(`V: ${voltage.toFixed(1)}µV`, cursorPos.x + 15, cursorPos.y - 8)
      }
      
      // Scale info
      ctx.fillStyle = "#06b6d4"
      ctx.font = "10px monospace"
      ctx.textAlign = "left"
      ctx.fillText(`${timeScale.label}/div`, 5, h - 5)
      ctx.textAlign = "right"
      ctx.fillText(`${voltScale.label}/div`, w - 5, h - 5)
      ctx.textAlign = "center"
      ctx.fillText(formatTime(t), w / 2, 12)
      
      if (showPersistence) {
        persistenceRef.current = ctx.getImageData(0, 0, w, h)
      }
      
      animationRef.current = requestAnimationFrame(draw)
    }
    
    animationRef.current = requestAnimationFrame(draw)
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [dimensions, isPaused, showGrid, showPersistence, showCursor, cursorPos, timeScale, voltScale, channels, triggerLevel])
  
  const formatTime = (seconds: number): string => {
    if (seconds < 0.001) return `${(seconds * 1000000).toFixed(0)}µs`
    if (seconds < 1) return `${(seconds * 1000).toFixed(1)}ms`
    if (seconds < 60) return `${seconds.toFixed(2)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m${(seconds % 60).toFixed(0)}s`
    return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`
  }
  
  const handleReset = () => {
    setIsPaused(false)
    setTimeScaleIdx(4)
    setVoltScaleIdx(4)
    timeRef.current = 0
    dataBufferRef.current = []
    persistenceRef.current = null
  }
  
  const toggleChannel = (idx: number) => {
    setChannels(prev => prev.map((ch, i) => i === idx ? { ...ch, enabled: !ch.enabled } : ch))
  }
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (showCursor) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }
    }
  }
  
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ samples: dataBufferRef.current, timeScale: timeScale.label, voltScale: voltScale.label }, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `oscilloscope_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn("w-full h-full flex flex-col overflow-hidden", className)}>
      <div className="flex-none flex items-center justify-between gap-2 px-1 py-1 border-b border-cyan-500/20">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsPaused(!isPaused)} className="h-6 w-6 p-0 text-cyan-400 hover:bg-cyan-500/10">
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReset} className="h-6 w-6 p-0 text-cyan-400 hover:bg-cyan-500/10">
            <RotateCcw className="h-3 w-3" />
          </Button>
          {!isPaused && (
            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1" />REC
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-0.5">
          <Clock className="h-3 w-3 text-cyan-400/50" />
          <Button variant="ghost" size="icon" onClick={() => setTimeScaleIdx(Math.max(0, timeScaleIdx - 1))} className="h-5 w-5 p-0 text-cyan-400">
            <ZoomIn className="h-2.5 w-2.5" />
          </Button>
          <span className="text-[9px] text-cyan-400 font-mono w-14 text-center">{timeScale.label}/div</span>
          <Button variant="ghost" size="icon" onClick={() => setTimeScaleIdx(Math.min(TIME_SCALES.length - 1, timeScaleIdx + 1))} className="h-5 w-5 p-0 text-cyan-400">
            <ZoomOut className="h-2.5 w-2.5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-0.5">
          <Zap className="h-3 w-3 text-emerald-400/50" />
          <Button variant="ghost" size="icon" onClick={() => setVoltScaleIdx(Math.max(0, voltScaleIdx - 1))} className="h-5 w-5 p-0 text-emerald-400">
            <ZoomIn className="h-2.5 w-2.5" />
          </Button>
          <span className="text-[9px] text-emerald-400 font-mono w-14 text-center">{voltScale.label}/div</span>
          <Button variant="ghost" size="icon" onClick={() => setVoltScaleIdx(Math.min(VOLT_SCALES.length - 1, voltScaleIdx + 1))} className="h-5 w-5 p-0 text-emerald-400">
            <ZoomOut className="h-2.5 w-2.5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowGrid(!showGrid)} className={cn("h-5 w-5 p-0", showGrid ? "text-cyan-400" : "text-gray-500")} title="Grid">
            <Grid3X3 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowPersistence(!showPersistence)} className={cn("h-5 w-5 p-0", showPersistence ? "text-purple-400" : "text-gray-500")} title="Persistence">
            <Layers className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowCursor(!showCursor)} className={cn("h-5 w-5 p-0", showCursor ? "text-amber-400" : "text-gray-500")} title="Cursor">
            <Crosshair className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={exportData} className="h-5 w-5 p-0 text-cyan-400" title="Export">
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div ref={containerRef} className="flex-1 relative rounded overflow-hidden bg-[#050810] border border-cyan-500/20 min-h-0 min-w-0">
        <div className="absolute inset-0 pointer-events-none z-10" style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)` }} />
        <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="block cursor-crosshair" onClick={handleCanvasClick} />
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
          {channels.map((ch, idx) => (
            <div key={ch.id} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono cursor-pointer", ch.enabled ? "opacity-100" : "opacity-40")}
              style={{ color: ch.color, textShadow: ch.enabled ? `0 0 6px ${ch.color}` : "none", backgroundColor: ch.enabled ? `${ch.color}15` : "transparent" }}
              onClick={() => toggleChannel(idx)}>
              <span className="font-bold">{ch.name}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex-none flex items-center justify-between px-1 py-0.5">
        <div className="flex items-center gap-1">
          {channels.map((ch, idx) => (
            <button key={ch.id} onClick={() => toggleChannel(idx)} className="relative h-5 w-5 rounded-full transition-all hover:scale-110"
              style={{ backgroundColor: ch.enabled ? ch.color : "transparent", color: ch.enabled ? "#000" : ch.color, opacity: ch.enabled ? 1 : 0.4, border: `2px solid ${ch.color}`, boxShadow: ch.enabled ? `0 0 8px ${ch.color}` : "none" }}>
              <span className="text-[8px] font-bold">{idx + 1}</span>
            </button>
          ))}
        </div>
        <span className="text-[8px] text-cyan-400/50 font-mono">Fungal Electrophysiology</span>
      </div>
    </div>
  )
}

export default Oscilloscope
