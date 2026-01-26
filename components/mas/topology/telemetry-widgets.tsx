"use client"

/**
 * Telemetry Widgets Component
 * Serial-Studio inspired real-time telemetry visualization
 * Inspired by: https://github.com/Serial-Studio/Serial-Studio
 * 
 * Features:
 * - Circular gauges for CPU/Memory
 * - LED indicators for status
 * - Real-time updating values
 * - Mini console for logs
 */

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Activity,
  Gauge,
  Radio,
  Signal,
  Zap,
  Cpu,
  MemoryStick,
  Clock,
  ChevronDown,
  ChevronUp,
  Circle,
  X,
} from "lucide-react"
import type { TopologyNode, NodeStatus, NodeCategory } from "./types"
import { STATUS_COLORS, CATEGORY_COLORS } from "./types"

interface TelemetryWidgetsProps {
  nodes: TopologyNode[]
  selectedNodeId?: string | null
  className?: string
}

// Circular gauge component
function CircularGauge({
  value,
  max = 100,
  label,
  unit = "%",
  size = 80,
  color = "#22c55e",
  warningThreshold = 70,
  criticalThreshold = 90,
}: {
  value: number
  max?: number
  label: string
  unit?: string
  size?: number
  color?: string
  warningThreshold?: number
  criticalThreshold?: number
}) {
  const percentage = Math.min((value / max) * 100, 100)
  const strokeWidth = size / 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  
  // Dynamic color based on thresholds
  const gaugeColor = percentage >= criticalThreshold 
    ? "#ef4444" 
    : percentage >= warningThreshold 
      ? "#f59e0b" 
      : color
  
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#333"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={gaugeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-lg font-bold" style={{ color: gaugeColor }}>
          {value.toFixed(0)}
        </span>
        <span className="text-[10px] text-gray-400">{unit}</span>
      </div>
      <span className="text-xs text-gray-400 mt-1">{label}</span>
    </div>
  )
}

// LED indicator component
function LEDIndicator({
  status,
  label,
  blinking = false,
}: {
  status: "on" | "off" | "warning" | "error"
  label: string
  blinking?: boolean
}) {
  const colors = {
    on: "#22c55e",
    off: "#6b7280",
    warning: "#f59e0b",
    error: "#ef4444",
  }
  
  const glowColors = {
    on: "0 0 10px #22c55e, 0 0 20px #22c55e40",
    off: "none",
    warning: "0 0 10px #f59e0b, 0 0 20px #f59e0b40",
    error: "0 0 10px #ef4444, 0 0 20px #ef444440",
  }
  
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-3 h-3 rounded-full ${blinking ? "animate-pulse" : ""}`}
        style={{
          backgroundColor: colors[status],
          boxShadow: glowColors[status],
        }}
      />
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  )
}

// Status bar component (like tank/bar widget)
function StatusBar({
  value,
  max = 100,
  label,
  color = "#3b82f6",
}: {
  value: number
  max?: number
  label: string
  color?: string
}) {
  const percentage = Math.min((value / max) * 100, 100)
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono">{value.toFixed(0)}/{max}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// Category summary widget
function CategorySummary({ nodes }: { nodes: TopologyNode[] }) {
  const categoryStats = useMemo(() => {
    const stats: Record<NodeCategory, { total: number; active: number }> = {} as Record<NodeCategory, { total: number; active: number }>
    
    nodes.forEach(node => {
      if (!stats[node.category]) {
        stats[node.category] = { total: 0, active: 0 }
      }
      stats[node.category].total++
      if (node.status === "active" || node.status === "busy") {
        stats[node.category].active++
      }
    })
    
    return Object.entries(stats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8)
  }, [nodes])
  
  return (
    <div className="grid grid-cols-2 gap-2">
      {categoryStats.map(([category, stats]) => (
        <div key={category} className="flex items-center gap-2 p-1.5 rounded bg-white/5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: CATEGORY_COLORS[category as NodeCategory] }}
          />
          <span className="text-[10px] flex-1 capitalize truncate">{category}</span>
          <span className="text-[10px] font-mono text-green-400">{stats.active}</span>
          <span className="text-[10px] text-gray-500">/{stats.total}</span>
        </div>
      ))}
    </div>
  )
}

// System metrics panel
function SystemMetricsPanel({ nodes }: { nodes: TopologyNode[] }) {
  const metrics = useMemo(() => {
    const activeNodes = nodes.filter(n => n.status === "active" || n.status === "busy")
    const avgCpu = nodes.reduce((sum, n) => sum + n.metrics.cpuPercent, 0) / nodes.length
    const avgMemory = nodes.reduce((sum, n) => sum + n.metrics.memoryMb, 0) / nodes.length
    const totalMessages = nodes.reduce((sum, n) => sum + n.metrics.messagesPerSecond, 0)
    const avgErrors = nodes.reduce((sum, n) => sum + n.metrics.errorRate, 0) / nodes.length
    
    return {
      totalAgents: nodes.length,
      activeAgents: activeNodes.length,
      avgCpu,
      avgMemory,
      totalMessages,
      errorRate: avgErrors * 100,
      systemHealth: activeNodes.length / nodes.length * 100,
    }
  }, [nodes])
  
  return (
    <div className="space-y-4">
      {/* Gauges row */}
      <div className="flex justify-around">
        <div className="relative">
          <CircularGauge
            value={metrics.avgCpu}
            label="CPU"
            color="#3b82f6"
            warningThreshold={60}
            criticalThreshold={80}
          />
        </div>
        <div className="relative">
          <CircularGauge
            value={metrics.systemHealth}
            label="Health"
            color="#22c55e"
            warningThreshold={70}
            criticalThreshold={50}
          />
        </div>
        <div className="relative">
          <CircularGauge
            value={metrics.errorRate}
            label="Errors"
            max={10}
            unit="%"
            color="#f59e0b"
            warningThreshold={5}
            criticalThreshold={8}
          />
        </div>
      </div>
      
      {/* LED status panel */}
      <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-black/50">
        <LEDIndicator 
          status={metrics.systemHealth > 90 ? "on" : metrics.systemHealth > 70 ? "warning" : "error"}
          label="System OK"
          blinking={metrics.systemHealth < 70}
        />
        <LEDIndicator 
          status={metrics.activeAgents > 0 ? "on" : "off"}
          label="Agents Active"
        />
        <LEDIndicator 
          status={metrics.errorRate < 1 ? "on" : metrics.errorRate < 5 ? "warning" : "error"}
          label="Error Level"
          blinking={metrics.errorRate > 5}
        />
        <LEDIndicator 
          status={metrics.totalMessages > 0 ? "on" : "off"}
          label="Data Flow"
          blinking={true}
        />
      </div>
      
      {/* Status bars */}
      <div className="space-y-2">
        <StatusBar 
          value={metrics.activeAgents} 
          max={metrics.totalAgents} 
          label="Active Agents"
          color="#22c55e"
        />
        <StatusBar 
          value={metrics.avgMemory} 
          max={1024} 
          label="Avg Memory (MB)"
          color="#3b82f6"
        />
        <StatusBar 
          value={metrics.totalMessages} 
          max={5000} 
          label="Msgs/sec"
          color="#8b5cf6"
        />
      </div>
    </div>
  )
}

// Node telemetry panel (shown when a node is selected)
function NodeTelemetryPanel({ node }: { node: TopologyNode }) {
  return (
    <div className="space-y-4">
      {/* Node header */}
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: STATUS_COLORS[node.status] }}
        />
        <span className="font-medium text-sm flex-1 truncate">{node.shortName}</span>
        <Badge 
          variant="outline" 
          className="text-[10px]"
          style={{ borderColor: CATEGORY_COLORS[node.category], color: CATEGORY_COLORS[node.category] }}
        >
          {node.category}
        </Badge>
      </div>
      
      {/* Gauges */}
      <div className="flex justify-around">
        <div className="relative">
          <CircularGauge
            value={node.metrics.cpuPercent}
            label="CPU"
            size={70}
            color="#ef4444"
          />
        </div>
        <div className="relative">
          <CircularGauge
            value={(node.metrics.memoryMb / 1024) * 100}
            label="Memory"
            size={70}
            color="#3b82f6"
          />
        </div>
      </div>
      
      {/* Status indicators */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded bg-white/5">
          <div className="text-gray-400">Status</div>
          <div className="font-medium capitalize" style={{ color: STATUS_COLORS[node.status] }}>
            {node.status}
          </div>
        </div>
        <div className="p-2 rounded bg-white/5">
          <div className="text-gray-400">Type</div>
          <div className="font-medium capitalize">{node.type}</div>
        </div>
        <div className="p-2 rounded bg-white/5">
          <div className="text-gray-400">Msgs/sec</div>
          <div className="font-mono text-cyan-400">{node.metrics.messagesPerSecond.toFixed(1)}</div>
        </div>
        <div className="p-2 rounded bg-white/5">
          <div className="text-gray-400">Error Rate</div>
          <div className={`font-mono ${node.metrics.errorRate > 0.01 ? "text-red-400" : "text-green-400"}`}>
            {(node.metrics.errorRate * 100).toFixed(2)}%
          </div>
        </div>
      </div>
      
      {/* Task queue bar */}
      <StatusBar 
        value={node.metrics.tasksQueued} 
        max={20} 
        label="Task Queue"
        color="#f59e0b"
      />
    </div>
  )
}

export function TelemetryWidgets({
  nodes,
  selectedNodeId,
  className = "",
}: TelemetryWidgetsProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isVisible, setIsVisible] = useState(true)
  
  const selectedNode = useMemo(() => 
    nodes.find(n => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  )
  
  // Don't render if hidden
  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="absolute bottom-4 right-4 z-20 bg-black/80 border-white/10 text-white hover:bg-black/90"
        onClick={() => setIsVisible(true)}
      >
        <Gauge className="h-4 w-4 mr-2" />
        Telemetry
      </Button>
    )
  }
  
  return (
    <div className={`absolute bottom-4 right-4 z-20 max-h-[60vh] overflow-hidden ${className}`}>
      <Card className="w-72 bg-black/80 backdrop-blur-md border-white/10 text-white max-h-[60vh] overflow-hidden flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="h-4 w-4 text-cyan-400" />
              Telemetry
              <Badge variant="outline" className="text-[10px]">LIVE</Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:text-red-400"
                onClick={() => setIsVisible(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="space-y-4 overflow-y-auto flex-1">
            {selectedNode ? (
              <NodeTelemetryPanel node={selectedNode} />
            ) : (
              <>
                <SystemMetricsPanel nodes={nodes} />
                <div className="pt-2 border-t border-white/10">
                  <div className="text-xs text-gray-400 mb-2">Categories</div>
                  <CategorySummary nodes={nodes} />
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export default TelemetryWidgets
