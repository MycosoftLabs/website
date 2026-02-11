"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import {
  Activity,
  Brain,
  Zap,
  Radio,
  Waves,
  Settings,
  ExternalLink,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Gauge,
  BarChart3,
  Signal,
} from "lucide-react"

// GFST Pattern colors
const PATTERN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  baseline: { bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/30" },
  growth: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  active_growth: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
  stress: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  temperature_stress: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
  chemical_stress: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  nutrient_seeking: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
  communication: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30" },
  network_communication: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  seismic_precursor: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  spike: { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/30" },
  action_potential: { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30" },
  unknown: { bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/30" },
}

interface FCIData {
  amplitude_uv: number
  rms_uv: number
  dominant_freq_hz: number
  pattern: string
  pattern_confidence: number
  snr_db: number
  sample_count: number
  impedance_ohms: number
  stimulus_active: boolean
}

interface FCIPeripheralWidgetProps {
  deviceId: string
  peripheral: {
    address: string
    type: string
    widget: {
      widget: string
      icon: string
      controls: string[]
      telemetryFields: string[]
    }
  }
  sensorData?: Record<string, unknown>
}

// Mini oscilloscope for FCI signals
function MiniOscilloscope({ data }: { data: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    const w = canvas.width
    const h = canvas.height
    
    // Clear with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, "rgba(0, 20, 40, 0.9)")
    gradient.addColorStop(1, "rgba(0, 10, 20, 0.9)")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
    
    // Draw grid
    ctx.strokeStyle = "rgba(0, 255, 136, 0.1)"
    ctx.lineWidth = 0.5
    for (let y = 0; y < h; y += h / 4) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    for (let x = 0; x < w; x += w / 8) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    
    // Draw center line
    ctx.strokeStyle = "rgba(0, 255, 136, 0.3)"
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()
    
    // Draw waveform
    if (data.length > 0) {
      ctx.strokeStyle = "#00FF88"
      ctx.lineWidth = 1.5
      ctx.shadowColor = "#00FF88"
      ctx.shadowBlur = 4
      ctx.beginPath()
      
      const maxVal = Math.max(...data.map(Math.abs), 1)
      const stepX = w / (data.length - 1)
      
      for (let i = 0; i < data.length; i++) {
        const x = i * stepX
        const y = h / 2 - (data[i] / maxVal) * (h / 2) * 0.8
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }, [data])
  
  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={80}
      className="w-full h-20 rounded border border-emerald-500/20"
    />
  )
}

// Pattern trend indicator
function TrendIndicator({ value, prevValue }: { value: number; prevValue: number }) {
  const diff = value - prevValue
  
  if (Math.abs(diff) < 0.01) {
    return <Minus className="h-3 w-3 text-gray-400" />
  } else if (diff > 0) {
    return <TrendingUp className="h-3 w-3 text-emerald-400" />
  } else {
    return <TrendingDown className="h-3 w-3 text-orange-400" />
  }
}

export function FCIPeripheralWidget({ deviceId, peripheral, sensorData }: FCIPeripheralWidgetProps) {
  const [fciData, setFciData] = useState<FCIData | null>(null)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [prevAmplitude, setPrevAmplitude] = useState(0)
  const [isStreaming, setIsStreaming] = useState(false)
  const [calibrating, setCalibrating] = useState(false)
  const [stimulating, setStimulating] = useState(false)
  const [stimFreq, setStimFreq] = useState(1.0)
  const [stimAmp, setStimAmp] = useState(10)
  const wsRef = useRef<WebSocket | null>(null)
  
  // Generate simulated waveform data based on pattern
  const generateWaveform = useCallback((pattern: string, amplitude: number) => {
    const samples = 100
    const data: number[] = []
    const t = Date.now() / 1000
    
    for (let i = 0; i < samples; i++) {
      const x = i / samples * Math.PI * 4
      let y = 0
      
      switch (pattern) {
        case "growth":
        case "active_growth":
          y = amplitude * Math.sin(x + t) * 0.7 + amplitude * Math.sin(x * 0.3 + t * 0.5) * 0.3
          break
        case "stress":
        case "temperature_stress":
        case "chemical_stress":
          y = amplitude * Math.sin(x * 3 + t * 2) + (Math.random() - 0.5) * amplitude * 0.5
          break
        case "spike":
        case "action_potential":
          y = amplitude * Math.sin(x + t) + (Math.random() > 0.9 ? amplitude * 2 : 0)
          break
        case "seismic_precursor":
          y = amplitude * Math.sin(x * 0.1 + t * 0.1) * 1.5 + (Math.random() - 0.5) * amplitude * 0.1
          break
        case "communication":
        case "network_communication":
          y = amplitude * Math.sin(x + t) * Math.sin(x * 5 + t * 3) * 0.5
          break
        default:
          y = (Math.random() - 0.5) * amplitude * 0.3
          break
      }
      data.push(y)
    }
    return data
  }, [])
  
  // Simulate real-time FCI data updates
  useEffect(() => {
    if (!isStreaming) return
    
    const interval = setInterval(() => {
      // Generate simulated FCI data
      const patterns = ["baseline", "growth", "stress", "spike", "communication", "seismic_precursor"]
      const pattern = patterns[Math.floor(Date.now() / 10000) % patterns.length]
      const amplitude = 0.3 + Math.random() * 2.5
      
      setPrevAmplitude(fciData?.amplitude_uv || 0)
      
      const newData: FCIData = {
        amplitude_uv: amplitude,
        rms_uv: amplitude * 0.707,
        dominant_freq_hz: 0.5 + Math.random() * 10,
        pattern,
        pattern_confidence: 0.6 + Math.random() * 0.35,
        snr_db: 5 + Math.random() * 25,
        sample_count: Math.floor(Math.random() * 10000) + 50000,
        impedance_ohms: 1000 + Math.random() * 5000,
        stimulus_active: stimulating,
      }
      
      setFciData(newData)
      setWaveformData(generateWaveform(pattern, amplitude))
    }, 100)
    
    return () => clearInterval(interval)
  }, [isStreaming, stimulating, fciData?.amplitude_uv, generateWaveform])
  
  // Parse sensor data if provided from device manager
  useEffect(() => {
    if (sensorData && Object.keys(sensorData).length > 0) {
      const data = sensorData as Partial<FCIData>
      if (data.amplitude_uv !== undefined) {
        setFciData(data as FCIData)
        setWaveformData(generateWaveform(data.pattern || "baseline", data.amplitude_uv || 1))
      }
    }
  }, [sensorData, generateWaveform])
  
  const handleCalibrate = async () => {
    setCalibrating(true)
    // Simulate calibration
    await new Promise((r) => setTimeout(r, 3000))
    setCalibrating(false)
  }
  
  const handleStimulate = async () => {
    if (stimulating) {
      setStimulating(false)
      return
    }
    setStimulating(true)
    // Auto-stop after 5 seconds
    setTimeout(() => setStimulating(false), 5000)
  }
  
  const patternStyle = fciData
    ? PATTERN_COLORS[fciData.pattern] || PATTERN_COLORS.unknown
    : PATTERN_COLORS.baseline
  
  return (
    <Card className="border-cyan-500/30 bg-gradient-to-b from-slate-900/50 to-slate-950/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Brain className="h-5 w-5 text-cyan-400" />
            </div>
            <span>Fungal Computer Interface</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-400">
                Idle
              </Badge>
            )}
            <Badge variant="outline" className="font-mono text-xs">
              {peripheral.address}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Mini Oscilloscope */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Waves className="h-3 w-3" /> Bioelectric Signal
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setIsStreaming(!isStreaming)}
            >
              {isStreaming ? (
                <>
                  <Square className="h-3 w-3 mr-1" /> Stop
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" /> Stream
                </>
              )}
            </Button>
          </div>
          <MiniOscilloscope data={waveformData} />
        </div>
        
        {/* Signal Metrics */}
        {fciData && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Amplitude</span>
                <TrendIndicator value={fciData.amplitude_uv} prevValue={prevAmplitude} />
              </div>
              <p className="text-xl font-bold text-cyan-400">
                {fciData.amplitude_uv.toFixed(2)}
                <span className="text-xs font-normal ml-1">µV</span>
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs text-muted-foreground">Frequency</span>
              </div>
              <p className="text-xl font-bold text-purple-400">
                {fciData.dominant_freq_hz.toFixed(2)}
                <span className="text-xs font-normal ml-1">Hz</span>
              </p>
            </div>
          </div>
        )}
        
        {/* Pattern Detection */}
        {fciData && (
          <div className={`p-3 rounded-lg ${patternStyle.bg} border ${patternStyle.border}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Signal className={`h-4 w-4 ${patternStyle.text}`} />
                <span className="text-sm font-medium capitalize">
                  {fciData.pattern.replace(/_/g, " ")}
                </span>
              </div>
              <Badge variant="outline" className={`${patternStyle.text} ${patternStyle.border}`}>
                {(fciData.pattern_confidence * 100).toFixed(0)}%
              </Badge>
            </div>
            <Progress
              value={fciData.pattern_confidence * 100}
              className="h-1.5 mt-2"
            />
          </div>
        )}
        
        {/* Signal Quality */}
        {fciData && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">SNR</span>
              <span className="font-medium">{fciData.snr_db.toFixed(1)} dB</span>
            </div>
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Z</span>
              <span className="font-medium">{(fciData.impedance_ohms / 1000).toFixed(1)} kΩ</span>
            </div>
          </div>
        )}
        
        <Separator className="bg-border/50" />
        
        {/* Stimulation Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              Bi-Directional Stimulus
            </Label>
            <Switch
              checked={stimulating}
              onCheckedChange={() => handleStimulate()}
              disabled={!isStreaming}
            />
          </div>
          
          {stimulating && (
            <div className="space-y-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Frequency: {stimFreq.toFixed(1)} Hz</span>
              </div>
              <Slider
                value={[stimFreq]}
                onValueChange={([v]) => setStimFreq(v)}
                min={0.1}
                max={50}
                step={0.1}
                className="h-1"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">Amplitude: {stimAmp} µV</span>
              </div>
              <Slider
                value={[stimAmp]}
                onValueChange={([v]) => setStimAmp(v)}
                min={1}
                max={100}
                step={1}
                className="h-1"
              />
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCalibrate}
            disabled={calibrating || isStreaming}
          >
            {calibrating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Settings className="h-4 w-4 mr-2" />
            )}
            Calibrate
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href="/natureos/fungi-compute">
              <BarChart3 className="h-4 w-4 mr-2" />
              Fungi Compute
              <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <div className="w-full text-xs text-muted-foreground flex items-center justify-between">
          <span>
            {fciData ? `${fciData.sample_count.toLocaleString()} samples` : "Not streaming"}
          </span>
          <span className="flex items-center gap-1">
            {fciData?.snr_db && fciData.snr_db > 10 ? (
              <>
                <CheckCircle className="h-3 w-3 text-emerald-400" />
                Good Signal
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 text-yellow-400" />
                Weak Signal
              </>
            )}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}
