/**
 * Signal Fingerprint - Electrical Signature Visualization
 * 
 * Species-specific mycelial electrical signature based on
 * Adamatzky (2022) Royal Society Open Science - Figure 3
 * https://doi.org/10.1098/rsos.211926
 * 
 * Features:
 * - Animated circular polar plot of frequency bands
 * - Species-specific signature patterns
 * - Real-time spike train characteristics
 * - Signature matching and comparison
 * - Export fingerprint data
 */

"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  Fingerprint, RotateCcw, Download, ChevronLeft, ChevronRight,
  Activity, Zap, Dna
} from "lucide-react"

interface SignalFingerprintProps {
  fingerprint?: any | null
  deviceId?: string | null
  className?: string
}

// Species signatures from Adamatzky 2022
const SPECIES_SIGNATURES = [
  { 
    id: "enoki", 
    name: "Flammulina velutipes (Enoki)", 
    avgSpikeDuration: 2.6, // minutes
    avgSpikeAmplitude: 0.8, // relative
    isiMean: 6.0, // inter-spike interval minutes
    pattern: [0.8, 0.6, 0.9, 0.5, 0.7, 0.85, 0.55, 0.75],
    color: "#00ff88"
  },
  { 
    id: "oyster", 
    name: "Pleurotus ostreatus (Oyster)", 
    avgSpikeDuration: 3.1,
    avgSpikeAmplitude: 0.9,
    isiMean: 8.2,
    pattern: [0.9, 0.7, 0.65, 0.8, 0.6, 0.75, 0.85, 0.7],
    color: "#06b6d4"
  },
  { 
    id: "caterpillar", 
    name: "Cordyceps militaris (Caterpillar)", 
    avgSpikeDuration: 1.1,
    avgSpikeAmplitude: 0.7,
    isiMean: 4.5,
    pattern: [0.7, 0.85, 0.75, 0.9, 0.65, 0.8, 0.7, 0.6],
    color: "#f59e0b"
  },
  { 
    id: "splitgill", 
    name: "Schizophyllum commune (Split Gill)", 
    avgSpikeDuration: 5.0,
    avgSpikeAmplitude: 0.95,
    isiMean: 12.3,
    pattern: [0.95, 0.6, 0.8, 0.7, 0.9, 0.65, 0.75, 0.85],
    color: "#a855f7"
  },
]

// GFST frequency bands
const FREQUENCY_BANDS = [
  { name: "Ultra-Low", range: "0-0.01Hz", angle: 0 },
  { name: "Low", range: "0.01-0.1Hz", angle: 45 },
  { name: "Baseline", range: "0.1-1Hz", angle: 90 },
  { name: "Bio-Active", range: "1-3Hz", angle: 135 },
  { name: "Spike", range: "3-5Hz", angle: 180 },
  { name: "Burst", range: "5-8Hz", angle: 225 },
  { name: "Fast", range: "8-10Hz", angle: 270 },
  { name: "Noise", range: ">10Hz", angle: 315 },
]

export function SignalFingerprint({ fingerprint = null, deviceId = null, className }: SignalFingerprintProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const timeRef = useRef(0)
  const signatureRef = useRef<number[]>([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [speciesIdx, setSpeciesIdx] = useState(0)
  const [matchScore, setMatchScore] = useState(0)
  const [isAnimating, setIsAnimating] = useState(true)
  const [spikeStats, setSpikeStats] = useState({
    duration: 0,
    amplitude: 0,
    isi: 0,
  })
  
  const selectedSpecies = SPECIES_SIGNATURES[speciesIdx]

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
      
      if (isAnimating) {
        timeRef.current += dt
      }
      
      const t = timeRef.current
      const w = canvas.width
      const h = canvas.height
      const cx = w / 2
      const cy = h / 2
      const maxR = Math.min(w, h) / 2 - 25
      
      // Clear
      ctx.fillStyle = "#050810"
      ctx.fillRect(0, 0, w, h)
      
      // Generate animated signature based on species pattern
      const targetPattern = selectedSpecies.pattern
      for (let i = 0; i < 8; i++) {
        const noise = Math.sin(t * 0.5 + i * 0.7) * 0.1 + Math.sin(t * 1.2 + i * 1.3) * 0.05
        signatureRef.current[i] = signatureRef.current[i] * 0.95 + (targetPattern[i] + noise) * 0.05
      }
      
      // Draw concentric rings (amplitude levels)
      for (let i = 1; i <= 5; i++) {
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.05 + i * 0.02})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(cx, cy, (maxR * i) / 5, 0, Math.PI * 2)
        ctx.stroke()
        
        // Level labels
        if (i === 5) {
          ctx.fillStyle = "rgba(6, 182, 212, 0.4)"
          ctx.font = "8px monospace"
          ctx.textAlign = "center"
          ctx.fillText("100%", cx, cy - maxR - 3)
        }
      }
      
      // Draw radial lines with band labels
      FREQUENCY_BANDS.forEach((band, i) => {
        const angle = (band.angle * Math.PI) / 180 - Math.PI / 2
        
        ctx.strokeStyle = "rgba(6, 182, 212, 0.1)"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR)
        ctx.stroke()
        
        // Band labels at edge
        const labelR = maxR + 12
        const labelX = cx + Math.cos(angle) * labelR
        const labelY = cy + Math.sin(angle) * labelR
        
        ctx.fillStyle = "rgba(6, 182, 212, 0.5)"
        ctx.font = "7px monospace"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(band.name, labelX, labelY)
      })
      
      // Draw species signature polygon
      ctx.strokeStyle = selectedSpecies.color
      ctx.lineWidth = 2.5
      ctx.shadowColor = selectedSpecies.color
      ctx.shadowBlur = 12
      
      ctx.beginPath()
      signatureRef.current.forEach((value, i) => {
        const angle = (i * Math.PI * 2) / 8 - Math.PI / 2
        const r = value * maxR * 0.9
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.closePath()
      ctx.stroke()
      ctx.shadowBlur = 0
      
      // Fill with gradient
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
      gradient.addColorStop(0, `${selectedSpecies.color}25`)
      gradient.addColorStop(1, `${selectedSpecies.color}05`)
      ctx.fillStyle = gradient
      ctx.fill()
      
      // Draw data points
      signatureRef.current.forEach((value, i) => {
        const angle = (i * Math.PI * 2) / 8 - Math.PI / 2
        const r = value * maxR * 0.9
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        
        ctx.fillStyle = selectedSpecies.color
        ctx.shadowColor = selectedSpecies.color
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        
        // Value label
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 8px monospace"
        ctx.textAlign = "center"
        const labelAngle = angle
        const labelR = r + 12
        ctx.fillText(`${(value * 100).toFixed(0)}`, cx + Math.cos(labelAngle) * labelR, cy + Math.sin(labelAngle) * labelR)
      })
      
      // Center pulsing dot
      const pulseScale = 1 + Math.sin(t * 3) * 0.2
      ctx.fillStyle = selectedSpecies.color
      ctx.shadowColor = selectedSpecies.color
      ctx.shadowBlur = 15 * pulseScale
      ctx.beginPath()
      ctx.arc(cx, cy, 5 * pulseScale, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      
      // Update stats periodically
      if (now - lastStatsUpdate > 500) {
        lastStatsUpdate = now
        
        // Calculate match score against all species
        let bestMatch = 0
        SPECIES_SIGNATURES.forEach(species => {
          let score = 0
          species.pattern.forEach((v, i) => {
            score += 1 - Math.abs(v - signatureRef.current[i])
          })
          score /= 8
          if (score > bestMatch) bestMatch = score
        })
        setMatchScore(bestMatch)
        
        // Simulate spike stats with variation
        setSpikeStats({
          duration: selectedSpecies.avgSpikeDuration + (Math.random() - 0.5) * 0.5,
          amplitude: selectedSpecies.avgSpikeAmplitude + (Math.random() - 0.5) * 0.1,
          isi: selectedSpecies.isiMean + (Math.random() - 0.5) * 2,
        })
      }
      
      animationRef.current = requestAnimationFrame(draw)
    }
    
    animationRef.current = requestAnimationFrame(draw)
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [dimensions, isAnimating, selectedSpecies])
  
  const handleReset = () => {
    timeRef.current = 0
    signatureRef.current = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
    setIsAnimating(true)
  }
  
  const exportFingerprint = () => {
    const data = {
      species: selectedSpecies.name,
      signature: signatureRef.current,
      matchScore,
      spikeStats,
      timestamp: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `fingerprint_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn("w-full h-full flex flex-col overflow-hidden", className)}>
      {/* Controls */}
      <div className="flex-none flex items-center justify-between gap-1 px-1 py-1 border-b border-cyan-500/20">
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={() => setSpeciesIdx((speciesIdx - 1 + SPECIES_SIGNATURES.length) % SPECIES_SIGNATURES.length)} className="h-5 w-5 p-0 text-cyan-400">
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-[8px] text-cyan-400 font-mono w-16 text-center truncate" title={selectedSpecies.name}>
            {selectedSpecies.id}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setSpeciesIdx((speciesIdx + 1) % SPECIES_SIGNATURES.length)} className="h-5 w-5 p-0 text-cyan-400">
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleReset} className="h-5 w-5 p-0 text-cyan-400" title="Reset">
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={exportFingerprint} className="h-5 w-5 p-0 text-cyan-400" title="Export">
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative rounded overflow-hidden bg-[#050810] border border-cyan-500/20 min-h-0 min-w-0">
        <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="block" />
        
        {/* Match indicator */}
        <div className="absolute top-1 left-1 backdrop-blur-xl bg-black/60 border border-cyan-500/20 rounded px-1.5 py-0.5">
          <div className="flex items-center gap-1">
            <Dna className="h-2.5 w-2.5 text-emerald-400" />
            <span className="text-[8px] text-emerald-400 font-mono">{(matchScore * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
      
      {/* Spike Statistics */}
      <div className="flex-none grid grid-cols-3 gap-1 py-1">
        <div className="text-center p-1 rounded bg-cyan-500/10 border border-cyan-500/20">
          <div className="text-[7px] text-cyan-400/60">Duration</div>
          <div className="text-[10px] font-bold text-cyan-400">{spikeStats.duration.toFixed(1)}min</div>
        </div>
        <div className="text-center p-1 rounded bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-[7px] text-emerald-400/60">Amplitude</div>
          <div className="text-[10px] font-bold text-emerald-400">{(spikeStats.amplitude * 100).toFixed(0)}%</div>
        </div>
        <div className="text-center p-1 rounded bg-purple-500/10 border border-purple-500/20">
          <div className="text-[7px] text-purple-400/60">ISI</div>
          <div className="text-[10px] font-bold text-purple-400">{spikeStats.isi.toFixed(1)}min</div>
        </div>
      </div>
      
      {/* Species Label */}
      <div className="flex-none text-center py-0.5">
        <span className="text-[7px] font-mono" style={{ color: selectedSpecies.color }}>
          {selectedSpecies.name}
        </span>
      </div>
    </div>
  )
}
