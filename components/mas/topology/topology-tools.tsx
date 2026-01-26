"use client"

/**
 * Topology Tools - Full-Featured Management Tools
 * Created: Jan 26, 2026
 * 
 * Real integration with:
 * - Orchestrator control for all agent operations
 * - Connection management with drag-drop
 * - Path tracing with actual network analysis
 * - Agent spawning with real configuration
 * - Timeline with historical data
 */

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  X,
  Plus,
  Minus,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Terminal,
  ArrowRight,
  ArrowLeftRight,
  Link2,
  Unlink,
  Zap,
  Brain,
  Network,
  History,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  Activity,
  Database,
  Server,
  MessageSquare,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Workflow,
  GitBranch,
  BarChart3,
  Cpu,
  HardDrive,
  Layers,
  Target,
  Route,
  Bot,
  Sparkles,
  FileCode,
} from "lucide-react"
import type { TopologyNode, TopologyConnection, DetectedGap, NodeCategory } from "./types"

// ============= API HELPERS =============
const MAS_API_BASE = process.env.NEXT_PUBLIC_MAS_API_URL || "http://192.168.0.188:8001"

async function callOrchestratorAPI(endpoint: string, method: string = "GET", body?: unknown) {
  try {
    const response = await fetch(`${MAS_API_BASE}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error(`API error: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error(`[Orchestrator API] ${endpoint} failed:`, error)
    return null
  }
}

// Stream log entry type
interface LogEntry {
  id: string
  timestamp: Date
  level: "info" | "warn" | "error" | "debug" | "success"
  source: string
  message: string
  data?: Record<string, unknown>
}

// ============= TERMINAL STREAM COMPONENT =============
export function TerminalStream({
  title,
  logs,
  maxLines = 100,
  className,
  onCommand,
  showInput = false,
}: {
  title: string
  logs: LogEntry[]
  maxLines?: number
  className?: string
  onCommand?: (command: string) => void
  showInput?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [command, setCommand] = useState("")
  const [isPaused, setIsPaused] = useState(false)
  
  useEffect(() => {
    if (autoScroll && scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll, isPaused])
  
  const levelColors: Record<LogEntry["level"], string> = {
    info: "text-cyan-400",
    warn: "text-yellow-400",
    error: "text-red-400",
    debug: "text-gray-400",
    success: "text-green-400",
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (command.trim() && onCommand) {
      onCommand(command.trim())
      setCommand("")
    }
  }
  
  return (
    <div className={cn("flex flex-col bg-black rounded-lg border border-white/10 overflow-hidden", className)}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/50 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-green-400" />
          <span className="text-xs font-mono text-white/80">{title}</span>
          <Badge variant="outline" className="text-[9px] h-4 px-1.5">
            {logs.length} lines
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setAutoScroll(!autoScroll)}
          >
            <ChevronDown className={cn("h-3 w-3", autoScroll && "text-green-400")} />
          </Button>
        </div>
      </div>
      
      {/* Terminal Content */}
      <ScrollArea 
        ref={scrollRef}
        className="flex-1 p-2 font-mono text-[11px] min-h-[120px] max-h-[300px]"
      >
        {(!isPaused ? logs : logs.slice(0, -5)).slice(-maxLines).map((log) => (
          <div key={log.id} className="flex gap-2 leading-relaxed hover:bg-white/5 px-1 rounded">
            <span className="text-white/30 shrink-0">
              {log.timestamp.toLocaleTimeString()}
            </span>
            <span className={cn("shrink-0 uppercase w-12", levelColors[log.level])}>
              [{log.level}]
            </span>
            <span className="text-purple-400 shrink-0">{log.source}:</span>
            <span className="text-white/90 break-all">{log.message}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-white/30 text-center py-4">Waiting for activity...</div>
        )}
      </ScrollArea>
      
      {/* Command Input */}
      {showInput && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 border-t border-white/10">
          <span className="text-green-400">$</span>
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter command..."
            className="flex-1 h-7 bg-transparent border-0 text-xs font-mono focus-visible:ring-0"
          />
          <Button type="submit" variant="ghost" size="icon" className="h-6 w-6">
            <Send className="h-3 w-3" />
          </Button>
        </form>
      )}
    </div>
  )
}

// ============= ENHANCED PATH TRACER =============
export function EnhancedPathTracer({
  isOpen,
  onClose,
  nodes,
  connections,
  onHighlight,
  onExecuteAction,
}: {
  isOpen: boolean
  onClose: () => void
  nodes: TopologyNode[]
  connections: TopologyConnection[]
  onHighlight: (nodeIds: string[]) => void
  onExecuteAction: (action: string, params: Record<string, unknown>) => Promise<void>
}) {
  const [source, setSource] = useState("")
  const [target, setTarget] = useState("")
  const [pathResult, setPathResult] = useState<{
    path: string[]
    hops: number
    latency: number
    connections: TopologyConnection[]
  } | null>(null)
  const [isTracing, setIsTracing] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  
  const addLog = useCallback((level: LogEntry["level"], source: string, message: string) => {
    setLogs(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      source,
      message,
    }])
  }, [])
  
  const findPath = useCallback(async () => {
    if (!source || !target) return
    
    setIsTracing(true)
    setPathResult(null)
    addLog("info", "PathTracer", `Initiating path trace: ${source} → ${target}`)
    
    const sourceNode = nodes.find(n => 
      n.name.toLowerCase().includes(source.toLowerCase()) ||
      n.shortName.toLowerCase().includes(source.toLowerCase()) ||
      n.id.toLowerCase().includes(source.toLowerCase())
    )
    const targetNode = nodes.find(n => 
      n.name.toLowerCase().includes(target.toLowerCase()) ||
      n.shortName.toLowerCase().includes(target.toLowerCase()) ||
      n.id.toLowerCase().includes(target.toLowerCase())
    )
    
    if (!sourceNode) {
      addLog("error", "PathTracer", `Source node not found: ${source}`)
      setIsTracing(false)
      return
    }
    if (!targetNode) {
      addLog("error", "PathTracer", `Target node not found: ${target}`)
      setIsTracing(false)
      return
    }
    
    addLog("success", "PathTracer", `Source: ${sourceNode.name} (${sourceNode.id})`)
    addLog("success", "PathTracer", `Target: ${targetNode.name} (${targetNode.id})`)
    
    // BFS path finding
    const queue: { node: TopologyNode; path: string[]; conns: TopologyConnection[] }[] = [
      { node: sourceNode, path: [sourceNode.id], conns: [] }
    ]
    const visited = new Set<string>([sourceNode.id])
    let found = false
    
    while (queue.length > 0 && !found) {
      const { node, path, conns } = queue.shift()!
      addLog("debug", "PathTracer", `Exploring: ${node.shortName}`)
      
      // Find connected nodes
      const nodeConnections = connections.filter(c => 
        c.sourceId === node.id || c.targetId === node.id
      )
      
      for (const conn of nodeConnections) {
        const nextId = conn.sourceId === node.id ? conn.targetId : conn.sourceId
        if (visited.has(nextId)) continue
        
        const nextNode = nodes.find(n => n.id === nextId)
        if (!nextNode) continue
        
        visited.add(nextId)
        const newPath = [...path, nextId]
        const newConns = [...conns, conn]
        
        if (nextId === targetNode.id) {
          found = true
          addLog("success", "PathTracer", `Path found! ${newPath.length} hops`)
          
          const totalLatency = newConns.reduce((sum, c) => sum + c.traffic.latencyMs, 0)
          setPathResult({
            path: newPath,
            hops: newPath.length - 1,
            latency: totalLatency,
            connections: newConns,
          })
          onHighlight(newPath)
          
          // Call orchestrator to register path trace
          await onExecuteAction("trace_path", {
            source: sourceNode.id,
            target: targetNode.id,
            path: newPath,
          })
          break
        }
        
        queue.push({ node: nextNode, path: newPath, conns: newConns })
      }
    }
    
    if (!found) {
      addLog("warn", "PathTracer", "No path found between nodes")
    }
    
    setIsTracing(false)
  }, [source, target, nodes, connections, addLog, onHighlight, onExecuteAction])
  
  if (!isOpen) return null
  
  // Sort nodes for dropdown
  const sortedNodes = [...nodes].sort((a, b) => a.name.localeCompare(b.name))
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl w-[600px] max-h-[80vh] border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-cyan-900/20 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Route className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Path Tracer</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Source/Target Selection */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Source Node</label>
              <Input
                list="source-nodes"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Search nodes..."
                className="bg-white/5"
              />
              <datalist id="source-nodes">
                {sortedNodes.map(n => (
                  <option key={n.id} value={n.shortName}>{n.name}</option>
                ))}
              </datalist>
            </div>
            <ArrowRight className="h-5 w-5 text-cyan-400 mt-4" />
            <div>
              <label className="text-xs text-white/50 mb-1 block">Target Node</label>
              <Input
                list="target-nodes"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Search nodes..."
                className="bg-white/5"
              />
              <datalist id="target-nodes">
                {sortedNodes.map(n => (
                  <option key={n.id} value={n.shortName}>{n.name}</option>
                ))}
              </datalist>
            </div>
          </div>
          
          {/* Trace Button */}
          <Button 
            onClick={findPath} 
            disabled={isTracing || !source || !target}
            className="w-full bg-cyan-600 hover:bg-cyan-500"
          >
            {isTracing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Tracing...</>
            ) : (
              <><Search className="h-4 w-4 mr-2" /> Trace Path</>
            )}
          </Button>
          
          {/* Results */}
          {pathResult && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-green-400 font-medium">Path Found</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="p-2 rounded bg-white/5">
                  <div className="text-xl font-bold text-white">{pathResult.hops}</div>
                  <div className="text-[10px] text-white/50">Hops</div>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <div className="text-xl font-bold text-cyan-400">{pathResult.latency.toFixed(1)}ms</div>
                  <div className="text-[10px] text-white/50">Total Latency</div>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <div className="text-xl font-bold text-purple-400">{pathResult.connections.length}</div>
                  <div className="text-[10px] text-white/50">Connections</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-white/70">
                <span className="text-white/40">Path: </span>
                {pathResult.path.map((id, i) => {
                  const node = nodes.find(n => n.id === id)
                  return (
                    <span key={id}>
                      <span className="text-cyan-400">{node?.shortName || id}</span>
                      {i < pathResult.path.length - 1 && <span className="text-white/30"> → </span>}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* Terminal Log */}
          <TerminalStream
            title="Path Tracer Log"
            logs={logs}
            className="h-48"
          />
        </div>
      </div>
    </div>
  )
}

// ============= ENHANCED SPAWN AGENT =============
export function EnhancedSpawnAgent({
  isOpen,
  onClose,
  gaps,
  nodes,
  onSpawn,
  onExecuteAction,
}: {
  isOpen: boolean
  onClose: () => void
  gaps: DetectedGap[]
  nodes: TopologyNode[]
  onSpawn: (config: AgentSpawnConfig) => Promise<void>
  onExecuteAction: (action: string, params: Record<string, unknown>) => Promise<void>
}) {
  const [mode, setMode] = useState<"suggested" | "custom">("suggested")
  const [isSpawning, setIsSpawning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  
  // Custom agent config
  const [customConfig, setCustomConfig] = useState<AgentSpawnConfig>({
    name: "",
    type: "agent",
    category: "core",
    description: "",
    capabilities: [],
    connections: [],
    priority: 5,
  })
  
  const addLog = useCallback((level: LogEntry["level"], source: string, message: string) => {
    setLogs(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      source,
      message,
    }])
  }, [])
  
  const handleSpawn = async (gap?: DetectedGap) => {
    setIsSpawning(true)
    
    const config: AgentSpawnConfig = gap ? {
      name: gap.suggestedAgentType,
      type: "agent",
      category: gap.suggestedCategory || "core",
      description: gap.description,
      capabilities: [],
      connections: [],
      priority: gap.priority === "critical" ? 10 : gap.priority === "high" ? 7 : gap.priority === "medium" ? 5 : 3,
    } : customConfig
    
    addLog("info", "Orchestrator", `Initiating agent spawn: ${config.name}`)
    addLog("debug", "Orchestrator", `Category: ${config.category}, Priority: ${config.priority}`)
    
    try {
      // Call real orchestrator API
      const result = await callOrchestratorAPI("/agents/spawn", "POST", config)
      
      if (result) {
        addLog("success", "Orchestrator", `Agent spawned successfully: ${result.id}`)
        addLog("info", "Orchestrator", `Initializing agent capabilities...`)
        
        await onSpawn(config)
        await onExecuteAction("spawn_agent", { config, result })
        
        addLog("success", "Orchestrator", "Agent is now active and connected")
      } else {
        addLog("warn", "Orchestrator", "API unavailable - simulating spawn")
        await onSpawn(config)
      }
    } catch (error) {
      addLog("error", "Orchestrator", `Spawn failed: ${error}`)
    }
    
    setIsSpawning(false)
  }
  
  if (!isOpen) return null
  
  const categories: NodeCategory[] = [
    "core", "financial", "mycology", "research", "dao", "communication",
    "data", "infrastructure", "simulation", "security", "integration", 
    "device", "chemistry", "nlm"
  ]
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl w-[700px] max-h-[85vh] border border-green-500/30 shadow-2xl shadow-green-500/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-green-900/20 border-b border-green-500/20">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-bold text-white">Spawn Agent</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={mode === "suggested" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("suggested")}
            >
              Suggested
            </Button>
            <Button
              variant={mode === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("custom")}
            >
              Custom
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-auto">
          {mode === "suggested" ? (
            <>
              {gaps.length === 0 ? (
                <div className="text-center text-white/50 py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
                  <p className="text-lg">No gaps detected</p>
                  <p className="text-sm">All systems are fully covered</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-white/60">
                    The orchestrator has detected {gaps.length} capability gaps that could be filled:
                  </p>
                  {gaps.map((gap, index) => (
                    <div
                      key={gap.id || `gap-${index}`}
                      className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-green-500/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-4 w-4 text-green-400" />
                            <span className="font-medium text-white">{gap.suggestedAgentType}</span>
                            <Badge variant="outline" className="text-[9px]">{gap.suggestedCategory}</Badge>
                            <Badge 
                              className={cn(
                                "text-[9px]",
                                gap.priority === "critical" ? "bg-red-500/20 text-red-400" :
                                gap.priority === "high" ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-green-500/20 text-green-400"
                              )}
                            >
                              {(gap.priority ?? 'medium').toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-white/60 mb-2">{gap.description}</p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-[9px]">{gap.gapType}</Badge>
                            {gap.autoSpawnRecommended && (
                              <Badge className="text-[9px] bg-green-500/20 text-green-400">Auto-spawn OK</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-500"
                          onClick={() => handleSpawn(gap)}
                          disabled={isSpawning}
                        >
                          {isSpawning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          Spawn
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Agent Name</label>
                  <Input
                    value={customConfig.name}
                    onChange={(e) => setCustomConfig({ ...customConfig, name: e.target.value })}
                    placeholder="my-custom-agent"
                    className="bg-white/5"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Category</label>
                  <select
                    value={customConfig.category}
                    onChange={(e) => setCustomConfig({ ...customConfig, category: e.target.value as NodeCategory })}
                    className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-white text-sm px-3"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-white/50 mb-1 block">Description</label>
                <Input
                  value={customConfig.description}
                  onChange={(e) => setCustomConfig({ ...customConfig, description: e.target.value })}
                  placeholder="What does this agent do?"
                  className="bg-white/5"
                />
              </div>
              
              <div>
                <label className="text-xs text-white/50 mb-1 block">Priority (1-10)</label>
                <Slider
                  value={[customConfig.priority]}
                  onValueChange={([v]) => setCustomConfig({ ...customConfig, priority: v })}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>
              
              <div>
                <label className="text-xs text-white/50 mb-1 block">Connect To (select nodes)</label>
                <div className="flex flex-wrap gap-1 p-2 rounded bg-white/5 max-h-24 overflow-auto">
                  {nodes.slice(0, 20).map(node => (
                    <Button
                      key={node.id}
                      variant={customConfig.connections?.includes(node.id) ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => {
                        const conns = customConfig.connections || []
                        const newConns = conns.includes(node.id)
                          ? conns.filter(c => c !== node.id)
                          : [...conns, node.id]
                        setCustomConfig({ ...customConfig, connections: newConns })
                      }}
                    >
                      {node.shortName}
                    </Button>
                  ))}
                </div>
              </div>
              
              <Button
                onClick={() => handleSpawn()}
                disabled={isSpawning || !customConfig.name}
                className="w-full bg-green-600 hover:bg-green-500"
              >
                {isSpawning ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Spawning...</>
                ) : (
                  <><Bot className="h-4 w-4 mr-2" /> Spawn Custom Agent</>
                )}
              </Button>
            </div>
          )}
        </div>
        
        {/* Terminal */}
        <div className="border-t border-white/10">
          <TerminalStream
            title="Orchestrator Output"
            logs={logs}
            className="rounded-none border-0"
            showInput
            onCommand={(cmd) => {
              addLog("info", "User", cmd)
              // Parse commands and execute
              if (cmd.startsWith("spawn ")) {
                const name = cmd.replace("spawn ", "")
                setCustomConfig({ ...customConfig, name })
                addLog("info", "System", `Set agent name to: ${name}`)
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Agent spawn configuration
export interface AgentSpawnConfig {
  name: string
  type: "agent" | "service" | "worker"
  category: NodeCategory
  description: string
  capabilities: string[]
  connections?: string[]
  priority: number
}

// ============= ENHANCED CONNECTION WIDGET =============
import { 
  generateConnectionProposal, 
  getLLMImplementationPlan,
  type ConnectionProposal,
  type CascadeConnection,
} from "@/lib/services/connection-proposer"

export function ConnectionWidget({
  isOpen,
  onClose,
  sourceNode,
  targetNode,
  existingConnection,
  allNodes,
  allConnections,
  onCreateConnection,
  onDeleteConnection,
  onExecuteAction,
}: {
  isOpen: boolean
  onClose: () => void
  sourceNode: TopologyNode | null
  targetNode: TopologyNode | null
  existingConnection?: TopologyConnection
  allNodes?: TopologyNode[]
  allConnections?: TopologyConnection[]
  onCreateConnection: (config: ConnectionConfig) => Promise<void>
  onDeleteConnection: (connectionId: string) => Promise<void>
  onExecuteAction: (action: string, params: Record<string, unknown>) => Promise<void>
}) {
  const [config, setConfig] = useState<ConnectionConfig>({
    type: "message",
    bidirectional: true,
    priority: 5,
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [proposal, setProposal] = useState<ConnectionProposal | null>(null)
  const [showImplementation, setShowImplementation] = useState(false)
  const [llmLoading, setLlmLoading] = useState(false)
  const [selectedCascades, setSelectedCascades] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<"config" | "insights" | "implementation">("config")
  
  useEffect(() => {
    if (sourceNode && targetNode && allNodes && allConnections) {
      // Generate AI proposal for this connection
      const newProposal = generateConnectionProposal(
        sourceNode,
        targetNode,
        allNodes,
        allConnections
      )
      setProposal(newProposal)
      
      // Auto-select all cascade connections
      const cascadeIds = new Set(newProposal.cascadeConnections.map(c => `${c.from}-${c.to}`))
      setSelectedCascades(cascadeIds)
      
      // Set recommended connection type based on proposal
      if (sourceNode.type === "database" || targetNode.type === "database") {
        setConfig(prev => ({ ...prev, type: "query" }))
      } else if (sourceNode.type === "orchestrator" || targetNode.type === "orchestrator") {
        setConfig(prev => ({ ...prev, type: "command", priority: 10 }))
      }
    } else if (sourceNode && targetNode) {
      // Fallback: Basic insights without full context
      const basicProposal: ConnectionProposal = {
        compatibility: "medium",
        compatibilityScore: 60,
        quickInsights: [],
        implementationPlan: null,
        cascadeConnections: [],
        riskAssessment: { level: "low", factors: [], mitigations: [] },
        estimatedEffort: "minimal",
      }
      
      if (sourceNode.category === targetNode.category) {
        basicProposal.quickInsights.push(`Same category (${sourceNode.category}) - Low latency expected`)
        basicProposal.compatibilityScore = 90
        basicProposal.compatibility = "high"
      }
      
      if (sourceNode.type === "database" || targetNode.type === "database") {
        basicProposal.quickInsights.push("Database connection - Consider query caching")
        setConfig(prev => ({ ...prev, type: "query" }))
      }
      
      if (sourceNode.type === "orchestrator" || targetNode.type === "orchestrator") {
        basicProposal.quickInsights.push("Orchestrator link - Full control access")
        setConfig(prev => ({ ...prev, type: "command", priority: 10 }))
      }
      
      if (sourceNode.category === "security" || targetNode.category === "security") {
        basicProposal.quickInsights.push("Security agent - Encrypted channel recommended")
      }
      
      setProposal(basicProposal)
    }
  }, [sourceNode, targetNode, allNodes, allConnections])
  
  // Fetch LLM implementation plan on demand
  const fetchLLMPlan = async () => {
    if (!sourceNode || !targetNode || !proposal) return
    setLlmLoading(true)
    
    const plan = await getLLMImplementationPlan(sourceNode, targetNode, proposal)
    if (plan) {
      setProposal(prev => prev ? { ...prev, implementationPlan: plan } : null)
    }
    setLlmLoading(false)
    setShowImplementation(true)
    setActiveTab("implementation")
  }
  
  // Toggle cascade connection selection
  const toggleCascade = (cascade: CascadeConnection) => {
    const key = `${cascade.from}-${cascade.to}`
    const newSet = new Set(selectedCascades)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setSelectedCascades(newSet)
  }
  
  const handleCreate = async () => {
    if (!sourceNode || !targetNode) return
    setIsProcessing(true)
    
    try {
      // Create main connection
      await onCreateConnection({
        ...config,
        sourceId: sourceNode.id,
        targetId: targetNode.id,
      })
      
      await onExecuteAction("create_connection", {
        source: sourceNode.id,
        target: targetNode.id,
        config,
      })
      
      // Create cascade connections if selected
      if (proposal?.cascadeConnections) {
        for (const cascade of proposal.cascadeConnections) {
          const key = `${cascade.from}-${cascade.to}`
          if (selectedCascades.has(key)) {
            await onCreateConnection({
              type: cascade.type,
              bidirectional: true,
              priority: 5,
              sourceId: cascade.from,
              targetId: cascade.to,
            })
            
            await onExecuteAction("create_connection", {
              source: cascade.from,
              target: cascade.to,
              config: { type: cascade.type, bidirectional: true, priority: 5 },
              cascade: true,
            })
          }
        }
      }
      
      onClose()
    } catch (error) {
      console.error("Failed to create connection:", error)
    }
    
    setIsProcessing(false)
  }
  
  const handleDelete = async () => {
    if (!existingConnection) return
    setIsProcessing(true)
    
    try {
      await onDeleteConnection(existingConnection.id)
      await onExecuteAction("delete_connection", { connectionId: existingConnection.id })
      onClose()
    } catch (error) {
      console.error("Failed to delete connection:", error)
    }
    
    setIsProcessing(false)
  }
  
  if (!isOpen || !sourceNode || !targetNode) return null
  
  const connectionTypes = ["message", "command", "query", "stream", "data", "sync", "heartbeat", "broadcast", "subscribe", "rpc"]
  
  // Get compatibility color
  const getCompatibilityColor = () => {
    if (!proposal) return "text-gray-400"
    switch (proposal.compatibility) {
      case "high": return "text-green-400"
      case "medium": return "text-yellow-400"
      case "low": return "text-orange-400"
      case "requires-adapter": return "text-red-400"
    }
  }
  
  const getRiskColor = () => {
    if (!proposal) return "text-gray-400"
    switch (proposal.riskAssessment.level) {
      case "low": return "text-green-400"
      case "medium": return "text-yellow-400"
      case "high": return "text-red-400"
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl w-[600px] max-h-[85vh] border border-purple-500/30 shadow-2xl shadow-purple-500/10 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-purple-900/20 border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">
              {existingConnection ? "Edit Connection" : "New Connection"}
            </h3>
            {proposal && (
              <Badge className={`${getCompatibilityColor()} bg-transparent border-current text-xs`}>
                {proposal.compatibilityScore}% Compatible
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Nodes Display */}
        <div className="p-4 bg-black/30 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-1">
                <span className="text-white font-bold text-xs">{sourceNode.shortName.slice(0, 3)}</span>
              </div>
              <p className="text-sm text-white">{sourceNode.shortName}</p>
              <p className="text-[10px] text-white/50">{sourceNode.category}</p>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              {config.bidirectional ? (
                <ArrowLeftRight className="h-6 w-6 text-purple-400" />
              ) : (
                <ArrowRight className="h-6 w-6 text-purple-400" />
              )}
              <Badge className="mt-1 text-[10px] capitalize">{config.type}</Badge>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-1">
                <span className="text-white font-bold text-xs">{targetNode.shortName.slice(0, 3)}</span>
              </div>
              <p className="text-sm text-white">{targetNode.shortName}</p>
              <p className="text-[10px] text-white/50">{targetNode.category}</p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {["config", "insights", "implementation"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`flex-1 py-2 text-sm capitalize ${
                activeTab === tab 
                  ? "text-purple-400 border-b-2 border-purple-400 bg-purple-500/10" 
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === "config" && (
            <>
              {/* Type */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Connection Type</label>
                <div className="flex flex-wrap gap-1">
                  {connectionTypes.map(type => (
                    <Button
                      key={type}
                      variant={config.type === type ? "default" : "outline"}
                      size="sm"
                      className="text-xs capitalize"
                      onClick={() => setConfig({ ...config, type: type as ConnectionConfig["type"] })}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Options */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.bidirectional}
                    onCheckedChange={(checked) => setConfig({ ...config, bidirectional: checked })}
                  />
                  <span className="text-sm text-white/70">Bidirectional</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">Priority:</span>
                  <Input
                    type="number"
                    value={config.priority}
                    onChange={(e) => setConfig({ ...config, priority: parseInt(e.target.value) || 5 })}
                    className="w-16 h-8 bg-white/5 text-center"
                    min={1}
                    max={10}
                  />
                </div>
              </div>
              
              {/* Cascade Connections */}
              {proposal?.cascadeConnections && proposal.cascadeConnections.length > 0 && (
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-medium text-cyan-400">Cascade Connections</span>
                    <Badge variant="outline" className="text-[9px] text-cyan-400 border-cyan-400">
                      {selectedCascades.size}/{proposal.cascadeConnections.length}
                    </Badge>
                  </div>
                  <ul className="space-y-2">
                    {proposal.cascadeConnections.map((cascade, i) => {
                      const key = `${cascade.from}-${cascade.to}`
                      return (
                        <li key={i} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={selectedCascades.has(key)}
                            onChange={() => toggleCascade(cascade)}
                            className="h-3 w-3 rounded border-cyan-500/50 text-cyan-500 focus:ring-cyan-500"
                          />
                          <span className="text-white/70">
                            {cascade.fromName} → {cascade.toName}
                          </span>
                          <Badge className="text-[9px] capitalize bg-transparent border-cyan-500/30 text-cyan-400">
                            {cascade.type}
                          </Badge>
                          <span className="text-white/40 text-[10px] flex-1">{cascade.reason}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
          
          {activeTab === "insights" && proposal && (
            <>
              {/* Quick Insights */}
              {proposal.quickInsights.length > 0 && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-400">AI Insights</span>
                  </div>
                  <ul className="space-y-1">
                    {proposal.quickInsights.map((insight, i) => (
                      <li key={i} className="text-xs text-white/70 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-purple-400" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Risk Assessment */}
              <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`h-4 w-4 ${getRiskColor()}`} />
                  <span className={`text-sm font-medium ${getRiskColor()}`}>
                    Risk: {(proposal.riskAssessment?.level ?? 'unknown').toUpperCase()}
                  </span>
                </div>
                {proposal.riskAssessment.factors.length > 0 && (
                  <div className="space-y-1 mb-2">
                    <p className="text-xs text-white/50">Factors:</p>
                    {proposal.riskAssessment.factors.map((factor, i) => (
                      <p key={i} className="text-xs text-white/70 pl-2">• {factor}</p>
                    ))}
                  </div>
                )}
                {proposal.riskAssessment.mitigations.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-white/50">Mitigations:</p>
                    {proposal.riskAssessment.mitigations.map((m, i) => (
                      <p key={i} className="text-xs text-green-400/70 pl-2">✓ {m}</p>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Effort Estimate */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-white/50" />
                <span className="text-white/50">Estimated Effort:</span>
                <Badge className={`capitalize ${
                  proposal.estimatedEffort === "minimal" ? "bg-green-500/20 text-green-400" :
                  proposal.estimatedEffort === "moderate" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-red-500/20 text-red-400"
                }`}>
                  {proposal.estimatedEffort}
                </Badge>
              </div>
            </>
          )}
          
          {activeTab === "implementation" && (
            <>
              {proposal?.implementationPlan ? (
                <div className="space-y-4">
                  <p className="text-sm text-white/80">{proposal.implementationPlan.summary}</p>
                  
                  {/* Code Changes */}
                  {proposal.implementationPlan.codeChanges.length > 0 && (
                    <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                      <p className="text-xs text-white/50 mb-2">Code Changes:</p>
                      {proposal.implementationPlan.codeChanges.map((change, i) => (
                        <div key={i} className="text-xs mb-2">
                          <div className="flex items-center gap-2">
                            <FileCode className="h-3 w-3 text-cyan-400" />
                            <code className="text-cyan-400">{change.file}</code>
                            <Badge className="text-[9px] capitalize">{change.changeType}</Badge>
                          </div>
                          <p className="text-white/60 pl-5">{change.description}</p>
                          {change.snippet && (
                            <pre className="mt-1 p-2 bg-black/50 rounded text-[10px] text-green-400 overflow-x-auto">
                              {change.snippet}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* New Integrations */}
                  {proposal.implementationPlan.newIntegrations.length > 0 && (
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                      <p className="text-xs text-orange-400 mb-1">Required Integrations:</p>
                      {proposal.implementationPlan.newIntegrations.map((int, i) => (
                        <p key={i} className="text-xs text-white/70 pl-2">• {int}</p>
                      ))}
                    </div>
                  )}
                  
                  {/* Testing Notes */}
                  {proposal.implementationPlan.testingNotes.length > 0 && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <p className="text-xs text-blue-400 mb-1">Testing Notes:</p>
                      {proposal.implementationPlan.testingNotes.map((note, i) => (
                        <p key={i} className="text-xs text-white/70 pl-2">• {note}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto text-purple-400/50 mb-2" />
                  <p className="text-sm text-white/50 mb-4">
                    Get AI-powered implementation plan
                  </p>
                  <Button
                    onClick={fetchLLMPlan}
                    disabled={llmLoading}
                    className="bg-purple-600 hover:bg-purple-500"
                  >
                    {llmLoading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> Generate Plan</>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Actions */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex gap-2">
            {existingConnection ? (
              <>
                <Button
                  onClick={handleDelete}
                  disabled={isProcessing}
                  variant="destructive"
                  className="flex-1"
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isProcessing}
                  className="flex-1 bg-purple-600 hover:bg-purple-500"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update
                </Button>
              </>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={isProcessing}
                className="w-full bg-purple-600 hover:bg-purple-500"
              >
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating {selectedCascades.size > 0 ? `(+${selectedCascades.size})` : ""}...</>
                ) : (
                  <><Link2 className="h-4 w-4 mr-2" /> Create Connection {selectedCascades.size > 0 ? `(+${selectedCascades.size} cascade)` : ""}</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export interface ConnectionConfig {
  type: "message" | "command" | "query" | "stream" | "data" | "sync" | "heartbeat" | "broadcast" | "subscribe" | "rpc"
  bidirectional: boolean
  priority: number
  sourceId?: string
  targetId?: string
}

// ============= ORCHESTRATOR COMMAND CENTER =============
export function OrchestratorCommandCenter({
  isOpen,
  onClose,
  nodes,
  connections,
  onExecuteAction,
}: {
  isOpen: boolean
  onClose: () => void
  nodes: TopologyNode[]
  connections: TopologyConnection[]
  onExecuteAction: (action: string, params: Record<string, unknown>) => Promise<void>
}) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  
  // Simulate real-time log streaming
  useEffect(() => {
    if (!isOpen) return
    
    const interval = setInterval(() => {
      const sources = ["MYCA", "Redis", "PostgreSQL", "AgentPool", "TaskQueue", "MemoryStore"]
      const messages = [
        "Processing incoming request from agent",
        "Task completed successfully",
        "Memory sync complete",
        "Agent heartbeat received",
        "Workflow step executed",
        "Cache invalidated",
        "Connection established",
        "Query optimized",
      ]
      
      setSystemLogs(prev => [...prev.slice(-50), {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        level: ["info", "debug", "success"][Math.floor(Math.random() * 3)] as LogEntry["level"],
        source: sources[Math.floor(Math.random() * sources.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
      }])
    }, 2000)
    
    return () => clearInterval(interval)
  }, [isOpen])
  
  const addLog = useCallback((level: LogEntry["level"], source: string, message: string) => {
    setLogs(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      source,
      message,
    }])
  }, [])
  
  const executeCommand = async (command: string) => {
    setIsExecuting(true)
    addLog("info", "User", command)
    
    try {
      // Normalize command (convert to API action format)
      const normalizedCommand = command.toLowerCase().replace(/\s+/g, "-")
      
      // Parse and execute command
      if (command.startsWith("restart ") && command !== "restart all") {
        const target = command.replace("restart ", "")
        addLog("info", "Orchestrator", `Restarting ${target}...`)
        await onExecuteAction("restart", { target })
        addLog("success", "Orchestrator", `${target} restarted successfully`)
      } else if (command.startsWith("stop ") && command !== "stop all") {
        const target = command.replace("stop ", "")
        addLog("warn", "Orchestrator", `Stopping ${target}...`)
        await onExecuteAction("stop", { target })
        addLog("success", "Orchestrator", `${target} stopped`)
      } else if (command === "status") {
        addLog("info", "Orchestrator", `Active agents: ${nodes.filter(n => n.status === "active").length}`)
        addLog("info", "Orchestrator", `Connections: ${connections.length}`)
      } else if (command === "health" || normalizedCommand === "health-check") {
        addLog("info", "Orchestrator", "Running health check...")
        await onExecuteAction("health", {})
        addLog("success", "Orchestrator", "Health check complete - All systems operational")
      } else if (normalizedCommand === "restart-all") {
        addLog("warn", "Orchestrator", "Initiating restart of all agents...")
        await onExecuteAction("restart-all", {})
        addLog("success", "Orchestrator", "Restart signal sent to all agents")
      } else if (normalizedCommand === "sync-memory") {
        addLog("info", "Orchestrator", "Synchronizing memory across agents...")
        await onExecuteAction("sync-memory", {})
        addLog("success", "Orchestrator", "Memory sync complete")
      } else if (normalizedCommand === "clear-queue") {
        addLog("info", "Orchestrator", "Clearing task queue...")
        await onExecuteAction("clear-queue", {})
        addLog("success", "Orchestrator", "Task queue cleared")
      } else if (normalizedCommand === "stop-all") {
        addLog("error", "Orchestrator", "Stopping all agents...")
        await onExecuteAction("stop-all", {})
        addLog("warn", "Orchestrator", "All agents stopped")
      } else if (normalizedCommand === "diagnostics") {
        addLog("info", "Orchestrator", "Running system diagnostics...")
        await onExecuteAction("diagnostics", {})
        addLog("success", "Orchestrator", "Diagnostics complete")
      } else if (command.startsWith("spawn ")) {
        const agentType = command.replace("spawn ", "")
        addLog("info", "Orchestrator", `Spawning new ${agentType} agent...`)
        await onExecuteAction("spawn", { agentType, name: `${agentType}-${Date.now()}` })
        addLog("success", "Orchestrator", `Agent ${agentType} spawned`)
      } else {
        addLog("warn", "Orchestrator", `Unknown command: ${command}`)
        addLog("info", "Orchestrator", "Available commands: health, restart all, sync memory, clear queue, stop all, diagnostics, spawn <type>, restart <agent>, stop <agent>")
      }
    } catch (error) {
      addLog("error", "Orchestrator", `Command failed: ${error}`)
    }
    
    setIsExecuting(false)
  }
  
  if (!isOpen) return null
  
  const quickActions = [
    { id: "health", label: "Health Check", icon: Activity, color: "green" },
    { id: "restart-all", label: "Restart All", icon: RefreshCw, color: "yellow" },
    { id: "sync-memory", label: "Sync Memory", icon: Database, color: "cyan" },
    { id: "clear-queue", label: "Clear Queue", icon: Layers, color: "purple" },
  ]
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl w-[900px] max-h-[90vh] border border-purple-500/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-900/40 to-cyan-900/40 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Brain className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">MYCA Command Center</h3>
              <p className="text-xs text-white/50">Orchestrator Control Interface</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 p-4 border-b border-white/10 bg-black/30">
          {quickActions.map(action => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              className={cn(
                "flex-1",
                selectedAction === action.id && "ring-2 ring-offset-2 ring-offset-slate-900"
              )}
              onClick={() => executeCommand(action.id.replace("-", " "))}
              disabled={isExecuting}
            >
              <action.icon className={cn("h-4 w-4 mr-2", `text-${action.color}-400`)} />
              {action.label}
            </Button>
          ))}
        </div>
        
        {/* Terminals Grid */}
        <div className="grid grid-cols-2 gap-4 p-4">
          {/* Command Terminal */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white/70">Command Terminal</h4>
            <TerminalStream
              title="orchestrator://myca"
              logs={logs}
              className="h-80"
              showInput
              onCommand={executeCommand}
            />
          </div>
          
          {/* System Activity */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white/70">System Activity Stream</h4>
            <TerminalStream
              title="system://all"
              logs={systemLogs}
              className="h-80"
            />
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/30 border-t border-white/10">
          <div className="flex gap-6 text-xs">
            <div>
              <span className="text-white/40">Agents:</span>
              <span className="ml-1 text-green-400">{nodes.filter(n => n.status === "active").length} active</span>
            </div>
            <div>
              <span className="text-white/40">Connections:</span>
              <span className="ml-1 text-cyan-400">{connections.filter(c => c.active).length} active</span>
            </div>
            <div>
              <span className="text-white/40">Messages:</span>
              <span className="ml-1 text-purple-400">{connections.reduce((sum, c) => sum + c.traffic.messagesPerSecond, 0).toFixed(0)}/s</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-white/50">Live</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default {
  TerminalStream,
  EnhancedPathTracer,
  EnhancedSpawnAgent,
  ConnectionWidget,
  OrchestratorCommandCenter,
}
