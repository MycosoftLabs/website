"use client"

/**
 * Node Widgets - Custom detail widgets for different node types
 * Created: Jan 26, 2026
 * 
 * Provides specialized widgets for:
 * - Orchestrator: Large command center with full controls
 * - User: Profile and session details
 * - Agent: Activity stream, tasks, messages (live)
 * - Service: Health, endpoints, dependencies
 * - Database: Query stats, connections, storage
 */

import React, { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  X,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Zap,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Terminal,
  Database,
  Server,
  User,
  Brain,
  Network,
  TrendingUp,
  Layers,
  Box,
  Workflow,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Circle,
} from "lucide-react"
import type { TopologyNode } from "./types"

// Widget size based on node type
const WIDGET_SIZES = {
  orchestrator: { width: 480, height: 520 },
  user: { width: 420, height: 400 },
  agent: { width: 380, height: 420 },
  service: { width: 360, height: 380 },
  database: { width: 360, height: 400 },
  default: { width: 320, height: 340 },
}

// Live activity item type
interface ActivityItem {
  id: string
  type: "message" | "task" | "event" | "error"
  content: string
  timestamp: Date
}

// Generate mock live activity (will be replaced by real WebSocket data)
function generateMockActivity(nodeId: string): ActivityItem[] {
  const types: ActivityItem["type"][] = ["message", "task", "event"]
  const messages = [
    "Processing incoming request",
    "Task completed successfully",
    "Syncing with coordinator",
    "Memory optimization complete",
    "Cache invalidated",
    "New connection established",
    "Workflow step executed",
    "Data pipeline updated",
  ]
  
  return Array.from({ length: 8 }, (_, i) => ({
    id: `${nodeId}-activity-${i}`,
    type: types[Math.floor(Math.random() * types.length)],
    content: messages[Math.floor(Math.random() * messages.length)],
    timestamp: new Date(Date.now() - i * 5000 - Math.random() * 10000),
  }))
}

// Status indicator component
function StatusIndicator({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500",
    busy: "bg-yellow-500",
    idle: "bg-blue-500",
    error: "bg-red-500",
    stopped: "bg-gray-500",
  }
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", colors[status] || colors.idle)} />
      <span className="text-sm font-medium capitalize">{status}</span>
    </div>
  )
}

// Metric gauge component
function MetricGauge({ 
  label, 
  value, 
  max, 
  unit,
  color = "cyan"
}: { 
  label: string
  value: number
  max: number
  unit: string
  color?: "cyan" | "green" | "purple" | "red" | "yellow"
}) {
  const percent = Math.min((value / max) * 100, 100)
  const colorClasses = {
    cyan: "text-cyan-400 stroke-cyan-400",
    green: "text-green-400 stroke-green-400",
    purple: "text-purple-400 stroke-purple-400",
    red: "text-red-400 stroke-red-400",
    yellow: "text-yellow-400 stroke-yellow-400",
  }
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-white/10"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            strokeWidth="4"
            strokeDasharray={`${percent * 1.76} 176`}
            strokeLinecap="round"
            className={colorClasses[color]}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-sm font-bold", colorClasses[color].split(" ")[0])}>
            {value.toFixed(0)}
          </span>
        </div>
      </div>
      <span className="text-[10px] text-white/50 mt-1">{label}</span>
      <span className="text-[9px] text-white/30">{unit}</span>
    </div>
  )
}

// Activity stream component (live updating)
function ActivityStream({ activities }: { activities: ActivityItem[] }) {
  const iconMap: Record<ActivityItem["type"], React.ReactNode> = {
    message: <MessageSquare className="h-3 w-3 text-cyan-400" />,
    task: <CheckCircle className="h-3 w-3 text-green-400" />,
    event: <Zap className="h-3 w-3 text-yellow-400" />,
    error: <AlertTriangle className="h-3 w-3 text-red-400" />,
  }
  
  return (
    <div className="space-y-1.5">
      {activities.slice(0, 6).map((activity, i) => (
        <div
          key={activity.id}
          className={cn(
            "flex items-start gap-2 p-2 rounded bg-white/5 transition-all duration-300",
            i === 0 && "ring-1 ring-cyan-500/30 bg-cyan-500/5"
          )}
          style={{ opacity: 1 - i * 0.1 }}
        >
          {iconMap[activity.type]}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white/80 truncate">{activity.content}</p>
            <p className="text-[9px] text-white/40">
              {new Date(activity.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============= ORCHESTRATOR WIDGET =============
function OrchestratorWidget({
  node,
  onClose,
  onAction,
}: {
  node: TopologyNode
  onClose: () => void
  onAction: (action: string, params?: Record<string, unknown>) => void
}) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  
  useEffect(() => {
    setActivities(generateMockActivity(node.id))
    const interval = setInterval(() => {
      setActivities(prev => {
        const newActivity: ActivityItem = {
          id: `${node.id}-${Date.now()}`,
          type: ["message", "task", "event"][Math.floor(Math.random() * 3)] as ActivityItem["type"],
          content: [
            "Agent coordination complete",
            "System health check passed",
            "Workflow dispatched",
            "Memory pool optimized",
            "Load balancing adjusted",
          ][Math.floor(Math.random() * 5)],
          timestamp: new Date(),
        }
        return [newActivity, ...prev.slice(0, 7)]
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [node.id])
  
  const metrics = node.metrics || {}
  
  return (
    <div className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-xl border border-purple-500/30 shadow-2xl shadow-purple-500/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-purple-900/30 border-b border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Brain className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{node.shortName}</h3>
            <p className="text-xs text-purple-300/70">{node.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusIndicator status={node.status} />
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Metrics Row */}
      <div className="flex justify-around py-4 px-4 bg-black/30">
        <MetricGauge label="CPU" value={metrics.cpuPercent || 0} max={100} unit="%" color="purple" />
        <MetricGauge label="Memory" value={(metrics.memoryMb || 0) / 10} max={100} unit="%" color="cyan" />
        <MetricGauge label="Agents" value={237} max={250} unit="active" color="green" />
        <MetricGauge label="Load" value={(metrics.cpuPercent || 0) * 0.96} max={100} unit="%" color="yellow" />
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 p-4 border-t border-white/10">
        <div className="text-center p-2 rounded bg-white/5">
          <p className="text-lg font-bold text-white">{metrics.tasksCompleted?.toLocaleString() || "45,231"}</p>
          <p className="text-[10px] text-white/50">Tasks Done</p>
        </div>
        <div className="text-center p-2 rounded bg-white/5">
          <p className="text-lg font-bold text-cyan-400">{metrics.messagesPerSecond?.toFixed(0) || "1,842"}/s</p>
          <p className="text-[10px] text-white/50">Messages</p>
        </div>
        <div className="text-center p-2 rounded bg-white/5">
          <p className="text-lg font-bold text-green-400">{((metrics.uptime || 0) / 3600).toFixed(0) || "72"}h</p>
          <p className="text-[10px] text-white/50">Uptime</p>
        </div>
        <div className="text-center p-2 rounded bg-white/5">
          <p className="text-lg font-bold text-yellow-400">{(metrics.errorRate || 0).toFixed(2)}%</p>
          <p className="text-[10px] text-white/50">Error Rate</p>
        </div>
      </div>
      
      {/* Activity Stream */}
      <div className="px-4 pb-2">
        <h4 className="text-[11px] font-semibold text-white/50 uppercase mb-2">Live Activity</h4>
        <ScrollArea className="h-32">
          <ActivityStream activities={activities} />
        </ScrollArea>
      </div>
      
      {/* Controls */}
      <div className="flex gap-2 p-4 border-t border-white/10">
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1"
          onClick={() => onAction("restart")}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Restart
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1"
          onClick={() => onAction(node.status === "active" ? "stop" : "start")}
        >
          {node.status === "active" ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
          {node.status === "active" ? "Stop" : "Start"}
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1"
          onClick={() => onAction("configure")}
        >
          <Settings className="h-4 w-4 mr-1" />
          Configure
        </Button>
      </div>
    </div>
  )
}

// ============= USER WIDGET =============
function UserWidget({
  node,
  onClose,
  onAction,
}: {
  node: TopologyNode
  onClose: () => void
  onAction: (action: string, params?: Record<string, unknown>) => void
}) {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 rounded-xl border border-blue-500/30 shadow-2xl shadow-blue-500/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-900/30 border-b border-blue-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
            <User className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{node.shortName}</h3>
            <p className="text-xs text-blue-300/70">System Administrator</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* User Stats */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-[11px] text-white/50 uppercase">Session</p>
            <p className="text-lg font-bold text-green-400">Active</p>
            <p className="text-[10px] text-white/40">Since 8:00 AM</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-[11px] text-white/50 uppercase">Role</p>
            <p className="text-lg font-bold text-blue-400">Owner</p>
            <p className="text-[10px] text-white/40">Full Access</p>
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-white/5">
          <p className="text-[11px] text-white/50 uppercase mb-2">Recent Commands</p>
          <div className="space-y-1.5">
            {["Deploy security update", "Scale agent pool", "Review audit logs", "Optimize workflows"].map((cmd, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Terminal className="h-3 w-3 text-cyan-400" />
                <span className="text-white/70">{cmd}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-3">
          <div className="flex-1 text-center p-2 rounded bg-white/5">
            <p className="text-2xl font-bold text-white">247</p>
            <p className="text-[10px] text-white/50">Agents Managed</p>
          </div>
          <div className="flex-1 text-center p-2 rounded bg-white/5">
            <p className="text-2xl font-bold text-cyan-400">1.2M</p>
            <p className="text-[10px] text-white/50">Tasks Today</p>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2 p-4 border-t border-white/10">
        <Button size="sm" variant="outline" className="flex-1">
          <MessageSquare className="h-4 w-4 mr-1" />
          Chat with MYCA
        </Button>
        <Button size="sm" variant="outline" className="flex-1">
          <Settings className="h-4 w-4 mr-1" />
          Preferences
        </Button>
      </div>
    </div>
  )
}

// ============= AGENT WIDGET =============
function AgentWidget({
  node,
  onClose,
  onAction,
}: {
  node: TopologyNode
  onClose: () => void
  onAction: (action: string, params?: Record<string, unknown>) => void
}) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  
  useEffect(() => {
    setActivities(generateMockActivity(node.id))
    const interval = setInterval(() => {
      setActivities(prev => {
        const newActivity: ActivityItem = {
          id: `${node.id}-${Date.now()}`,
          type: ["message", "task"][Math.floor(Math.random() * 2)] as ActivityItem["type"],
          content: [
            "Processing request",
            "Task completed",
            "Waiting for input",
            "Syncing data",
            "Executing workflow",
          ][Math.floor(Math.random() * 5)],
          timestamp: new Date(),
        }
        return [newActivity, ...prev.slice(0, 5)]
      })
    }, 2500)
    return () => clearInterval(interval)
  }, [node.id])
  
  const metrics = node.metrics || {}
  const categoryColors: Record<string, string> = {
    financial: "from-blue-900/20 border-blue-500/30",
    mycology: "from-green-900/20 border-green-500/30",
    research: "from-purple-900/20 border-purple-500/30",
    dao: "from-yellow-900/20 border-yellow-500/30",
    communication: "from-pink-900/20 border-pink-500/30",
    data: "from-cyan-900/20 border-cyan-500/30",
    infrastructure: "from-orange-900/20 border-orange-500/30",
    simulation: "from-indigo-900/20 border-indigo-500/30",
    security: "from-red-900/20 border-red-500/30",
    integration: "from-teal-900/20 border-teal-500/30",
    device: "from-lime-900/20 border-lime-500/30",
    chemistry: "from-violet-900/20 border-violet-500/30",
    nlm: "from-emerald-900/20 border-emerald-500/30",
    core: "from-slate-900/20 border-slate-500/30",
  }
  
  const colorClass = categoryColors[node.category] || categoryColors.core
  
  return (
    <div className={cn("bg-gradient-to-br from-slate-900 to-slate-900 rounded-xl border shadow-2xl overflow-hidden", colorClass)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/10">
            <Box className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{node.shortName}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] h-4">{node.category}</Badge>
              <StatusIndicator status={node.status} />
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Metrics */}
      <div className="flex justify-around py-3 px-3 bg-black/20">
        <MetricGauge label="CPU" value={metrics.cpuPercent || 0} max={100} unit="%" color="cyan" />
        <MetricGauge label="RAM" value={(metrics.memoryMb || 0) / 10} max={100} unit="%" color="green" />
        <MetricGauge label="Queue" value={metrics.tasksQueued || 0} max={20} unit="tasks" color="yellow" />
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5 px-3 py-2 text-center">
        <div className="p-1.5 rounded bg-white/5">
          <p className="text-sm font-bold text-white">{(metrics.tasksCompleted || 0).toLocaleString()}</p>
          <p className="text-[9px] text-white/50">Completed</p>
        </div>
        <div className="p-1.5 rounded bg-white/5">
          <p className="text-sm font-bold text-cyan-400">{(metrics.messagesPerSecond || 0).toFixed(0)}/s</p>
          <p className="text-[9px] text-white/50">Messages</p>
        </div>
        <div className="p-1.5 rounded bg-white/5">
          <p className="text-sm font-bold text-green-400">{((metrics.uptime || 0) / 3600).toFixed(1)}h</p>
          <p className="text-[9px] text-white/50">Uptime</p>
        </div>
      </div>
      
      {/* Live Activity */}
      <div className="px-3 py-2">
        <h4 className="text-[10px] font-semibold text-white/50 uppercase mb-1.5 flex items-center gap-1">
          <Activity className="h-3 w-3" />
          Live Activity
        </h4>
        <ScrollArea className="h-28">
          <ActivityStream activities={activities} />
        </ScrollArea>
      </div>
      
      {/* Controls */}
      <div className="flex gap-2 p-3 border-t border-white/10">
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => onAction("restart")}>
          <RotateCcw className="h-3 w-3 mr-1" />
          Restart
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1 h-8 text-xs"
          onClick={() => onAction(node.status === "active" ? "stop" : "start")}
        >
          {node.status === "active" ? "Stop" : "Start"}
        </Button>
      </div>
    </div>
  )
}

// ============= SERVICE WIDGET =============
function ServiceWidget({
  node,
  onClose,
  onAction,
}: {
  node: TopologyNode
  onClose: () => void
  onAction: (action: string, params?: Record<string, unknown>) => void
}) {
  const metrics = node.metrics || {}
  
  return (
    <div className="bg-gradient-to-br from-slate-900 via-teal-900/10 to-slate-900 rounded-xl border border-teal-500/30 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-teal-900/20 border-b border-teal-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/20">
            <Server className="h-5 w-5 text-teal-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{node.shortName}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] h-4">Service</Badge>
              <StatusIndicator status={node.status} />
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Health */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-sm text-white">Health Check</span>
          </div>
          <Badge className="bg-green-500/20 text-green-400">Healthy</Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded bg-white/5 text-center">
            <p className="text-lg font-bold text-white">{(metrics.messagesPerSecond || 0).toFixed(0)}</p>
            <p className="text-[10px] text-white/50">Req/sec</p>
          </div>
          <div className="p-2 rounded bg-white/5 text-center">
            <p className="text-lg font-bold text-cyan-400">{((metrics.uptime || 0) / 3600).toFixed(0)}h</p>
            <p className="text-[10px] text-white/50">Uptime</p>
          </div>
        </div>
        
        <div className="space-y-1.5">
          <p className="text-[10px] text-white/50 uppercase">Endpoints</p>
          {["/api/health", "/api/status", "/api/metrics"].map((ep, i) => (
            <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-white/5">
              <Circle className="h-2 w-2 fill-green-400 text-green-400" />
              <code className="text-white/70">{ep}</code>
            </div>
          ))}
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex gap-2 p-3 border-t border-white/10">
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => onAction("restart")}>
          Restart
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
          Logs
        </Button>
      </div>
    </div>
  )
}

// ============= DATABASE WIDGET =============
function DatabaseWidget({
  node,
  onClose,
  onAction,
}: {
  node: TopologyNode
  onClose: () => void
  onAction: (action: string, params?: Record<string, unknown>) => void
}) {
  const metrics = node.metrics || {}
  
  return (
    <div className="bg-gradient-to-br from-slate-900 via-amber-900/10 to-slate-900 rounded-xl border border-amber-500/30 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-900/20 border-b border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Database className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{node.shortName}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] h-4">Database</Badge>
              <StatusIndicator status={node.status} />
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Stats */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded bg-white/5">
            <p className="text-lg font-bold text-white">24</p>
            <p className="text-[9px] text-white/50">Connections</p>
          </div>
          <div className="p-2 rounded bg-white/5">
            <p className="text-lg font-bold text-cyan-400">1.2GB</p>
            <p className="text-[9px] text-white/50">Storage</p>
          </div>
          <div className="p-2 rounded bg-white/5">
            <p className="text-lg font-bold text-green-400">2.4ms</p>
            <p className="text-[9px] text-white/50">Latency</p>
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-white/50 uppercase">Query Rate</span>
            <span className="text-sm font-bold text-white">847/s</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 w-3/4 rounded-full" />
          </div>
        </div>
        
        <div className="flex gap-2 text-[10px]">
          <div className="flex-1 p-2 rounded bg-green-500/10 text-center">
            <ArrowUpRight className="h-3 w-3 text-green-400 mx-auto" />
            <span className="text-white/70">Reads: 12.4k/s</span>
          </div>
          <div className="flex-1 p-2 rounded bg-blue-500/10 text-center">
            <ArrowDownRight className="h-3 w-3 text-blue-400 mx-auto" />
            <span className="text-white/70">Writes: 2.1k/s</span>
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex gap-2 p-3 border-t border-white/10">
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
          Query
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
          Backup
        </Button>
      </div>
    </div>
  )
}

// ============= MAIN WIDGET CONTAINER =============
export function NodeWidgetContainer({
  node,
  onClose,
  onAction,
}: {
  node: TopologyNode | null
  onClose: () => void
  onAction: (nodeId: string, action: string, params?: Record<string, unknown>) => Promise<void>
}) {
  if (!node) return null
  
  const handleAction = (action: string, params?: Record<string, unknown>) => {
    onAction(node.id, action, params)
  }
  
  // Determine widget type based on node
  const getWidgetType = () => {
    if (node.id === "myca-orchestrator" || node.type === "orchestrator") return "orchestrator"
    if (node.id.startsWith("user-") || node.type === "user") return "user"
    if (node.type === "database") return "database"
    if (node.type === "service" || node.type === "queue" || node.type === "cache") return "service"
    return "agent"
  }
  
  const widgetType = getWidgetType()
  const size = WIDGET_SIZES[widgetType]
  
  const WidgetComponent = {
    orchestrator: OrchestratorWidget,
    user: UserWidget,
    agent: AgentWidget,
    service: ServiceWidget,
    database: DatabaseWidget,
  }[widgetType] || AgentWidget
  
  return (
    <div 
      className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        width: size.width,
        maxHeight: size.height,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
    >
      <WidgetComponent node={node} onClose={onClose} onAction={handleAction} />
    </div>
  )
}

export default NodeWidgetContainer
