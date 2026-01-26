"use client"

/**
 * Node Detail Panel
 * Interactive popup showing node details, metrics, and controls
 */

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  X,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Activity,
  Cpu,
  MemoryStick,
  Clock,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
  Terminal,
  Zap,
  Network,
  Eye,
  Code,
  Send,
} from "lucide-react"
import type { TopologyNode, TopologyConnection } from "./types"
import { CATEGORY_COLORS, STATUS_COLORS } from "./types"
import { MetricsChart } from "./metrics-chart"

interface NodeDetailPanelProps {
  node: TopologyNode
  connections: TopologyConnection[]
  allNodes: TopologyNode[]
  onClose: () => void
  onAction: (nodeId: string, action: string, params?: Record<string, unknown>) => Promise<void>
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

export function NodeDetailPanel({
  node,
  connections,
  allNodes,
  onClose,
  onAction,
}: NodeDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [commandInput, setCommandInput] = useState("")
  
  // Generate stable PID based on node ID to avoid hydration mismatch
  const nodePid = useMemo(() => {
    // Use a simple hash of the node ID to generate a consistent PID
    let hash = 0
    for (let i = 0; i < node.id.length; i++) {
      hash = ((hash << 5) - hash) + node.id.charCodeAt(i)
      hash = hash & hash // Convert to 32-bit integer
    }
    return 1000 + Math.abs(hash % 9000)
  }, [node.id])
  
  // Get connected nodes
  const connectedNodes = connections
    .filter(c => c.sourceId === node.id || c.targetId === node.id)
    .map(c => {
      const connectedId = c.sourceId === node.id ? c.targetId : c.sourceId
      const connectedNode = allNodes.find(n => n.id === connectedId)
      return { connection: c, node: connectedNode }
    })
    .filter(cn => cn.node)
  
  const handleAction = async (action: string) => {
    setActionLoading(action)
    try {
      await onAction(node.id, action)
    } finally {
      setActionLoading(null)
    }
  }
  
  const handleCommand = async () => {
    if (!commandInput.trim()) return
    setActionLoading("command")
    try {
      await onAction(node.id, "command", { command: commandInput })
      setCommandInput("")
    } finally {
      setActionLoading(null)
    }
  }
  
  return (
    <Card className="w-[420px] max-h-[80vh] flex flex-col shadow-2xl border-2" style={{ borderColor: CATEGORY_COLORS[node.category] + "40" }}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full animate-pulse"
              style={{ backgroundColor: STATUS_COLORS[node.status] }}
            />
            <div>
              <CardTitle className="text-lg">{node.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline" style={{ borderColor: CATEGORY_COLORS[node.category], color: CATEGORY_COLORS[node.category] }}>
                  {node.category}
                </Badge>
                <Badge variant="secondary">{node.type}</Badge>
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 grid grid-cols-5">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="charts" className="text-xs">Charts</TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs">Metrics</TabsTrigger>
          <TabsTrigger value="connections" className="text-xs">Links</TabsTrigger>
          <TabsTrigger value="terminal" className="text-xs">Terminal</TabsTrigger>
        </TabsList>
        
        <ScrollArea className="flex-1">
          <CardContent className="pt-4">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground">{node.description}</p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Cpu className="h-3 w-3" /> CPU
                  </div>
                  <div className="text-lg font-bold">{node.metrics.cpuPercent.toFixed(1)}%</div>
                  <Progress value={node.metrics.cpuPercent} className="h-1 mt-1" />
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <MemoryStick className="h-3 w-3" /> Memory
                  </div>
                  <div className="text-lg font-bold">{node.metrics.memoryMb}MB</div>
                  <Progress value={(node.metrics.memoryMb / 1024) * 100} className="h-1 mt-1" />
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" /> Uptime
                  </div>
                  <div className="text-lg font-bold">{formatUptime(node.metrics.uptime)}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <MessageSquare className="h-3 w-3" /> Msgs/sec
                  </div>
                  <div className="text-lg font-bold">{node.metrics.messagesPerSecond.toFixed(0)}</div>
                </div>
              </div>
              
              {/* Task Stats */}
              <div className="p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Task Statistics</span>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Completed</div>
                    <div className="font-mono font-bold text-green-500">
                      {node.metrics.tasksCompleted.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Queued</div>
                    <div className="font-mono font-bold text-blue-500">
                      {node.metrics.tasksQueued}
                    </div>
                  </div>
                </div>
                {node.metrics.errorRate > 0.01 && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-amber-500">
                    <AlertTriangle className="h-4 w-4" />
                    Error rate: {(node.metrics.errorRate * 100).toFixed(2)}%
                  </div>
                )}
              </div>
              
              {/* Last Activity */}
              <div className="text-xs text-muted-foreground">
                Last active: {new Date(node.metrics.lastActive).toLocaleString()}
              </div>
            </TabsContent>
            
            {/* Charts Tab - Grafana-style time-series */}
            <TabsContent value="charts" className="mt-0">
              <MetricsChart node={node} />
            </TabsContent>
            
            {/* Metrics Tab */}
            <TabsContent value="metrics" className="mt-0 space-y-4">
              <div className="space-y-3">
                {/* CPU Detail */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CPU Usage</span>
                    <span className="font-mono">{node.metrics.cpuPercent.toFixed(2)}%</span>
                  </div>
                  <Progress value={node.metrics.cpuPercent} className="h-2" />
                </div>
                
                {/* Memory Detail */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Memory</span>
                    <span className="font-mono">{node.metrics.memoryMb}MB / 1024MB</span>
                  </div>
                  <Progress value={(node.metrics.memoryMb / 1024) * 100} className="h-2" />
                </div>
                
                {/* Message Rate */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Message Throughput</div>
                  <div className="text-2xl font-bold">{node.metrics.messagesPerSecond.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">messages per second</div>
                </div>
                
                {/* Error Rate */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Error Rate</div>
                  <div className={`text-2xl font-bold ${node.metrics.errorRate > 0.05 ? "text-red-500" : node.metrics.errorRate > 0.01 ? "text-amber-500" : "text-green-500"}`}>
                    {(node.metrics.errorRate * 100).toFixed(3)}%
                  </div>
                  <Progress value={node.metrics.errorRate * 100} className="h-1 mt-2" />
                </div>
                
                {/* Uptime */}
                <div className="flex justify-between items-center p-3 rounded-lg border">
                  <div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                    <div className="font-bold">{formatUptime(node.metrics.uptime)}</div>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
            </TabsContent>
            
            {/* Connections Tab */}
            <TabsContent value="connections" className="mt-0 space-y-3">
              <div className="text-sm text-muted-foreground mb-2">
                {connectedNodes.length} active connections
              </div>
              
              {connectedNodes.map(({ connection, node: connNode }) => (
                <div key={connection.id} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: connNode ? STATUS_COLORS[connNode.status] : "#6b7280" }}
                      />
                      <span className="font-medium text-sm">{connNode?.shortName || "Unknown"}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {connection.type}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <div>Traffic</div>
                      <div className="font-mono">{connection.traffic.messagesPerSecond.toFixed(0)}/s</div>
                    </div>
                    <div>
                      <div>Latency</div>
                      <div className="font-mono">{connection.traffic.latencyMs.toFixed(1)}ms</div>
                    </div>
                    <div>
                      <div>Bandwidth</div>
                      <div className="font-mono">{formatBytes(connection.traffic.bytesPerSecond)}/s</div>
                    </div>
                  </div>
                  
                  {connection.bidirectional && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Network className="h-3 w-3" />
                      Bidirectional
                    </div>
                  )}
                </div>
              ))}
              
              {connectedNodes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No active connections
                </div>
              )}
            </TabsContent>
            
            {/* Terminal Tab */}
            <TabsContent value="terminal" className="mt-0 space-y-3">
              <div className="bg-black rounded-lg p-3 font-mono text-xs text-green-400 h-[200px] overflow-auto">
                <div>$ agent status {node.id}</div>
                <div className="text-gray-400">Agent: {node.name}</div>
                <div className="text-gray-400">Status: <span style={{ color: STATUS_COLORS[node.status] }}>{node.status}</span></div>
                <div className="text-gray-400">PID: {nodePid}</div>
                <div className="text-gray-400">CPU: {node.metrics.cpuPercent.toFixed(1)}%</div>
                <div className="text-gray-400">MEM: {node.metrics.memoryMb}MB</div>
                <div className="text-gray-400">Uptime: {formatUptime(node.metrics.uptime)}</div>
                <div className="mt-2">$ _</div>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCommand()}
                  placeholder="Enter command..."
                  className="flex-1 px-3 py-2 text-sm rounded-md border bg-background"
                />
                <Button size="sm" onClick={handleCommand} disabled={actionLoading === "command"}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-1">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setCommandInput("status")}>
                  status
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setCommandInput("logs")}>
                  logs
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setCommandInput("tasks")}>
                  tasks
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setCommandInput("config")}>
                  config
                </Button>
              </div>
            </TabsContent>
          </CardContent>
        </ScrollArea>
      </Tabs>
      
      {/* Action Buttons */}
      <CardFooter className="pt-3 border-t">
        <div className="flex gap-2 w-full">
          {node.canStop && node.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleAction("stop")}
              disabled={actionLoading === "stop"}
            >
              {actionLoading === "stop" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              <span className="ml-1">Stop</span>
            </Button>
          )}
          
          {node.canStart && node.status !== "active" && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleAction("start")}
              disabled={actionLoading === "start"}
            >
              {actionLoading === "start" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span className="ml-1">Start</span>
            </Button>
          )}
          
          {node.canRestart && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleAction("restart")}
              disabled={actionLoading === "restart"}
            >
              {actionLoading === "restart" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-1">Restart</span>
            </Button>
          )}
          
          {node.canConfigure && (
            <Button variant="outline" size="sm" onClick={() => handleAction("configure")}>
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
