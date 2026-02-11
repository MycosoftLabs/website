"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Activity,
  Zap,
  Waves,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Circle,
  Minus,
  RefreshCw,
  Settings,
  Download,
  Play,
  Pause,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ============================================================================
// TYPES
// ============================================================================

interface FCIChannel {
  id: string
  amplitude_uv: number
  rms_uv: number
  dominant_freq_hz: number
  spectral_centroid_hz: number
  snr_db: number
  quality_score: number
  band_powers: {
    ultra_low: number
    low: number
    mid: number
    high: number
  }
}

interface FCIPattern {
  name: string
  category: string
  confidence: number
  phase: string
  meaning: string
  implications: string[]
  actions: string[]
}

interface FCIEnvironment {
  temperature_c: number
  humidity_pct: number
  pressure_hpa: number
  voc_index: number
}

interface FCIDeviceData {
  device_id: string
  device_name: string
  probe_type: string
  status: "online" | "offline" | "warning" | "error"
  last_seen: string
  channels: FCIChannel[]
  pattern: FCIPattern | null
  environment: FCIEnvironment | null
  spike_count: number
  spike_rate_hz: number
}

interface FCISignalWidgetProps {
  devices: FCIDeviceData[]
  onDeviceSelect?: (deviceId: string) => void
  refreshInterval?: number
  onRefresh?: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PATTERN_COLORS: Record<string, string> = {
  baseline: "text-gray-400 bg-gray-500/10 border-gray-500/30",
  active_growth: "text-green-400 bg-green-500/10 border-green-500/30",
  nutrient_seeking: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  temperature_stress: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  moisture_stress: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  chemical_stress: "text-red-400 bg-red-500/10 border-red-500/30",
  network_communication: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  action_potential: "text-pink-400 bg-pink-500/10 border-pink-500/30",
  seismic_precursor: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  defense_activation: "text-red-400 bg-red-500/10 border-red-500/30",
  sporulation_initiation: "text-amber-400 bg-amber-500/10 border-amber-500/30",
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  metabolic: <Activity className="h-4 w-4" />,
  environmental: <Waves className="h-4 w-4" />,
  communication: <Zap className="h-4 w-4" />,
  defensive: <AlertTriangle className="h-4 w-4" />,
  reproductive: <Circle className="h-4 w-4" />,
  predictive: <TrendingUp className="h-4 w-4" />,
}

// ============================================================================
// MINI WAVEFORM COMPONENT
// ============================================================================

function MiniWaveform({ data, width = 120, height = 40 }: { 
  data: number[] 
  width?: number 
  height?: number 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    // Clear
    ctx.clearRect(0, 0, width, height)
    
    // Draw waveform
    ctx.strokeStyle = "#22d3ee" // cyan-400
    ctx.lineWidth = 1.5
    ctx.beginPath()
    
    const stepX = width / (data.length - 1)
    const midY = height / 2
    const maxAmp = Math.max(...data.map(Math.abs), 0.1)
    const scale = (height * 0.4) / maxAmp
    
    data.forEach((val, i) => {
      const x = i * stepX
      const y = midY - val * scale
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
    
    // Draw center line
    ctx.strokeStyle = "rgba(255,255,255,0.1)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, midY)
    ctx.lineTo(width, midY)
    ctx.stroke()
  }, [data, width, height])
  
  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height}
      className="rounded bg-slate-900/50"
    />
  )
}

// ============================================================================
// SPECTRUM BAR COMPONENT
// ============================================================================

function SpectrumBar({ bandPowers }: { bandPowers: FCIChannel["band_powers"] }) {
  const total = Object.values(bandPowers).reduce((a, b) => a + b, 0) || 1
  
  return (
    <div className="flex gap-0.5 h-6">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="bg-blue-600 rounded-l transition-all"
              style={{ width: `${(bandPowers.ultra_low / total) * 100}%` }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>Ultra Low (0.01-0.1 Hz): {(bandPowers.ultra_low / total * 100).toFixed(1)}%</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="bg-green-500 transition-all"
              style={{ width: `${(bandPowers.low / total) * 100}%` }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>Low (0.1-1 Hz): {(bandPowers.low / total * 100).toFixed(1)}%</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="bg-yellow-500 transition-all"
              style={{ width: `${(bandPowers.mid / total) * 100}%` }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>Mid (1-10 Hz): {(bandPowers.mid / total * 100).toFixed(1)}%</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="bg-red-500 rounded-r transition-all"
              style={{ width: `${(bandPowers.high / total) * 100}%` }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>High (10-50 Hz): {(bandPowers.high / total * 100).toFixed(1)}%</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

// ============================================================================
// PATTERN BADGE COMPONENT
// ============================================================================

function PatternBadge({ pattern }: { pattern: FCIPattern }) {
  const colorClass = PATTERN_COLORS[pattern.name] || PATTERN_COLORS.baseline
  const icon = CATEGORY_ICONS[pattern.category] || <Activity className="h-4 w-4" />
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colorClass}`}>
      {icon}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium capitalize">
            {pattern.name.replace(/_/g, " ")}
          </span>
          <Badge variant="outline" className="text-xs">
            {(pattern.confidence * 100).toFixed(0)}%
          </Badge>
        </div>
        <p className="text-xs opacity-70 capitalize">{pattern.phase} phase</p>
      </div>
    </div>
  )
}

// ============================================================================
// CHANNEL DETAIL COMPONENT
// ============================================================================

function ChannelDetail({ channel, index }: { channel: FCIChannel; index: number }) {
  // Generate fake waveform data for visualization
  const waveformData = Array.from({ length: 50 }, (_, i) => 
    Math.sin(i * 0.3) * channel.amplitude_uv * 0.001 + 
    Math.random() * 0.1 * channel.amplitude_uv * 0.001
  )
  
  return (
    <div className="bg-slate-800/30 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Channel {index + 1}</span>
        <Badge 
          variant="outline" 
          className={channel.quality_score > 0.7 ? "text-green-400" : "text-yellow-400"}
        >
          Q: {(channel.quality_score * 100).toFixed(0)}%
        </Badge>
      </div>
      
      <MiniWaveform data={waveformData} />
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-400">Amplitude</span>
          <p className="font-medium">{channel.amplitude_uv.toFixed(2)} µV</p>
        </div>
        <div>
          <span className="text-gray-400">RMS</span>
          <p className="font-medium">{channel.rms_uv.toFixed(2)} µV</p>
        </div>
        <div>
          <span className="text-gray-400">Dom. Freq</span>
          <p className="font-medium">{channel.dominant_freq_hz.toFixed(2)} Hz</p>
        </div>
        <div>
          <span className="text-gray-400">SNR</span>
          <p className="font-medium">{channel.snr_db.toFixed(1)} dB</p>
        </div>
      </div>
      
      <div>
        <span className="text-xs text-gray-400">Spectrum</span>
        <SpectrumBar bandPowers={channel.band_powers} />
      </div>
    </div>
  )
}

// ============================================================================
// MAIN WIDGET
// ============================================================================

export function FCISignalWidget({ 
  devices, 
  onDeviceSelect,
  refreshInterval = 5000,
  onRefresh,
}: FCISignalWidgetProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(
    devices.length > 0 ? devices[0].device_id : null
  )
  const [isLive, setIsLive] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  
  const selectedDevice = devices.find(d => d.device_id === selectedDeviceId)
  
  // Auto-refresh
  useEffect(() => {
    if (!isLive || !onRefresh) return
    
    const interval = setInterval(() => {
      onRefresh()
      setLastUpdate(new Date())
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [isLive, refreshInterval, onRefresh])
  
  const handleDeviceSelect = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId)
    onDeviceSelect?.(deviceId)
  }, [onDeviceSelect])
  
  // Status counts
  const onlineCount = devices.filter(d => d.status === "online").length
  const warningCount = devices.filter(d => d.status === "warning").length
  const offlineCount = devices.filter(d => d.status === "offline" || d.status === "error").length
  
  const statusColors: Record<string, string> = {
    online: "bg-green-500",
    warning: "bg-amber-500",
    offline: "bg-gray-500",
    error: "bg-red-500",
  }
  
  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-400" />
            FCI Bioelectric Monitor
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={isLive ? "text-green-400" : "text-gray-400"}
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={!onRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        <p className="text-xs text-gray-400">
          {isLive ? "Live" : "Paused"} • Updated {lastUpdate.toLocaleTimeString()}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
            <CheckCircle className="h-4 w-4 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-400">{onlineCount}</p>
            <p className="text-xs text-gray-400">Online</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-amber-400">{warningCount}</p>
            <p className="text-xs text-gray-400">Warning</p>
          </div>
          <div className="bg-gray-500/10 border border-gray-500/30 rounded p-2">
            <Circle className="h-4 w-4 text-gray-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-400">{offlineCount}</p>
            <p className="text-xs text-gray-400">Offline</p>
          </div>
        </div>
        
        {/* Device Selector */}
        <div className="flex gap-2 flex-wrap">
          {devices.map((device) => (
            <button
              key={device.device_id}
              onClick={() => handleDeviceSelect(device.device_id)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all
                flex items-center gap-1.5
                ${selectedDeviceId === device.device_id 
                  ? "bg-slate-600 text-white ring-2 ring-cyan-500" 
                  : "bg-slate-800/50 text-gray-300 hover:bg-slate-700"
                }
              `}
            >
              <span>🍄</span>
              <span>{device.device_name || device.device_id}</span>
              <span className={`w-2 h-2 rounded-full ${statusColors[device.status]}`} />
            </button>
          ))}
        </div>
        
        {/* Selected Device Details */}
        {selectedDevice && (
          <Tabs defaultValue="signals" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
              <TabsTrigger value="signals">Signals</TabsTrigger>
              <TabsTrigger value="pattern">Pattern</TabsTrigger>
              <TabsTrigger value="environment">Environment</TabsTrigger>
            </TabsList>
            
            {/* Signals Tab */}
            <TabsContent value="signals" className="space-y-3">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-800/30 rounded p-2 text-center">
                  <Zap className="h-4 w-4 text-yellow-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-yellow-400">
                    {selectedDevice.spike_count}
                  </p>
                  <p className="text-xs text-gray-400">Spikes</p>
                </div>
                <div className="bg-slate-800/30 rounded p-2 text-center">
                  <Activity className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-cyan-400">
                    {selectedDevice.spike_rate_hz.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">Hz Rate</p>
                </div>
                <div className="bg-slate-800/30 rounded p-2 text-center">
                  <Waves className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-purple-400">
                    {selectedDevice.channels.length}
                  </p>
                  <p className="text-xs text-gray-400">Channels</p>
                </div>
              </div>
              
              {/* Channels */}
              <div className="space-y-2">
                {selectedDevice.channels.map((channel, idx) => (
                  <ChannelDetail key={channel.id} channel={channel} index={idx} />
                ))}
              </div>
            </TabsContent>
            
            {/* Pattern Tab */}
            <TabsContent value="pattern" className="space-y-3">
              {selectedDevice.pattern ? (
                <>
                  <PatternBadge pattern={selectedDevice.pattern} />
                  
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">Interpretation</h4>
                    <p className="text-sm text-gray-300">
                      {selectedDevice.pattern.meaning}
                    </p>
                  </div>
                  
                  {selectedDevice.pattern.implications.length > 0 && (
                    <div className="bg-slate-800/30 rounded-lg p-3">
                      <h4 className="text-sm font-medium mb-2">Implications</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {selectedDevice.pattern.implications.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-cyan-400">•</span>
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {selectedDevice.pattern.actions.length > 0 && (
                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                      <h4 className="text-sm font-medium mb-2 text-cyan-400">
                        Recommended Actions
                      </h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {selectedDevice.pattern.actions.map((action, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No pattern detected</p>
                  <p className="text-xs">Signal quality may be too low</p>
                </div>
              )}
            </TabsContent>
            
            {/* Environment Tab */}
            <TabsContent value="environment" className="space-y-3">
              {selectedDevice.environment ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-orange-400">🌡️</span>
                      <span className="text-sm text-gray-400">Temperature</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {selectedDevice.environment.temperature_c.toFixed(1)}°C
                    </p>
                    <Progress 
                      value={(selectedDevice.environment.temperature_c / 40) * 100}
                      className="h-1 mt-2"
                    />
                  </div>
                  
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-400">💧</span>
                      <span className="text-sm text-gray-400">Humidity</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {selectedDevice.environment.humidity_pct.toFixed(0)}%
                    </p>
                    <Progress 
                      value={selectedDevice.environment.humidity_pct}
                      className="h-1 mt-2"
                    />
                  </div>
                  
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-purple-400">📊</span>
                      <span className="text-sm text-gray-400">Pressure</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {selectedDevice.environment.pressure_hpa.toFixed(0)}
                    </p>
                    <p className="text-xs text-gray-500">hPa</p>
                  </div>
                  
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-400">🌿</span>
                      <span className="text-sm text-gray-400">VOC Index</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {selectedDevice.environment.voc_index}
                    </p>
                    <p className={`text-xs ${
                      selectedDevice.environment.voc_index < 100 
                        ? "text-green-400" 
                        : selectedDevice.environment.voc_index < 200 
                          ? "text-yellow-400" 
                          : "text-red-400"
                    }`}>
                      {selectedDevice.environment.voc_index < 100 
                        ? "Good" 
                        : selectedDevice.environment.voc_index < 200 
                          ? "Moderate" 
                          : "Poor"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Waves className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No environmental data</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
        
        {devices.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No FCI devices connected</p>
            <p className="text-xs mt-1">Connect a MycoBrain FCI probe to begin</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FCISignalWidget
