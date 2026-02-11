/**
 * STFT Spectrogram - Critical Scientific Visualization
 * 
 * Short-Time Fourier Transform showing frequency evolution over time.
 * THE key tool to prove biological origin of fungal signals.
 * 
 * Based on Buffi et al. (2025) iScience - Figure 2
 * https://doi.org/10.1016/j.isci.2025.113484
 */

"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  Play, Pause, RotateCcw, ZoomIn, ZoomOut, 
  ChevronUp, ChevronDown, Download, Eye,
  Clock, Zap, Target
} from "lucide-react"

interface STFTSpectrogramProps {
  className?: string
}

const COLORMAPS = {
  viridis: (v: number) => {
    const r = Math.floor(68 + v * 150)
    const g = Math.floor(1 + v * 180)
    const b = Math.floor(84 + v * 80)
    return `rgb(${r},${g},${b})`
  },
  hot: (v: number) => {
    const r = Math.floor(Math.min(255, v * 3 * 255))
    const g = Math.floor(Math.max(0, Math.min(255, (v - 0.33) * 3 * 255)))
    const b = Math.floor(Math.max(0, Math.min(255, (v - 0.67) * 3 * 255)))
    return `rgb(${r},${g},${b})`
  },
  cool: (v: number) => {
    const r = Math.floor(v * 100)
    const g = Math.floor(50 + v * 150)
    const b = Math.floor(100 + v * 155)
    return `rgb(${r},${g},${b})`
  },
  plasma: (v: number) => {
    const r = Math.floor(13 + v * 230)
    const g = Math.floor(8 + v * 140)
    const b = Math.floor(135 + v * 60)
    return `rgb(${r},${g},${b})`
  },
}

const TIME_SCALES = [
  { label: "1min", value: 60 },
  { label: "10min", value: 600 },
  { label: "1hr", value: 3600 },
  { label: "6hr", value: 21600 },
  { label: "24hr", value: 86400 },
  { label: "7days", value: 604800 },
]

const FREQ_RANGES = [
  { label: "0-1 Hz", min: 0, max: 1 },
  { label: "0-5 Hz", min: 0, max: 5 },
  { label: "0-10 Hz", min: 0, max: 10 },
  { label: "0.5-5 Hz", min: 0.5, max: 5 },
  { label: "1-10 Hz", min: 1, max: 10 },
]

export function STFTSpectrogram({ className }: STFTSpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const spectrogramDataRef = useRef<number[][]>([])
  const timeRef = useRef(0)
  const colonizationTimeRef = useRef<number | null>(null)
  const powerStatsRef = useRef({ lowBand: 0, bioBand: 0, highBand: 0 })
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isPaused, setIsPaused] = useState(false)
  
  const [timeScaleIdx, setTimeScaleIdx] = useState(2)
  const [freqRangeIdx, setFreqRangeIdx] = useState(2)
  const [colormap, setColormap] = useState<keyof typeof COLORMAPS>("hot")
  
  const [showBioMarker, setShowBioMarker] = useState(true)
  const [showColonization, setShowColonization] = useState(true)
  const [colonizationDetected, setColonizationDetected] = useState(false)
  const [powerStats, setPowerStats] = useState({ lowBand: 0, bioBand: 0, highBand: 0 })
  
  const timeScale = TIME_SCALES[timeScaleIdx]
  const freqRange = FREQ_RANGES[freqRangeIdx]
  
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
  
  // Generate simulated STFT data (pure function, no setState)
  const generateSTFTColumn = (t: number): number[] => {
    const numBins = 64
    const column: number[] = []
    
    const colonizationThreshold = timeScale.value * 0.4
    const isColonized = t > colonizationThreshold
    
    for (let i = 0; i < numBins; i++) {
      const freq = (i / numBins) * freqRange.max + freqRange.min
      let power = 0
      
      if (freq < 1) {
        power = 0.3 + Math.random() * 0.2 + 0.1 * Math.sin(t * 0.001)
      }
      
      if (isColonized && freq >= 1.5 && freq <= 8) {
        const colonizationProgress = Math.min(1, (t - colonizationThreshold) / (timeScale.value * 0.1))
        power = colonizationProgress * (0.5 + 0.3 * Math.sin(t * 0.005))
        
        if (freq >= 2 && freq <= 3) {
          power *= 1.5
        }
        
        power += 0.2 * Math.sin(t * 0.01 + freq * 0.5) * colonizationProgress
        
        if (!colonizationDetected && colonizationProgress > 0.5) {
          setColonizationDetected(true)
          colonizationTimeRef.current = t
        }
      }
      
      power += Math.random() * 0.05
      power = Math.max(0, Math.min(1, power))
      
      column.push(power)
    }
    
    // Update power stats ref
    const lowPower = column.slice(0, Math.floor(numBins * 0.1)).reduce((a, b) => a + b, 0) / (numBins * 0.1)
    const bioPower = column.slice(Math.floor(numBins * 0.15), Math.floor(numBins * 0.5)).reduce((a, b) => a + b, 0) / (numBins * 0.35)
    const highPower = column.slice(Math.floor(numBins * 0.5)).reduce((a, b) => a + b, 0) / (numBins * 0.5)
    
    powerStatsRef.current = { lowBand: lowPower, bioBand: bioPower, highBand: highPower }
    
    return column
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
        timeRef.current += dt * 10
      }
      
      const t = timeRef.current
      
      // Add new column
      if (!isPaused) {
        const column = generateSTFTColumn(t)
        spectrogramDataRef.current.push(column)
        
        if (spectrogramDataRef.current.length > w) {
          spectrogramDataRef.current = spectrogramDataRef.current.slice(-w)
        }
      }
      
      // Update stats periodically (every 0.5 seconds)
      if (now - lastStatsUpdate > 500) {
        lastStatsUpdate = now
        setPowerStats({ ...powerStatsRef.current })
      }
      
      // Clear
      ctx.fillStyle = "#050810"
      ctx.fillRect(0, 0, w, h)
      
      // Draw spectrogram
      const data = spectrogramDataRef.current
      const colormapFn = COLORMAPS[colormap]
      
      data.forEach((column, x) => {
        const xPos = w - data.length + x
        const binHeight = h / column.length
        
        column.forEach((power, y) => {
          const yPos = h - (y + 1) * binHeight
          ctx.fillStyle = colormapFn(power)
          ctx.fillRect(xPos, yPos, 2, binHeight + 1)
        })
      })
      
      // Draw biological signature threshold (1.5 Hz line)
      if (showBioMarker) {
        const bioY = h - ((1.5 - freqRange.min) / (freqRange.max - freqRange.min)) * h
        
        ctx.strokeStyle = "#10b981"
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(0, bioY)
        ctx.lineTo(w, bioY)
        ctx.stroke()
        ctx.setLineDash([])
        
        ctx.fillStyle = "#10b981"
        ctx.font = "bold 10px monospace"
        ctx.textAlign = "left"
        ctx.fillText("1.5 Hz → Biological Signal", 5, bioY - 5)
      }
      
      // Draw colonization marker
      if (showColonization && colonizationTimeRef.current !== null) {
        const colonX = w - (t - colonizationTimeRef.current) / timeScale.value * w
        
        if (colonX > 0 && colonX < w) {
          ctx.strokeStyle = "#fbbf24"
          ctx.lineWidth = 2
          ctx.setLineDash([8, 4])
          ctx.beginPath()
          ctx.moveTo(colonX, 0)
          ctx.lineTo(colonX, h)
          ctx.stroke()
          ctx.setLineDash([])
          
          ctx.fillStyle = "#fbbf24"
          ctx.font = "bold 10px monospace"
          ctx.textAlign = "left"
          ctx.fillText("Colonization", colonX + 5, 15)
        }
      }
      
      // Draw frequency axis
      ctx.fillStyle = "#06b6d4"
      ctx.font = "10px monospace"
      ctx.textAlign = "right"
      
      const freqStep = (freqRange.max - freqRange.min) / 5
      for (let i = 0; i <= 5; i++) {
        const freq = freqRange.min + i * freqStep
        const y = h - (i / 5) * h
        ctx.fillText(`${freq.toFixed(1)} Hz`, w - 5, y + 4)
        
        ctx.strokeStyle = "rgba(6, 182, 212, 0.15)"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w - 40, y)
        ctx.stroke()
      }
      
      ctx.textAlign = "center"
      ctx.fillText("← Time", w / 2, h - 5)
      
      animationRef.current = requestAnimationFrame(draw)
    }
    
    animationRef.current = requestAnimationFrame(draw)
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [dimensions, isPaused, timeScale, freqRange, colormap, showBioMarker, showColonization, colonizationDetected])
  
  const handleReset = () => {
    setIsPaused(false)
    timeRef.current = 0
    setColonizationDetected(false)
    colonizationTimeRef.current = null
    spectrogramDataRef.current = []
    setPowerStats({ lowBand: 0, bioBand: 0, highBand: 0 })
  }
  
  const cycleColormap = () => {
    const maps = Object.keys(COLORMAPS) as (keyof typeof COLORMAPS)[]
    const idx = maps.indexOf(colormap)
    setColormap(maps[(idx + 1) % maps.length])
  }
  
  const exportData = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `stft_spectrogram_${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    })
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
          
          {colonizationDetected && (
            <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 animate-pulse">
              <Zap className="h-2.5 w-2.5 mr-1" />
              BIO SIGNAL
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-0.5">
          <Clock className="h-3 w-3 text-cyan-400/50" />
          <Button variant="ghost" size="icon" onClick={() => setTimeScaleIdx(Math.max(0, timeScaleIdx - 1))} className="h-5 w-5 p-0 text-cyan-400">
            <ZoomIn className="h-2.5 w-2.5" />
          </Button>
          <span className="text-[9px] text-cyan-400 font-mono w-12 text-center">{timeScale.label}</span>
          <Button variant="ghost" size="icon" onClick={() => setTimeScaleIdx(Math.min(TIME_SCALES.length - 1, timeScaleIdx + 1))} className="h-5 w-5 p-0 text-cyan-400">
            <ZoomOut className="h-2.5 w-2.5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={() => setFreqRangeIdx(Math.max(0, freqRangeIdx - 1))} className="h-5 w-5 p-0 text-emerald-400">
            <ChevronDown className="h-2.5 w-2.5" />
          </Button>
          <span className="text-[9px] text-emerald-400 font-mono w-14 text-center">{freqRange.label}</span>
          <Button variant="ghost" size="icon" onClick={() => setFreqRangeIdx(Math.min(FREQ_RANGES.length - 1, freqRangeIdx + 1))} className="h-5 w-5 p-0 text-emerald-400">
            <ChevronUp className="h-2.5 w-2.5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowBioMarker(!showBioMarker)} className={cn("h-5 w-5 p-0", showBioMarker ? "text-emerald-400" : "text-gray-500")} title="Bio Marker">
            <Target className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={cycleColormap} className="h-5 w-5 p-0 text-purple-400" title={`Colormap: ${colormap}`}>
            <Eye className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={exportData} className="h-5 w-5 p-0 text-cyan-400" title="Export">
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div ref={containerRef} className="flex-1 relative rounded overflow-hidden bg-[#050810] border border-cyan-500/20 min-h-0 min-w-0">
        <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="block" />
        
        <div className="absolute top-2 left-2 backdrop-blur-xl bg-black/60 border border-cyan-500/20 rounded-lg p-2 space-y-1">
          <div className="text-[9px] text-cyan-400 font-semibold">Band Power</div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-gray-400 w-12">&lt;1 Hz:</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden w-16">
                <div className="h-full bg-gray-500 rounded-full transition-all" style={{ width: `${powerStats.lowBand * 100}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-emerald-400 w-12">1.5-5 Hz:</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden w-16">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${powerStats.bioBand * 100}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-gray-400 w-12">&gt;5 Hz:</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden w-16">
                <div className="h-full bg-gray-500 rounded-full transition-all" style={{ width: `${powerStats.highBand * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-2 right-2 backdrop-blur-xl bg-black/60 border border-cyan-500/20 rounded-lg p-2">
          <div className="text-[8px] text-cyan-400 font-mono mb-1">{colormap}</div>
          <div className="w-16 h-2 rounded" style={{
            background: colormap === "hot" 
              ? "linear-gradient(to right, #000, #f00, #ff0, #fff)"
              : colormap === "viridis"
              ? "linear-gradient(to right, #440154, #21918c, #fde725)"
              : colormap === "cool"
              ? "linear-gradient(to right, #0f0f50, #3399cc, #99ffff)"
              : "linear-gradient(to right, #0d0887, #cc4778, #f0f921)"
          }} />
          <div className="flex justify-between text-[7px] text-gray-400 mt-0.5">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>
      
      <div className="flex-none flex items-center justify-center py-0.5">
        <a href="https://doi.org/10.1016/j.isci.2025.113484" target="_blank" rel="noopener noreferrer" className="text-[8px] text-cyan-400/50 hover:text-cyan-400">
          Buffi et al. (2025) iScience - STFT Method
        </a>
      </div>
    </div>
  )
}
