/**
 * Spectrum Analyzer - FFT Frequency Analysis
 * 
 * Real-time FFT visualization with GFST frequency band markers.
 * Designed for fungal electrophysiology signal analysis.
 */

"use client"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SignalBuffer } from "@/lib/fungi-compute"
import { 
  BarChart3, Waves, Play, Pause, RotateCcw,
  ZoomIn, ZoomOut, Download,
  Activity, Target
} from "lucide-react"

interface SpectrumAnalyzerProps {
  className?: string
  signalBuffer?: SignalBuffer[]
}

const GFST_BANDS = [
  { name: "Ultra-Low", range: [0, 0.1], color: "#94a3b8", description: "Week-long rhythms" },
  { name: "Baseline", range: [0.1, 1], color: "#22c55e", description: "Circadian/baseline" },
  { name: "Bio-Active", range: [1, 5], color: "#3b82f6", description: "Biological activity" },
  { name: "Spike", range: [5, 10], color: "#f59e0b", description: "Fast spiking" },
  { name: "Noise", range: [10, 50], color: "#ef4444", description: "Likely artifacts" },
]

const FREQ_RANGES = [
  { label: "0-5 Hz", max: 5 },
  { label: "0-10 Hz", max: 10 },
  { label: "0-25 Hz", max: 25 },
  { label: "0-50 Hz", max: 50 },
]

export function SpectrumAnalyzer({ className, signalBuffer = [] }: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const waterfallRef = useRef<number[][]>([])
  const timeRef = useRef(0)
  const statsRef = useRef({ dominantFreq: 0, totalPower: 0, snr: 0 })
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isPaused, setIsPaused] = useState(false)
  const [mode, setMode] = useState<"bars" | "waterfall">("bars")
  const [freqRangeIdx, setFreqRangeIdx] = useState(1)
  const [showPeaks, setShowPeaks] = useState(true)
  const [useLogScale, setUseLogScale] = useState(false)
  
  const [peaks, setPeaks] = useState<{ freq: number; mag: number }[]>([])
  const [stats, setStats] = useState({ dominantFreq: 0, totalPower: 0, snr: 0 })
  
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

  const computeSpectrum = (samples: number[], sampleRate: number) => {
    const windowSamples = samples.slice(-256)
    const n = windowSamples.length
    if (n < 16) return { frequencies: [], magnitudes: [], detectedPeaks: [] as { freq: number; mag: number }[] }

    const frequencies: number[] = []
    const magnitudes: number[] = []
    const half = Math.floor(n / 2)

    for (let k = 0; k < half; k++) {
      const freq = (k * sampleRate) / n
      if (freq > freqRange.max) break
      let real = 0
      let imag = 0
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * k * i) / n
        real += windowSamples[i] * Math.cos(angle)
        imag -= windowSamples[i] * Math.sin(angle)
      }
      frequencies.push(freq)
      magnitudes.push(Math.sqrt(real * real + imag * imag) / n)
    }

    const detectedPeaks: { freq: number; mag: number }[] = []
    for (let i = 2; i < magnitudes.length - 2; i++) {
      if (
        magnitudes[i] > magnitudes[i - 1] &&
        magnitudes[i] > magnitudes[i - 2] &&
        magnitudes[i] > magnitudes[i + 1] &&
        magnitudes[i] > magnitudes[i + 2]
      ) {
        detectedPeaks.push({ freq: frequencies[i], mag: magnitudes[i] })
      }
    }
    detectedPeaks.sort((a, b) => b.mag - a.mag)

    const totalPower = magnitudes.reduce((acc, value) => acc + value * value, 0)
    const maxIdx = magnitudes.length > 0 ? magnitudes.indexOf(Math.max(...magnitudes)) : 0
    const noisePower = magnitudes.slice(-Math.max(1, Math.floor(magnitudes.length * 0.2))).reduce((acc, value) => acc + value * value, 0)
    const signalPower = Math.max(totalPower - noisePower, 0)
    statsRef.current = {
      dominantFreq: frequencies[maxIdx] || 0,
      totalPower,
      snr: noisePower > 0 ? 10 * Math.log10(signalPower / noisePower) : 0,
    }

    return { frequencies, magnitudes, detectedPeaks: detectedPeaks.slice(0, 5) }
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
      
      // Clear
      ctx.fillStyle = "#050810"
      ctx.fillRect(0, 0, w, h)
      
      const primaryBuffer = signalBuffer[0]
      const sampleRate = primaryBuffer?.sampleRate || 100
      const samples = primaryBuffer?.samples || []
      const { frequencies, magnitudes, detectedPeaks } = computeSpectrum(samples, sampleRate)
      
      // Update stats and peaks periodically
      if (now - lastStatsUpdate > 300) {
        lastStatsUpdate = now
        setStats({ ...statsRef.current })
        setPeaks(detectedPeaks)
      }
      
      // Add to waterfall history
      if (!isPaused && mode === "waterfall" && magnitudes.length > 0) {
        waterfallRef.current.unshift([...magnitudes])
        if (waterfallRef.current.length > h) {
          waterfallRef.current = waterfallRef.current.slice(0, h)
        }
      }
      
      if (mode === "bars") {
        drawBarSpectrum(ctx, frequencies, magnitudes, w, h)
      } else {
        drawWaterfallSpectrum(ctx, waterfallRef.current, frequencies, w, h)
      }
      
      drawBandMarkers(ctx, frequencies, w, h)
      
      if (showPeaks && mode === "bars") {
        drawPeakMarkers(ctx, frequencies, magnitudes, detectedPeaks, w, h)
      }
      
      drawFrequencyAxis(ctx, w, h)
      
      animationRef.current = requestAnimationFrame(draw)
    }
    
    animationRef.current = requestAnimationFrame(draw)
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [dimensions, isPaused, mode, freqRange, showPeaks, useLogScale, signalBuffer])

  // Drawing functions
  const drawBarSpectrum = (ctx: CanvasRenderingContext2D, frequencies: number[], magnitudes: number[], w: number, h: number) => {
    const barWidth = w / magnitudes.length
    const maxMag = Math.max(...magnitudes, 0.1)
    const plotHeight = h - 30
    
    magnitudes.forEach((mag, i) => {
      const x = i * barWidth
      const scaledMag = useLogScale ? Math.log10(1 + mag * 10) / Math.log10(11) : mag / maxMag
      const barHeight = scaledMag * plotHeight
      const freq = frequencies[i]
      
      const band = GFST_BANDS.find(b => freq >= b.range[0] && freq < b.range[1])
      const color = band?.color || "#06b6d4"
      
      const gradient = ctx.createLinearGradient(x, h - 25, x, h - 25 - barHeight)
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, `${color}30`)
      
      ctx.fillStyle = gradient
      ctx.fillRect(x, h - 25 - barHeight, barWidth - 1, barHeight)
      
      ctx.shadowColor = color
      ctx.shadowBlur = 4
      ctx.fillRect(x, h - 25 - barHeight, barWidth - 1, 3)
      ctx.shadowBlur = 0
    })
  }
  
  const drawWaterfallSpectrum = (ctx: CanvasRenderingContext2D, history: number[][], frequencies: number[], w: number, h: number) => {
    const plotHeight = h - 30
    const rowHeight = Math.max(1, plotHeight / history.length)
    
    history.forEach((row, rowIdx) => {
      const y = rowIdx * rowHeight
      const maxMag = Math.max(...row, 0.1)
      
      row.forEach((mag, binIdx) => {
        const x = (binIdx / row.length) * w
        const binWidth = w / row.length + 1
        const intensity = useLogScale ? Math.log10(1 + mag * 10) / Math.log10(11) : mag / maxMag
        const freq = frequencies[binIdx] || 0
        
        const band = GFST_BANDS.find(b => freq >= b.range[0] && freq < b.range[1])
        const color = band?.color || "#06b6d4"
        
        const r = parseInt(color.slice(1, 3), 16)
        const g = parseInt(color.slice(3, 5), 16)
        const b = parseInt(color.slice(5, 7), 16)
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${intensity * 0.9})`
        ctx.fillRect(x, y, binWidth, rowHeight + 1)
      })
    })
  }
  
  const drawBandMarkers = (ctx: CanvasRenderingContext2D, frequencies: number[], w: number, h: number) => {
    const maxFreq = Math.max(...frequencies, freqRange.max)
    const plotHeight = h - 30
    
    GFST_BANDS.forEach(band => {
      if (band.range[0] > freqRange.max) return
      
      const x1 = (band.range[0] / maxFreq) * w
      const x2 = Math.min((band.range[1] / maxFreq) * w, w)
      
      ctx.fillStyle = `${band.color}08`
      ctx.fillRect(x1, 0, x2 - x1, plotHeight)
      
      if (x2 - x1 > 30) {
        ctx.fillStyle = `${band.color}80`
        ctx.font = "8px monospace"
        ctx.textAlign = "center"
        ctx.fillText(band.name, (x1 + x2) / 2, 10)
      }
    })
  }
  
  const drawPeakMarkers = (ctx: CanvasRenderingContext2D, frequencies: number[], magnitudes: number[], detectedPeaks: { freq: number; mag: number }[], w: number, h: number) => {
    const maxFreq = Math.max(...frequencies, freqRange.max)
    const maxMag = Math.max(...magnitudes, 0.1)
    const plotHeight = h - 30
    
    detectedPeaks.slice(0, 3).forEach((peak, i) => {
      const x = (peak.freq / maxFreq) * w
      const y = h - 25 - (peak.mag / maxMag) * plotHeight
      
      ctx.fillStyle = i === 0 ? "#fbbf24" : "#f97316"
      ctx.beginPath()
      ctx.moveTo(x, y - 8)
      ctx.lineTo(x - 4, y)
      ctx.lineTo(x + 4, y)
      ctx.closePath()
      ctx.fill()
      
      ctx.font = "9px monospace"
      ctx.textAlign = "center"
      ctx.fillText(`${peak.freq.toFixed(2)}Hz`, x, y - 12)
    })
  }
  
  const drawFrequencyAxis = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = "#06b6d4"
    ctx.font = "10px monospace"
    ctx.textAlign = "center"
    
    const maxFreq = freqRange.max
    const numLabels = 5
    
    for (let i = 0; i <= numLabels; i++) {
      const freq = (i / numLabels) * maxFreq
      const x = (i / numLabels) * w
      ctx.fillText(`${freq.toFixed(0)}Hz`, x, h - 5)
    }
  }

  const handleReset = () => {
    setIsPaused(false)
    timeRef.current = 0
    waterfallRef.current = []
    setPeaks([])
    setStats({ dominantFreq: 0, totalPower: 0, snr: 0 })
  }
  
  const exportData = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `spectrum_${Date.now()}.png`
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
        </div>
        
        <div className="flex items-center gap-1">
          <button onClick={() => setMode("bars")} className={cn("px-2 h-5 rounded text-[9px] font-medium transition-all", mode === "bars" ? "bg-cyan-500/30 text-cyan-400 border border-cyan-500/60" : "text-cyan-400/50 hover:text-cyan-400")}>
            <BarChart3 className="h-2.5 w-2.5 inline mr-1" />Bars
          </button>
          <button onClick={() => setMode("waterfall")} className={cn("px-2 h-5 rounded text-[9px] font-medium transition-all", mode === "waterfall" ? "bg-cyan-500/30 text-cyan-400 border border-cyan-500/60" : "text-cyan-400/50 hover:text-cyan-400")}>
            <Waves className="h-2.5 w-2.5 inline mr-1" />Fall
          </button>
        </div>
        
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={() => setFreqRangeIdx(Math.max(0, freqRangeIdx - 1))} className="h-5 w-5 p-0 text-cyan-400">
            <ZoomIn className="h-2.5 w-2.5" />
          </Button>
          <span className="text-[9px] text-cyan-400 font-mono w-12 text-center">{freqRange.label}</span>
          <Button variant="ghost" size="icon" onClick={() => setFreqRangeIdx(Math.min(FREQ_RANGES.length - 1, freqRangeIdx + 1))} className="h-5 w-5 p-0 text-cyan-400">
            <ZoomOut className="h-2.5 w-2.5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowPeaks(!showPeaks)} className={cn("h-5 w-5 p-0", showPeaks ? "text-amber-400" : "text-gray-500")} title="Peak Detection">
            <Target className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setUseLogScale(!useLogScale)} className={cn("h-5 w-5 p-0", useLogScale ? "text-purple-400" : "text-gray-500")} title="Log Scale">
            <Activity className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={exportData} className="h-5 w-5 p-0 text-cyan-400" title="Export">
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div ref={containerRef} className="flex-1 relative rounded overflow-hidden bg-[#050810] border border-cyan-500/20 min-h-0 min-w-0">
        <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="block" />
        
        <div className="absolute top-2 right-2 backdrop-blur-xl bg-black/60 border border-cyan-500/20 rounded-lg p-1.5 space-y-0.5">
          <div className="text-[8px] text-cyan-400 font-mono">Peak: {stats.dominantFreq.toFixed(2)} Hz</div>
          <div className="text-[8px] text-emerald-400 font-mono">Power: {stats.totalPower.toFixed(1)} µV²</div>
          <div className="text-[8px] text-amber-400 font-mono">SNR: {stats.snr.toFixed(1)} dB</div>
        </div>
        
        <div className="absolute bottom-8 left-2 flex flex-wrap gap-1.5">
          {GFST_BANDS.filter(b => b.range[0] < freqRange.max).map(band => (
            <div key={band.name} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: band.color }} />
              <span className="text-[8px] text-gray-400">{band.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SpectrumAnalyzer
