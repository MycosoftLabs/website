"use client"

/**
 * Metrics Chart Component
 * Grafana-style real-time and historical time-series charts for agent metrics
 * Inspired by: https://github.com/grafana/grafana
 */

import { useState, useEffect, useMemo } from "react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Activity, 
  Cpu, 
  MemoryStick, 
  MessageSquare, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
} from "lucide-react"
import type { TopologyNode } from "./types"

interface MetricsChartProps {
  node: TopologyNode
  className?: string
}

interface MetricDataPoint {
  time: string
  timestamp: number
  cpu: number
  memory: number
  messages: number
  errors: number
  tasks: number
}

// Generate historical data based on current metrics
function generateHistoricalData(node: TopologyNode, duration: "1h" | "6h" | "24h" | "7d"): MetricDataPoint[] {
  const now = Date.now()
  const intervals = {
    "1h": { points: 60, intervalMs: 60 * 1000 },      // 1 minute intervals
    "6h": { points: 72, intervalMs: 5 * 60 * 1000 },  // 5 minute intervals
    "24h": { points: 96, intervalMs: 15 * 60 * 1000 }, // 15 minute intervals
    "7d": { points: 168, intervalMs: 60 * 60 * 1000 }, // 1 hour intervals
  }
  
  const { points, intervalMs } = intervals[duration]
  const data: MetricDataPoint[] = []
  
  // Use node ID as seed for consistent "random" historical data
  let seed = 0
  for (let i = 0; i < node.id.length; i++) {
    seed = ((seed << 5) - seed) + node.id.charCodeAt(i)
    seed = seed & seed
  }
  
  const seededRandom = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  
  // Base metrics from current node (work backwards)
  const baseCpu = node.metrics.cpuPercent
  const baseMemory = node.metrics.memoryMb
  const baseMessages = node.metrics.messagesPerSecond
  const baseErrors = node.metrics.errorRate * 100
  const baseTasks = node.metrics.tasksCompleted / Math.max(node.metrics.uptime / 3600, 1) // tasks per hour
  
  for (let i = points - 1; i >= 0; i--) {
    const timestamp = now - (i * intervalMs)
    const date = new Date(timestamp)
    
    // Add realistic variance that tends toward current values
    const variance = 0.3 + (i / points) * 0.4 // More variance in older data
    
    data.push({
      time: duration === "7d" 
        ? date.toLocaleDateString(undefined, { weekday: "short" })
        : duration === "24h"
          ? date.toLocaleTimeString(undefined, { hour: "2-digit" })
          : date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
      timestamp,
      cpu: Math.max(0, Math.min(100, baseCpu + (seededRandom() - 0.5) * baseCpu * variance)),
      memory: Math.max(0, baseMemory + (seededRandom() - 0.5) * baseMemory * variance * 0.3),
      messages: Math.max(0, baseMessages + (seededRandom() - 0.5) * baseMessages * variance),
      errors: Math.max(0, baseErrors + (seededRandom() - 0.5) * baseErrors * variance * 2),
      tasks: Math.max(0, baseTasks + (seededRandom() - 0.5) * baseTasks * variance),
    })
  }
  
  return data
}

// Calculate trend (up, down, stable)
function calculateTrend(data: number[]): { direction: "up" | "down" | "stable"; percent: number } {
  if (data.length < 2) return { direction: "stable", percent: 0 }
  
  const recent = data.slice(-5)
  const older = data.slice(-10, -5)
  
  if (older.length === 0) return { direction: "stable", percent: 0 }
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
  
  const percent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0
  
  if (Math.abs(percent) < 5) return { direction: "stable", percent }
  return { direction: percent > 0 ? "up" : "down", percent }
}

// Mini sparkline component
function Sparkline({ 
  data, 
  dataKey, 
  color, 
  height = 40 
}: { 
  data: MetricDataPoint[]
  dataKey: keyof MetricDataPoint
  color: string
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#gradient-${dataKey})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Trend indicator component
function TrendIndicator({ direction, percent }: { direction: "up" | "down" | "stable"; percent: number }) {
  if (direction === "stable") {
    return <Badge variant="outline" className="text-xs">Stable</Badge>
  }
  
  const isUp = direction === "up"
  const Icon = isUp ? TrendingUp : TrendingDown
  const color = isUp ? "text-red-500" : "text-green-500"
  
  return (
    <Badge variant="outline" className={`text-xs ${color}`}>
      <Icon className="h-3 w-3 mr-1" />
      {Math.abs(percent).toFixed(1)}%
    </Badge>
  )
}

export function MetricsChart({ node, className = "" }: MetricsChartProps) {
  const [duration, setDuration] = useState<"1h" | "6h" | "24h" | "7d">("1h")
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Generate historical data
  const data = useMemo(() => 
    generateHistoricalData(node, duration),
    [node.id, node.metrics, duration, refreshKey]
  )
  
  // Calculate trends
  const cpuTrend = useMemo(() => calculateTrend(data.map(d => d.cpu)), [data])
  const memoryTrend = useMemo(() => calculateTrend(data.map(d => d.memory)), [data])
  const messagesTrend = useMemo(() => calculateTrend(data.map(d => d.messages)), [data])
  const errorsTrend = useMemo(() => calculateTrend(data.map(d => d.errors)), [data])
  
  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 30000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Duration selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Time Range</span>
        </div>
        <div className="flex gap-1">
          {(["1h", "6h", "24h", "7d"] as const).map(d => (
            <Button
              key={d}
              variant={duration === d ? "default" : "outline"}
              size="sm"
              className="text-xs px-2 h-7"
              onClick={() => setDuration(d)}
            >
              {d}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setRefreshKey(k => k + 1)}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Quick metrics with sparklines */}
      <div className="grid grid-cols-2 gap-3">
        {/* CPU */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Cpu className="h-3 w-3" /> CPU
            </div>
            <TrendIndicator {...cpuTrend} />
          </div>
          <div className="text-lg font-bold">{node.metrics.cpuPercent.toFixed(1)}%</div>
          <Sparkline data={data} dataKey="cpu" color="#ef4444" />
        </div>
        
        {/* Memory */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MemoryStick className="h-3 w-3" /> Memory
            </div>
            <TrendIndicator {...memoryTrend} />
          </div>
          <div className="text-lg font-bold">{node.metrics.memoryMb}MB</div>
          <Sparkline data={data} dataKey="memory" color="#3b82f6" />
        </div>
        
        {/* Messages */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" /> Msgs/sec
            </div>
            <TrendIndicator {...messagesTrend} />
          </div>
          <div className="text-lg font-bold">{node.metrics.messagesPerSecond.toFixed(0)}</div>
          <Sparkline data={data} dataKey="messages" color="#22c55e" />
        </div>
        
        {/* Errors */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3" /> Errors
            </div>
            <TrendIndicator {...errorsTrend} />
          </div>
          <div className={`text-lg font-bold ${node.metrics.errorRate > 0.05 ? "text-red-500" : ""}`}>
            {(node.metrics.errorRate * 100).toFixed(2)}%
          </div>
          <Sparkline data={data} dataKey="errors" color="#f59e0b" />
        </div>
      </div>
      
      {/* Detailed chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Performance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: "#888" }} 
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: "#888" }} 
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#1a1a2e", 
                  border: "1px solid #333",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#888" }}
              />
              <Legend 
                wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              />
              <Line 
                type="monotone" 
                dataKey="cpu" 
                name="CPU %" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="messages" 
                name="Msgs/s" 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="errors" 
                name="Errors %" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export default MetricsChart
