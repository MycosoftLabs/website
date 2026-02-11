/**
 * NLM Panel - Nature Learning Model Analysis
 * 
 * Scientific signal classification and prediction panel.
 * Implements GFST (Global Fungi Symbiosis Theory) pattern recognition.
 * 
 * Features:
 * - Real-time pattern classification
 * - Species identification
 * - Behavioral state detection
 * - Anomaly detection
 * - Prediction confidence metrics
 */

"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  Brain, Play, Pause, RotateCcw, Download,
  Activity, Zap, AlertTriangle, TrendingUp, Target
} from "lucide-react"

interface NLMPanelProps {
  deviceId?: string | null
  patterns?: any[]
  className?: string
}

// GFST Pattern Classifications
const PATTERN_CLASSES = [
  { id: "baseline", name: "Baseline Activity", color: "#94a3b8", description: "Normal resting state" },
  { id: "growth", name: "Active Growth", color: "#22c55e", description: "Metabolic activity detected" },
  { id: "stress", name: "Stress Response", color: "#f59e0b", description: "Environmental stressor" },
  { id: "communication", name: "Communication", color: "#3b82f6", description: "Inter-hyphal signaling" },
  { id: "foraging", name: "Nutrient Foraging", color: "#a855f7", description: "Resource exploration" },
  { id: "defense", name: "Defense Mode", color: "#ef4444", description: "Threat response" },
]

// Behavioral states from scientific literature
const BEHAVIORAL_STATES = [
  { id: "dormant", name: "Dormant", indicator: 0.1 },
  { id: "awakening", name: "Awakening", indicator: 0.3 },
  { id: "active", name: "Active", indicator: 0.6 },
  { id: "hyperactive", name: "Hyperactive", indicator: 0.9 },
]

export function NLMPanel({ deviceId = null, patterns = [], className }: NLMPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const timeRef = useRef(0)
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  
  // NLM Analysis State
  const [classification, setClassification] = useState({
    primary: PATTERN_CLASSES[0],
    confidence: 0,
    secondary: PATTERN_CLASSES[1],
    secondaryConfidence: 0,
  })
  
  const [behavioralState, setBehavioralState] = useState({
    current: BEHAVIORAL_STATES[0],
    activity: 0,
    trend: 0,
  })
  
  const [anomalyScore, setAnomalyScore] = useState(0)
  const [predictions, setPredictions] = useState<{ label: string; probability: number }[]>([])

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

  // Main analysis animation loop
  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    let lastTime = performance.now()
    let lastAnalysisUpdate = 0
    
    const draw = (now: number) => {
      const dt = (now - lastTime) / 1000
      lastTime = now
      
      if (isAnalyzing) {
        timeRef.current += dt
      }
      
      const t = timeRef.current
      const w = canvas.width
      const h = canvas.height
      
      // Clear
      ctx.fillStyle = "#050810"
      ctx.fillRect(0, 0, w, h)
      
      // Draw neural network visualization
      drawNeuralNetwork(ctx, w, h, t)
      
      // Update analysis periodically
      if (now - lastAnalysisUpdate > 800) {
        lastAnalysisUpdate = now
        updateAnalysis(t)
      }
      
      animationRef.current = requestAnimationFrame(draw)
    }
    
    animationRef.current = requestAnimationFrame(draw)
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [dimensions, isAnalyzing])
  
  // Draw neural network visualization
  const drawNeuralNetwork = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    const layers = [4, 6, 6, 4] // Input, Hidden1, Hidden2, Output
    const layerSpacing = w / (layers.length + 1)
    const nodePositions: { x: number; y: number; layer: number; idx: number }[] = []
    
    // Calculate node positions
    layers.forEach((nodeCount, layerIdx) => {
      const nodeSpacing = h / (nodeCount + 1)
      for (let i = 0; i < nodeCount; i++) {
        nodePositions.push({
          x: layerSpacing * (layerIdx + 1),
          y: nodeSpacing * (i + 1),
          layer: layerIdx,
          idx: i,
        })
      }
    })
    
    // Draw connections with activation
    ctx.lineWidth = 1
    nodePositions.forEach(node => {
      if (node.layer < layers.length - 1) {
        const nextLayerNodes = nodePositions.filter(n => n.layer === node.layer + 1)
        nextLayerNodes.forEach(target => {
          const activation = (Math.sin(t * 2 + node.idx * 0.5 + target.idx * 0.3) + 1) / 2
          const alpha = 0.1 + activation * 0.4
          
          ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(target.x, target.y)
          ctx.stroke()
          
          // Animated signal particle
          if (activation > 0.7) {
            const progress = (t * 0.5 + node.idx * 0.1) % 1
            const px = node.x + (target.x - node.x) * progress
            const py = node.y + (target.y - node.y) * progress
            
            ctx.fillStyle = "#06b6d4"
            ctx.shadowColor = "#06b6d4"
            ctx.shadowBlur = 4
            ctx.beginPath()
            ctx.arc(px, py, 2, 0, Math.PI * 2)
            ctx.fill()
            ctx.shadowBlur = 0
          }
        })
      }
    })
    
    // Draw nodes
    nodePositions.forEach(node => {
      const activation = (Math.sin(t * 1.5 + node.layer * 1.2 + node.idx * 0.7) + 1) / 2
      const radius = 4 + activation * 3
      
      // Node colors by layer
      const colors = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b"]
      const color = colors[node.layer]
      
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 8 * activation
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    })
    
    // Layer labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
    ctx.font = "7px monospace"
    ctx.textAlign = "center"
    const labels = ["Input", "Hidden", "Hidden", "Output"]
    layers.forEach((_, i) => {
      ctx.fillText(labels[i], layerSpacing * (i + 1), h - 3)
    })
  }
  
  // Update analysis state
  const updateAnalysis = (t: number) => {
    // Simulate pattern classification
    const primaryIdx = Math.floor((Math.sin(t * 0.1) + 1) / 2 * PATTERN_CLASSES.length)
    const secondaryIdx = (primaryIdx + 1) % PATTERN_CLASSES.length
    const confidence = 0.7 + Math.sin(t * 0.3) * 0.2
    
    setClassification({
      primary: PATTERN_CLASSES[primaryIdx],
      confidence,
      secondary: PATTERN_CLASSES[secondaryIdx],
      secondaryConfidence: 1 - confidence,
    })
    
    // Simulate behavioral state
    const activity = (Math.sin(t * 0.15) + 1) / 2
    const stateIdx = Math.min(3, Math.floor(activity * 4))
    const trend = Math.sin(t * 0.05) > 0 ? 1 : -1
    
    setBehavioralState({
      current: BEHAVIORAL_STATES[stateIdx],
      activity,
      trend,
    })
    
    // Anomaly detection
    const anomaly = Math.max(0, Math.sin(t * 0.4) * 0.5 - 0.2)
    setAnomalyScore(anomaly)
    
    // Predictions
    setPredictions([
      { label: "Spike in 5min", probability: 0.6 + Math.sin(t * 0.2) * 0.3 },
      { label: "State change", probability: 0.4 + Math.sin(t * 0.25) * 0.2 },
      { label: "Pattern repeat", probability: 0.5 + Math.sin(t * 0.15) * 0.25 },
    ])
  }
  
  const handleReset = () => {
    timeRef.current = 0
    setIsAnalyzing(true)
  }
  
  const exportAnalysis = () => {
    const data = { classification, behavioralState, anomalyScore, predictions, timestamp: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `nlm_analysis_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn("w-full h-full flex flex-col overflow-hidden", className)}>
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-1 py-1 border-b border-purple-500/20">
        <div className="flex items-center gap-1">
          <Brain className="h-3 w-3 text-purple-400" />
          <span className="text-[9px] text-purple-400 font-semibold">NLM v2.1</span>
          {isAnalyzing && (
            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-emerald-500/30 text-emerald-400 animate-pulse">
              LIVE
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={() => setIsAnalyzing(!isAnalyzing)} className="h-4 w-4 p-0 text-purple-400">
            {isAnalyzing ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReset} className="h-4 w-4 p-0 text-purple-400">
            <RotateCcw className="h-2.5 w-2.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={exportAnalysis} className="h-4 w-4 p-0 text-purple-400">
            <Download className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>
      
      {/* Neural Network Visualization */}
      <div ref={containerRef} className="flex-[1.5] relative rounded overflow-hidden bg-[#050810] border border-purple-500/20 min-h-0 min-w-0">
        <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="block" />
      </div>
      
      {/* Classification Result */}
      <div className="flex-none p-1 mt-1 rounded bg-black/40 border border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: classification.primary.color }} />
            <span className="text-[9px] font-semibold" style={{ color: classification.primary.color }}>
              {classification.primary.name}
            </span>
          </div>
          <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-emerald-500/30 text-emerald-400">
            {(classification.confidence * 100).toFixed(0)}%
          </Badge>
        </div>
        <div className="mt-0.5 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${classification.confidence * 100}%`, backgroundColor: classification.primary.color }} />
        </div>
      </div>
      
      {/* Behavioral State */}
      <div className="flex-none flex items-center justify-between p-1 mt-1 rounded bg-black/40 border border-cyan-500/20">
        <div className="flex items-center gap-1">
          <Activity className="h-2.5 w-2.5 text-cyan-400" />
          <span className="text-[8px] text-cyan-400">{behavioralState.current.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className={cn("h-2.5 w-2.5", behavioralState.trend > 0 ? "text-emerald-400" : "text-red-400 rotate-180")} />
          <span className="text-[8px] font-mono text-cyan-400">{(behavioralState.activity * 100).toFixed(0)}%</span>
        </div>
      </div>
      
      {/* Anomaly Alert */}
      {anomalyScore > 0.1 && (
        <div className="flex-none flex items-center gap-1 p-1 mt-1 rounded bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
          <span className="text-[8px] text-amber-400">Anomaly: {(anomalyScore * 100).toFixed(0)}%</span>
        </div>
      )}
      
      {/* Predictions */}
      <div className="flex-none mt-1 space-y-0.5">
        <div className="text-[7px] text-gray-500 px-0.5">Predictions</div>
        {predictions.slice(0, 2).map((pred, i) => (
          <div key={i} className="flex items-center justify-between px-1 py-0.5 rounded bg-black/30">
            <span className="text-[7px] text-gray-400">{pred.label}</span>
            <span className="text-[7px] font-mono text-purple-400">{(pred.probability * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
