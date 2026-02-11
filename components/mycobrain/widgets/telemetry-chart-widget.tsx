"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Activity, 
  Play, 
  Pause, 
  RefreshCw, 
  Download,
  TrendingUp,
  Thermometer,
  Droplets,
  Gauge,
} from "lucide-react"

interface TelemetryEntry {
  timestamp: string
  sensor: string
  data: Record<string, number | string>
  verified?: boolean
  envelope_seq?: number
  envelope_msg_id?: string
}

interface TelemetryChartWidgetProps {
  deviceId: string
  pollInterval?: number
  maxPoints?: number
}

// Simple SVG line chart
function MiniChart({ 
  data, 
  color = "currentColor",
  height = 60,
}: { 
  data: number[]
  color?: string
  height?: number
}) {
  if (data.length < 2) {
    return (
      <div 
        className="flex items-center justify-center text-muted-foreground text-xs"
        style={{ height }}
      >
        Collecting data...
      </div>
    )
  }
  
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  
  const width = 200
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 10) - 5
    return `${x},${y}`
  }).join(" ")
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current value dot */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - min) / range) * (height - 10) - 5}
          r="3"
          fill={color}
        />
      )}
    </svg>
  )
}

export function TelemetryChartWidget({ 
  deviceId, 
  pollInterval = 2000,
  maxPoints = 50,
}: TelemetryChartWidgetProps) {
  const [streaming, setStreaming] = useState(true)
  const [history, setHistory] = useState<TelemetryEntry[]>([])
  const [selectedSensor, setSelectedSensor] = useState<string>("all")
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/mindex/telemetry/samples?device_slug=${encodeURIComponent(deviceId)}&limit=${maxPoints}`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const nextHistory: TelemetryEntry[] = data.map((row: any) => ({
            timestamp: row.recorded_at || new Date().toISOString(),
            sensor: row.stream_key || "unknown",
            data: typeof row.value_numeric === "number" ? { value: row.value_numeric } : (row.value_json || {}),
            verified: Boolean(row.verified),
            envelope_seq: typeof row.envelope_seq === "number" ? row.envelope_seq : undefined,
            envelope_msg_id: typeof row.envelope_msg_id === "string" ? row.envelope_msg_id : undefined,
          }))
          setHistory(nextHistory.reverse())
          setLastUpdate(new Date().toLocaleTimeString())
        }
      }
    } catch {
      // Ignore errors during polling
    }
  }, [deviceId, maxPoints])
  
  useEffect(() => {
    if (streaming) {
      fetchTelemetry()
      intervalRef.current = setInterval(fetchTelemetry, pollInterval)
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [streaming, fetchTelemetry, pollInterval])
  
  // Extract time series for each field
  const getStreamHistory = (streamMatcher: (streamKey: string) => boolean): number[] =>
    history
      .filter(e => (selectedSensor === "all" || e.sensor === selectedSensor) && streamMatcher(e.sensor))
      .map(e => {
        const v = e.data.value
        return typeof v === "number" ? v : NaN
      })
      .filter(v => Number.isFinite(v))
      .slice(-maxPoints)
  
  const sensors = [...new Set(history.map(e => e.sensor))]
  const latestFor = (streamMatcher: (streamKey: string) => boolean): number | null => {
    for (let i = history.length - 1; i >= 0; i--) {
      const e = history[i]
      if (!streamMatcher(e.sensor)) continue
      const v = e.data.value
      if (typeof v === "number") return v
    }
    return null
  }
  const latestTemp = latestFor(k => k.endsWith(".temperature") || k === "temperature")
  const latestHumidity = latestFor(k => k.endsWith(".humidity") || k === "humidity")
  const latestPressure = latestFor(k => k.endsWith(".pressure") || k === "pressure")
  const latestIaq = latestFor(k => k.endsWith(".iaq") || k.endsWith(".iaq_index") || k === "iaq")
  const latestVerified = Boolean(history[history.length - 1]?.verified)
  
  const exportData = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `telemetry-${deviceId}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Telemetry Charts
          <Badge variant={streaming ? "default" : "secondary"} className="ml-auto">
            {streaming ? "Live" : "Paused"}
          </Badge>
          <Badge variant={latestVerified ? "default" : "outline"} className="ml-2">
            {latestVerified ? "Verified" : "Unverified"}
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Select value={selectedSensor} onValueChange={setSelectedSensor}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sensors</SelectItem>
              {sensors.map(s => (
                <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStreaming(!streaming)}
          >
            {streaming ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTelemetry}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={exportData}
          >
            <Download className="h-4 w-4" />
          </Button>
          
          {lastUpdate && (
            <span className="text-xs text-muted-foreground ml-auto">
              Updated: {lastUpdate}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Temperature Chart */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Temperature</span>
              <span className="ml-auto text-lg font-bold">
                {typeof latestTemp === "number" ? `${latestTemp.toFixed(1)}°C` : "--"}
              </span>
            </div>
            <MiniChart 
              data={getStreamHistory(k => k.endsWith(".temperature") || k === "temperature")} 
              color="#ef4444"
            />
          </div>
          
          {/* Humidity Chart */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Humidity</span>
              <span className="ml-auto text-lg font-bold">
                {typeof latestHumidity === "number" ? `${latestHumidity.toFixed(1)}%` : "--"}
              </span>
            </div>
            <MiniChart 
              data={getStreamHistory(k => k.endsWith(".humidity") || k === "humidity")} 
              color="#3b82f6"
            />
          </div>
          
          {/* Pressure Chart */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Pressure</span>
              <span className="ml-auto text-lg font-bold">
                {typeof latestPressure === "number" ? `${latestPressure.toFixed(0)} hPa` : "--"}
              </span>
            </div>
            <MiniChart 
              data={getStreamHistory(k => k.endsWith(".pressure") || k === "pressure")} 
              color="#a855f7"
            />
          </div>
          
          {/* IAQ Chart */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Air Quality (IAQ)</span>
              <span className="ml-auto text-lg font-bold">
                {typeof latestIaq === "number" ? latestIaq.toFixed(0) : "--"}
              </span>
            </div>
            <MiniChart 
              data={getStreamHistory(k => k.endsWith(".iaq") || k.endsWith(".iaq_index") || k === "iaq")} 
              color="#22c55e"
            />
          </div>
        </div>
        
        {/* Data Points Counter */}
        <div className="mt-4 text-center text-xs text-muted-foreground">
          {history.length} data points collected
        </div>
      </CardContent>
    </Card>
  )
}

























