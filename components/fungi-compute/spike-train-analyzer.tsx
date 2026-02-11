/**
 * Spike Train Analyzer - Scientific Electrophysiology Tool
 * 
 * Based on Adamatzky (2022) Royal Society Open Science
 * https://doi.org/10.1098/rsos.211926
 */

"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Play, Pause, SkipForward, ZoomIn, ZoomOut, 
  Layers, Download, RotateCcw,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SpikeEvent {
  time: number
  amplitude: number
  channel: number
  tagged?: boolean
  label?: string
}

interface DetectedPattern {
  startTime: number
  endTime: number
  type: string
  confidence: number
  spikes: number[]
}

interface ViewState {
  timeOffset: number
  timeScale: number
  voltageScale: number
  voltageOffset: number
}

const CHANNELS = [
  { id: 0, name: "CH1", color: "#00ff88", enabled: true },
  { id: 1, name: "CH2", color: "#00d4ff", enabled: true },
  { id: 2, name: "CH3", color: "#ff6b6b", enabled: false },
  { id: 3, name: "CH4", color: "#ffa94d", enabled: false },
]

const TIME_SCALES = [
  { label: "10ms", value: 0.01 },
  { label: "100ms", value: 0.1 },
  { label: "1s", value: 1 },
  { label: "10s", value: 10 },
  { label: "1min", value: 60 },
  { label: "10min", value: 600 },
  { label: "1hr", value: 3600 },
]

const VOLTAGE_SCALES = [
  { label: "10µV", value: 10 },
  { label: "50µV", value: 50 },
  { label: "100µV", value: 100 },
  { label: "500µV", value: 500 },
  { label: "1mV", value: 1000 },
  { label: "5mV", value: 5000 },
]

const PATTERN_TYPES = [
  { type: "spike_train", label: "Spike Train", color: "#fbbf24" },
  { type: "word", label: "Word", color: "#a855f7" },
  { type: "burst", label: "Burst", color: "#ef4444" },
  { type: "oscillation", label: "Oscillation", color: "#3b82f6" },
]

export function SpikeTrainAnalyzer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const dataBufferRef = useRef<{ time: number; values: number[] }[]>([])
  const spikesRef = useRef<SpikeEvent[]>([])
  const patternsRef = useRef<DetectedPattern[]>([])
  const timeRef = useRef(0)
  const statsRef = useRef({ spikeRate: 0, avgAmplitude: 0, detectedWords: 0 })
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isLive, setIsLive] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [showPatterns, setShowPatterns] = useState(true)
  const [showWordOverlay, setShowWordOverlay] = useState(true)
  const [channels, setChannels] = useState(CHANNELS)
  
  const [view, setView] = useState<ViewState>({
    timeOffset: 0,
    timeScale: 10,
    voltageScale: 100,
    voltageOffset: 0,
  })
  
  const [stats, setStats] = useState({ spikeRate: 0, avgAmplitude: 0, detectedWords: 0 })

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

  // Generate realistic fungal electrophysiology data (pure function)
  const generateData = (currentTime: number, currentChannels: typeof CHANNELS) => {
    const values: number[] = []
    
    currentChannels.forEach((ch, idx) => {
      if (!ch.enabled) {
        values.push(0)
        return
      }
      
      let voltage = 0
      
      // Baseline drift
      voltage += 15 * Math.sin(currentTime * 0.05 + idx)
      voltage += 8 * Math.sin(currentTime * 0.02 + idx * 2)
      
      // Spontaneous action potentials
      const spikePhases = [
        Math.sin(currentTime * 0.15 + idx * 1.5),
        Math.sin(currentTime * 0.08 + idx * 0.7),
        Math.sin(currentTime * 0.22 + idx * 2.3),
      ]
      
      spikePhases.forEach((phase, i) => {
        if (phase > 0.97) {
          const width = 0.02 + Math.random() * 0.01
          const spikePos = (currentTime * (0.15 + i * 0.07)) % 1
          const spikePeak = Math.exp(-Math.pow(spikePos - 0.5, 2) / (2 * width * width))
          const amplitude = 30 + Math.random() * 50
          voltage += spikePeak * amplitude
          
          if (spikePeak > 0.8) {
            spikesRef.current.push({
              time: currentTime,
              amplitude: amplitude * spikePeak,
              channel: idx,
            })
            if (spikesRef.current.length > 1000) {
              spikesRef.current = spikesRef.current.slice(-1000)
            }
          }
        }
      })
      
      // Spike trains / "words"
      const wordPhase = Math.sin(currentTime * 0.03)
      if (wordPhase > 0.9) {
        for (let s = 0; s < 5; s++) {
          const burstPhase = Math.sin(currentTime * 2 + s * 0.5)
          if (burstPhase > 0.7) {
            voltage += (20 + Math.random() * 30) * Math.exp(-Math.pow(burstPhase - 1, 2) * 50)
          }
        }
      }
      
      // Biological noise
      voltage += (Math.random() - 0.5) * 5
      
      values.push(voltage)
    })
    
    return values
  }

  // Detect patterns in data (pure function)
  const detectPatterns = (currentTime: number) => {
    const recentSpikes = spikesRef.current.slice(-100)
    if (recentSpikes.length < 5) return
    
    const words: DetectedPattern[] = []
    let currentCluster: SpikeEvent[] = []
    
    for (let i = 0; i < recentSpikes.length; i++) {
      const spike = recentSpikes[i]
      
      if (currentCluster.length === 0) {
        currentCluster.push(spike)
      } else {
        const lastSpike = currentCluster[currentCluster.length - 1]
        if (spike.time - lastSpike.time < 2) {
          currentCluster.push(spike)
        } else {
          if (currentCluster.length >= 3) {
            words.push({
              startTime: currentCluster[0].time,
              endTime: currentCluster[currentCluster.length - 1].time,
              type: currentCluster.length >= 5 ? "word" : "spike_train",
              confidence: Math.min(0.95, 0.5 + currentCluster.length * 0.1),
              spikes: currentCluster.map(s => s.time),
            })
          }
          currentCluster = [spike]
        }
      }
    }
    
    patternsRef.current = words.slice(-20)
    
    // Update stats
    const recentTime = currentTime - 60
    const recentSpikeCount = spikesRef.current.filter(s => s.time > recentTime).length
    const avgAmp = recentSpikes.length > 0 
      ? recentSpikes.reduce((sum, s) => sum + s.amplitude, 0) / recentSpikes.length 
      : 0
    
    statsRef.current = {
      spikeRate: recentSpikeCount / 60,
      avgAmplitude: avgAmp,
      detectedWords: patternsRef.current.filter(p => p.type === "word").length,
    }
  }

  // Main animation loop
  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    let lastTime = performance.now()
    let lastStatsUpdate = 0
    
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
        const newData = generateData(t, channels)
        dataBufferRef.current.push({ time: t, values: newData })
        
        const maxSamples = Math.floor(600 / (1/60))
        if (dataBufferRef.current.length > maxSamples) {
          dataBufferRef.current = dataBufferRef.current.slice(-maxSamples)
        }
        
        if (Math.floor(t * 2) !== Math.floor((t - dt) * 2)) {
          detectPatterns(t)
        }
      }
      
      // Update stats periodically
      if (now - lastStatsUpdate > 500) {
        lastStatsUpdate = now
        setStats({ ...statsRef.current })
      }
      
      // Auto-scroll if live
      if (isLive && !isPaused) {
        setView(prev => ({
          ...prev,
          timeOffset: Math.max(0, t - prev.timeScale)
        }))
      }
      
      // Clear
      ctx.fillStyle = "#050810"
      ctx.fillRect(0, 0, w, h)
      
      drawGrid(ctx, w, h)
      
      if (showPatterns && showWordOverlay) {
        drawPatternOverlay(ctx, w, h, view, t)
      }
      
      drawSignals(ctx, w, h, view, channels)
      drawSpikeMarkers(ctx, w, h, view, channels)
      drawTimeIndicator(ctx, w, h, view, t, isLive)
      drawScaleLabels(ctx, w, h, view)
      
      animationRef.current = requestAnimationFrame(draw)
    }
    
    animationRef.current = requestAnimationFrame(draw)
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [dimensions, isPaused, isLive, showPatterns, showWordOverlay, channels, view])

  // Drawing functions
  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const divisions = 10
    
    ctx.strokeStyle = "rgba(0, 200, 255, 0.05)"
    ctx.lineWidth = 1
    
    for (let i = 0; i <= divisions; i++) {
      const x = (i / divisions) * w
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
      
      const y = (i / divisions) * h
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    
    ctx.strokeStyle = "rgba(0, 200, 255, 0.3)"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()
  }
  
  const drawPatternOverlay = (ctx: CanvasRenderingContext2D, w: number, h: number, currentView: ViewState, t: number) => {
    patternsRef.current.forEach(pattern => {
      const startX = ((pattern.startTime - currentView.timeOffset) / currentView.timeScale) * w
      const endX = ((pattern.endTime - currentView.timeOffset) / currentView.timeScale) * w
      
      if (endX < 0 || startX > w) return
      
      const patternType = PATTERN_TYPES.find(p => p.type === pattern.type)
      if (!patternType) return
      
      ctx.fillStyle = `${patternType.color}15`
      ctx.fillRect(Math.max(0, startX), 0, Math.min(endX - startX, w), h)
      
      ctx.strokeStyle = `${patternType.color}40`
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(Math.max(0, startX), 0, Math.min(endX - startX, w), h)
      ctx.setLineDash([])
      
      if (endX - startX > 40) {
        ctx.fillStyle = patternType.color
        ctx.font = "bold 10px monospace"
        ctx.textAlign = "center"
        ctx.fillText(patternType.label, (startX + endX) / 2, 15)
        ctx.font = "9px monospace"
        ctx.fillStyle = `${patternType.color}80`
        ctx.fillText(`${(pattern.confidence * 100).toFixed(0)}%`, (startX + endX) / 2, 26)
      }
    })
  }
  
  const drawSignals = (ctx: CanvasRenderingContext2D, w: number, h: number, currentView: ViewState, currentChannels: typeof CHANNELS) => {
    const data = dataBufferRef.current
    if (data.length < 2) return
    
    const baseline = h / 2 + currentView.voltageOffset
    const voltageToPixels = h / currentView.voltageScale
    
    currentChannels.forEach((channel, chIdx) => {
      if (!channel.enabled) return
      
      ctx.strokeStyle = channel.color
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.shadowColor = channel.color
      ctx.shadowBlur = 6
      
      ctx.beginPath()
      
      let firstPoint = true
      
      data.forEach((sample) => {
        const relTime = sample.time - currentView.timeOffset
        if (relTime < 0 || relTime > currentView.timeScale) return
        
        const x = (relTime / currentView.timeScale) * w
        const voltage = sample.values[chIdx] || 0
        const y = baseline - voltage * voltageToPixels / 100
        
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
  
  const drawSpikeMarkers = (ctx: CanvasRenderingContext2D, w: number, h: number, currentView: ViewState, currentChannels: typeof CHANNELS) => {
    if (!showPatterns) return
    
    spikesRef.current.forEach(spike => {
      const relTime = spike.time - currentView.timeOffset
      if (relTime < 0 || relTime > currentView.timeScale) return
      
      const x = (relTime / currentView.timeScale) * w
      const channel = currentChannels[spike.channel]
      if (!channel?.enabled) return
      
      ctx.fillStyle = spike.tagged ? "#fbbf24" : `${channel.color}60`
      ctx.beginPath()
      ctx.moveTo(x, 5)
      ctx.lineTo(x - 4, 0)
      ctx.lineTo(x + 4, 0)
      ctx.closePath()
      ctx.fill()
      
      if (spike.label) {
        ctx.fillStyle = "#fbbf24"
        ctx.font = "8px monospace"
        ctx.textAlign = "center"
        ctx.fillText(spike.label, x, 20)
      }
    })
  }
  
  const drawTimeIndicator = (ctx: CanvasRenderingContext2D, w: number, h: number, currentView: ViewState, t: number, live: boolean) => {
    if (live) {
      const liveX = ((t - currentView.timeOffset) / currentView.timeScale) * w
      if (liveX > 0 && liveX < w) {
        ctx.strokeStyle = "#ff6b6b"
        ctx.lineWidth = 2
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(liveX, 0)
        ctx.lineTo(liveX, h)
        ctx.stroke()
        ctx.setLineDash([])
        
        ctx.fillStyle = "#ff6b6b"
        ctx.font = "bold 10px monospace"
        ctx.textAlign = "right"
        ctx.fillText("LIVE", liveX - 5, h - 5)
      }
    }
  }
  
  const drawScaleLabels = (ctx: CanvasRenderingContext2D, w: number, h: number, currentView: ViewState) => {
    ctx.fillStyle = "#06b6d4"
    ctx.font = "10px monospace"
    ctx.textAlign = "center"
    
    const timeStep = currentView.timeScale / 5
    for (let i = 0; i <= 5; i++) {
      const time = currentView.timeOffset + i * timeStep
      const x = (i / 5) * w
      ctx.fillText(formatTime(time), x, h - 5)
    }
    
    ctx.textAlign = "right"
    const voltStep = currentView.voltageScale / 4
    for (let i = 0; i <= 4; i++) {
      const voltage = (currentView.voltageScale / 2) - i * voltStep
      const y = (i / 4) * h
      ctx.fillText(`${voltage.toFixed(0)}µV`, w - 5, y + 4)
    }
  }
  
  const formatTime = (seconds: number): string => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m${Math.floor(seconds % 60)}s`
    return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`
  }

  // Control handlers
  const handleZoomTime = (direction: number) => {
    setView(prev => {
      const currentIdx = TIME_SCALES.findIndex(s => s.value === prev.timeScale)
      const newIdx = Math.max(0, Math.min(TIME_SCALES.length - 1, currentIdx + direction))
      return { ...prev, timeScale: TIME_SCALES[newIdx].value }
    })
  }
  
  const handleZoomVoltage = (direction: number) => {
    setView(prev => {
      const currentIdx = VOLTAGE_SCALES.findIndex(s => s.value === prev.voltageScale)
      const newIdx = Math.max(0, Math.min(VOLTAGE_SCALES.length - 1, currentIdx + direction))
      return { ...prev, voltageScale: VOLTAGE_SCALES[newIdx].value }
    })
  }
  
  const handlePan = (direction: "left" | "right") => {
    setIsLive(false)
    setView(prev => ({
      ...prev,
      timeOffset: Math.max(0, prev.timeOffset + (direction === "right" ? prev.timeScale / 5 : -prev.timeScale / 5))
    }))
  }
  
  const handleCatchUp = () => {
    setIsLive(true)
    setView(prev => ({
      ...prev,
      timeOffset: Math.max(0, timeRef.current - prev.timeScale)
    }))
  }
  
  const handleReset = () => {
    setView({ timeOffset: 0, timeScale: 10, voltageScale: 100, voltageOffset: 0 })
    setIsLive(true)
    setIsPaused(false)
    dataBufferRef.current = []
    spikesRef.current = []
    patternsRef.current = []
    timeRef.current = 0
    setStats({ spikeRate: 0, avgAmplitude: 0, detectedWords: 0 })
  }
  
  const toggleChannel = (idx: number) => {
    setChannels(prev => prev.map((ch, i) => i === idx ? { ...ch, enabled: !ch.enabled } : ch))
  }
  
  const exportData = () => {
    const data = { spikes: spikesRef.current, patterns: patternsRef.current, stats: statsRef.current, settings: view, exportTime: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `spike_train_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const timeScaleLabel = TIME_SCALES.find(s => s.value === view.timeScale)?.label || `${view.timeScale}s`
  const voltScaleLabel = VOLTAGE_SCALES.find(s => s.value === view.voltageScale)?.label || `${view.voltageScale}µV`

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-none flex items-center justify-between gap-2 px-1 py-1 border-b border-emerald-500/20">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsPaused(!isPaused)} className="h-6 w-6 p-0 text-emerald-400 hover:bg-emerald-500/10" title={isPaused ? "Resume" : "Pause"}>
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          
          {!isLive && (
            <Button variant="ghost" size="sm" onClick={handleCatchUp} className="h-6 px-2 text-xs text-orange-400 hover:bg-orange-500/10">
              <SkipForward className="h-3 w-3 mr-1" />Catch Up
            </Button>
          )}
          
          {isLive && (
            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1" />LIVE
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handlePan("left")} className="h-5 w-5 p-0 text-cyan-400 hover:bg-cyan-500/10" title="Pan Left">
            <ChevronLeft className="h-3 w-3" />
          </Button>
          
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" onClick={() => handleZoomTime(1)} className="h-5 w-5 p-0 text-cyan-400 hover:bg-cyan-500/10" title="Zoom Out (Time)">
              <ZoomOut className="h-2.5 w-2.5" />
            </Button>
            <span className="text-[9px] text-cyan-400 font-mono w-12 text-center">{timeScaleLabel}/div</span>
            <Button variant="ghost" size="icon" onClick={() => handleZoomTime(-1)} className="h-5 w-5 p-0 text-cyan-400 hover:bg-cyan-500/10" title="Zoom In (Time)">
              <ZoomIn className="h-2.5 w-2.5" />
            </Button>
          </div>
          
          <Button variant="ghost" size="icon" onClick={() => handlePan("right")} className="h-5 w-5 p-0 text-cyan-400 hover:bg-cyan-500/10" title="Pan Right">
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowPatterns(!showPatterns)} className={cn("h-5 w-5 p-0", showPatterns ? "text-purple-400" : "text-gray-500")} title="Toggle Pattern Overlay">
            <Layers className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowWordOverlay(!showWordOverlay)} className={cn("h-5 w-5 p-0", showWordOverlay ? "text-amber-400" : "text-gray-500")} title="Toggle Word Detection">
            <Zap className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={exportData} className="h-5 w-5 p-0 text-cyan-400 hover:bg-cyan-500/10" title="Export Data">
            <Download className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReset} className="h-5 w-5 p-0 text-cyan-400 hover:bg-cyan-500/10" title="Reset">
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div ref={containerRef} className="flex-1 relative rounded-lg overflow-hidden bg-[#050810] border border-emerald-500/20 min-h-0 min-w-0">
        <div className="absolute inset-0 pointer-events-none z-10" style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)` }} />
        
        <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="block" />
        
        <div className="absolute top-2 left-2 backdrop-blur-xl bg-black/60 border border-emerald-500/20 rounded-lg p-2 space-y-1">
          <div className="text-[9px] text-emerald-400 font-semibold">Statistics</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[8px]">
            <span className="text-gray-400">Spike Rate:</span>
            <span className="text-emerald-400 font-mono">{stats.spikeRate.toFixed(2)}/min</span>
            <span className="text-gray-400">Avg Amplitude:</span>
            <span className="text-emerald-400 font-mono">{stats.avgAmplitude.toFixed(1)}µV</span>
            <span className="text-gray-400">Words Detected:</span>
            <span className="text-purple-400 font-mono">{stats.detectedWords}</span>
          </div>
        </div>
        
        <div className="absolute top-2 right-2 flex flex-col items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleZoomVoltage(-1)} className="h-4 w-4 p-0 text-emerald-400/60 hover:text-emerald-400" title="Zoom In (Voltage)">
            <ChevronUp className="h-2.5 w-2.5" />
          </Button>
          <span className="text-[8px] text-emerald-400 font-mono">{voltScaleLabel}</span>
          <Button variant="ghost" size="icon" onClick={() => handleZoomVoltage(1)} className="h-4 w-4 p-0 text-emerald-400/60 hover:text-emerald-400" title="Zoom Out (Voltage)">
            <ChevronDown className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>
      
      <div className="flex-none flex items-center justify-between px-1 py-0.5">
        <div className="flex items-center gap-1">
          {channels.map((ch, idx) => (
            <button key={ch.id} onClick={() => toggleChannel(idx)} className="relative h-5 w-5 rounded-full transition-all hover:scale-110"
              style={{ backgroundColor: ch.enabled ? ch.color : "transparent", color: ch.enabled ? "#000" : ch.color, opacity: ch.enabled ? 1 : 0.4, border: `2px solid ${ch.color}`, boxShadow: ch.enabled ? `0 0 8px ${ch.color}` : "none" }}
              title={`${ch.name}: ${ch.enabled ? "On" : "Off"}`}>
              <span className="text-[8px] font-bold">{idx + 1}</span>
            </button>
          ))}
        </div>
        
        <a href="https://doi.org/10.1098/rsos.211926" target="_blank" rel="noopener noreferrer" className="text-[8px] text-emerald-400/50 hover:text-emerald-400">
          Adamatzky (2022) R. Soc. Open Sci.
        </a>
      </div>
    </div>
  )
}
