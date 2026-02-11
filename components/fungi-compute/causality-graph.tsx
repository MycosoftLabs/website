/**
 * Causality Graph - Transfer Entropy Network
 * 
 * Visualizes directional information flow between electrodes using
 * Transfer Entropy / Granger Causality analysis.
 * 
 * Based on Fukasawa et al. (2024) Scientific Reports
 * https://doi.org/10.1038/s41598-024-66223-6
 */

"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  Play, Pause, RotateCcw, Download, 
  ChevronLeft, ChevronRight, Zap
} from "lucide-react"

interface CausalityGraphProps {
  className?: string
}

const ELECTRODE_LAYOUT = [
  { id: "E0", label: "E0", angle: 0 },
  { id: "E1", label: "E1", angle: 60 },
  { id: "E2", label: "E2", angle: 120 },
  { id: "E3", label: "E3", angle: 180 },
  { id: "E4", label: "E4", angle: 240 },
  { id: "E5", label: "E5", angle: 300 },
]

const TIME_DELAYS = [1, 6, 12, 24, 48, 72, 168]

export function CausalityGraph({ className }: CausalityGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const timeRef = useRef(0)
  const causalityRef = useRef<{ matrix: number[][]; flows: { from: string; to: string; strength: number }[]; pacemaker: string }>({
    matrix: [],
    flows: [],
    pacemaker: "E4"
  })
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isPaused, setIsPaused] = useState(false)
  const [timeDelayIdx, setTimeDelayIdx] = useState(3)
  const [pacemaker, setPacemaker] = useState("E4")
  const [flowCount, setFlowCount] = useState(0)
  
  const timeDelay = TIME_DELAYS[timeDelayIdx]

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

  // Generate causality data (pure function, no setState)
  const generateCausality = (t: number) => {
    const n = ELECTRODE_LAYOUT.length
    const matrix: number[][] = []
    const flows: { from: string; to: string; strength: number }[] = []
    const pacemakerIdx = 4
    
    for (let i = 0; i < n; i++) {
      const row: number[] = []
      for (let j = 0; j < n; j++) {
        if (i === j) {
          row.push(0)
          continue
        }
        
        let ete = 0
        
        if (i === pacemakerIdx) {
          ete = 0.5 + Math.random() * 0.4 + 0.1 * Math.sin(t * 0.1 + j)
          flows.push({ from: ELECTRODE_LAYOUT[i].id, to: ELECTRODE_LAYOUT[j].id, strength: ete })
        } else if (Math.abs(i - j) === 1 || (i === 0 && j === n-1) || (j === 0 && i === n-1)) {
          ete = 0.1 + Math.random() * 0.2 + 0.05 * Math.sin(t * 0.2 + i)
          if (ete > 0.2) {
            flows.push({ from: ELECTRODE_LAYOUT[i].id, to: ELECTRODE_LAYOUT[j].id, strength: ete })
          }
        } else {
          ete = Math.random() * 0.1
        }
        
        row.push(ete)
      }
      matrix.push(row)
    }
    
    let maxOutgoing = 0
    let maxIdx = 0
    matrix.forEach((row, i) => {
      const sum = row.reduce((a, b) => a + b, 0)
      if (sum > maxOutgoing) {
        maxOutgoing = sum
        maxIdx = i
      }
    })
    
    return {
      matrix,
      flows: flows.filter(f => f.strength > 0.15),
      pacemaker: ELECTRODE_LAYOUT[maxIdx].id
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
    let lastCausalityUpdate = 0
    
    const draw = (now: number) => {
      const dt = (now - lastTime) / 1000
      lastTime = now
      
      const w = canvas.width
      const h = canvas.height
      
      if (!isPaused) {
        timeRef.current += dt
      }
      
      const t = timeRef.current
      
      // Update causality every 0.5 seconds
      if (t - lastCausalityUpdate > 0.5) {
        lastCausalityUpdate = t
        causalityRef.current = generateCausality(t)
        // Update UI state less frequently
        setPacemaker(causalityRef.current.pacemaker)
        setFlowCount(causalityRef.current.flows.length)
      }
      
      const { matrix, flows, pacemaker: currentPacemaker } = causalityRef.current
      
      // Clear
      ctx.fillStyle = "#0a0e1a"
      ctx.fillRect(0, 0, w, h)
      
      const centerX = w / 2
      const centerY = h / 2
      const radius = Math.min(w, h) * 0.35
      
      // Calculate positions
      const positions: Record<string, { x: number; y: number }> = {}
      ELECTRODE_LAYOUT.forEach(electrode => {
        const angle = (electrode.angle * Math.PI) / 180 - Math.PI / 2
        positions[electrode.id] = {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        }
      })
      
      // Draw flows
      flows.forEach((flow, idx) => {
        const from = positions[flow.from]
        const to = positions[flow.to]
        if (!from || !to) return
        
        const isPacemakerFlow = flow.from === currentPacemaker
        const color = isPacemakerFlow ? "#10b981" : "#06b6d4"
        const alpha = Math.min(1, flow.strength / 0.8)
        
        // Animated particle
        const particleProgress = ((t * 0.5 + idx * 0.1) % 1)
        const particleX = from.x + (to.x - from.x) * particleProgress
        const particleY = from.y + (to.y - from.y) * particleProgress
        
        // Line
        ctx.strokeStyle = `rgba(${isPacemakerFlow ? "16,185,129" : "6,182,212"}, ${alpha * 0.3})`
        ctx.lineWidth = 1 + flow.strength * 2
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()
        
        // Particle
        ctx.fillStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.arc(particleX, particleY, 3 + flow.strength * 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        
        // Arrowhead
        const angle = Math.atan2(to.y - from.y, to.x - from.x)
        const arrowX = to.x - Math.cos(angle) * 20
        const arrowY = to.y - Math.sin(angle) * 20
        const arrowSize = 6 + flow.strength * 4
        
        ctx.fillStyle = `rgba(${isPacemakerFlow ? "16,185,129" : "6,182,212"}, ${alpha})`
        ctx.beginPath()
        ctx.moveTo(arrowX, arrowY)
        ctx.lineTo(arrowX - Math.cos(angle - Math.PI / 6) * arrowSize, arrowY - Math.sin(angle - Math.PI / 6) * arrowSize)
        ctx.lineTo(arrowX - Math.cos(angle + Math.PI / 6) * arrowSize, arrowY - Math.sin(angle + Math.PI / 6) * arrowSize)
        ctx.closePath()
        ctx.fill()
      })
      
      // Draw nodes
      ELECTRODE_LAYOUT.forEach((electrode, idx) => {
        const pos = positions[electrode.id]
        const isPacemakerNode = electrode.id === currentPacemaker
        const outgoing = matrix[idx]?.reduce((a, b) => a + b, 0) || 0
        const nodeRadius = 12 + outgoing * 8
        
        if (isPacemakerNode) {
          ctx.shadowColor = "#10b981"
          ctx.shadowBlur = 15 + 5 * Math.sin(t * 3)
        }
        
        ctx.fillStyle = isPacemakerNode ? "#10b981" : "#334155"
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        
        ctx.strokeStyle = isPacemakerNode ? "#10b981" : "#06b6d4"
        ctx.lineWidth = 2
        ctx.stroke()
        
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 10px monospace"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(electrode.label, pos.x, pos.y)
        
        if (isPacemakerNode) {
          ctx.fillStyle = "#10b981"
          ctx.font = "12px monospace"
          ctx.fillText("⚡", pos.x, pos.y - nodeRadius - 8)
        }
      })
      
      // Legend
      ctx.fillStyle = "#ffffff"
      ctx.font = "9px monospace"
      ctx.textAlign = "left"
      ctx.fillText("Transfer Entropy", 8, 15)
      ctx.fillStyle = "#10b981"
      ctx.fillText("● Pacemaker", 8, 28)
      ctx.fillStyle = "#06b6d4"
      ctx.fillText("→ Causal flow", 8, 41)
      
      animationRef.current = requestAnimationFrame(draw)
    }
    
    animationRef.current = requestAnimationFrame(draw)
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [dimensions, isPaused])

  const handleReset = () => {
    setIsPaused(false)
    timeRef.current = 0
    causalityRef.current = { matrix: [], flows: [], pacemaker: "E4" }
  }
  
  const exportData = () => {
    const blob = new Blob([JSON.stringify(causalityRef.current, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `causality_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn("w-full h-full flex flex-col overflow-hidden", className)}>
      <div className="flex-none flex items-center justify-between gap-2 px-1 py-1 border-b border-emerald-500/20">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsPaused(!isPaused)} className="h-6 w-6 p-0 text-emerald-400 hover:bg-emerald-500/10">
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReset} className="h-6 w-6 p-0 text-emerald-400 hover:bg-emerald-500/10">
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">
            <Zap className="h-2.5 w-2.5 mr-1" />{pacemaker}
          </Badge>
        </div>
        
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={() => setTimeDelayIdx(Math.max(0, timeDelayIdx - 1))} className="h-5 w-5 p-0 text-emerald-400">
            <ChevronLeft className="h-2.5 w-2.5" />
          </Button>
          <span className="text-[9px] text-emerald-400 font-mono w-12 text-center">τ={timeDelay}h</span>
          <Button variant="ghost" size="icon" onClick={() => setTimeDelayIdx(Math.min(TIME_DELAYS.length - 1, timeDelayIdx + 1))} className="h-5 w-5 p-0 text-emerald-400">
            <ChevronRight className="h-2.5 w-2.5" />
          </Button>
        </div>
        
        <Button variant="ghost" size="icon" onClick={exportData} className="h-5 w-5 p-0 text-emerald-400" title="Export">
          <Download className="h-3 w-3" />
        </Button>
      </div>
      
      <div ref={containerRef} className="flex-1 relative rounded overflow-hidden bg-[#0a0e1a] border border-emerald-500/20 min-h-0 min-w-0">
        <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="block" />
        <div className="absolute top-8 right-2 backdrop-blur-xl bg-black/60 border border-emerald-500/20 rounded-lg p-1.5 text-[8px] text-emerald-400/70">
          <div>Electrodes: {ELECTRODE_LAYOUT.length}</div>
          <div>Active flows: {flowCount}</div>
        </div>
      </div>
      
      <div className="flex-none text-center py-0.5">
        <a href="https://doi.org/10.1038/s41598-024-66223-6" target="_blank" rel="noopener noreferrer" className="text-[8px] text-emerald-400/50 hover:text-emerald-400">
          Fukasawa et al. (2024) Sci Rep
        </a>
      </div>
    </div>
  )
}
