"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Bot, 
  Cpu, 
  Activity, 
  Server,
  Briefcase,
  Shield,
  Radio,
  Database,
  Zap,
  Brain,
  Network,
  Cloud
} from "lucide-react"

interface Agent {
  agent_id: string
  status: "spawning" | "active" | "busy" | "idle" | "paused" | "error" | "shutdown" | "dead" | "archived"
  container_id?: string
  category: string
  display_name: string
  tasks_completed: number
  tasks_failed: number
  cpu_percent: number
  memory_mb: number
  uptime_seconds: number
  last_heartbeat?: string
}

interface AgentGridProps {
  masApiUrl?: string
  refreshInterval?: number
}

const categoryIcons: Record<string, React.ReactNode> = {
  core: <Brain className="h-5 w-5" />,
  corporate: <Briefcase className="h-5 w-5" />,
  infrastructure: <Server className="h-5 w-5" />,
  device: <Radio className="h-5 w-5" />,
  data: <Database className="h-5 w-5" />,
  integration: <Zap className="h-5 w-5" />,
  security: <Shield className="h-5 w-5" />,
  default: <Bot className="h-5 w-5" />,
}

const statusColors: Record<string, string> = {
  active: "bg-green-500",
  busy: "bg-blue-500",
  idle: "bg-yellow-500",
  spawning: "bg-purple-500",
  paused: "bg-gray-500",
  error: "bg-red-500",
  shutdown: "bg-gray-600",
  dead: "bg-red-800",
  archived: "bg-gray-700",
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  busy: "default",
  idle: "secondary",
  spawning: "outline",
  paused: "secondary",
  error: "destructive",
  shutdown: "secondary",
  dead: "destructive",
  archived: "secondary",
}

export function AgentGrid({ masApiUrl = "/api/mas", refreshInterval = 10000 }: AgentGridProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`${masApiUrl}/agents`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAgents(data.agents || [])
      setError(null)
    } catch (err) {
      console.error("Failed to fetch agents:", err)
      setError("Failed to connect to MAS API")
      // Return sample data for demo
      setAgents([
        { agent_id: "ceo-agent", status: "active", category: "corporate", display_name: "CEO Agent", tasks_completed: 142, tasks_failed: 0, cpu_percent: 12, memory_mb: 256, uptime_seconds: 86400 },
        { agent_id: "cfo-agent", status: "active", category: "corporate", display_name: "CFO Agent", tasks_completed: 89, tasks_failed: 2, cpu_percent: 8, memory_mb: 128, uptime_seconds: 86400 },
        { agent_id: "cto-agent", status: "busy", category: "corporate", display_name: "CTO Agent", tasks_completed: 234, tasks_failed: 1, cpu_percent: 45, memory_mb: 512, uptime_seconds: 86400 },
        { agent_id: "proxmox-agent", status: "active", category: "infrastructure", display_name: "Proxmox Agent", tasks_completed: 567, tasks_failed: 3, cpu_percent: 15, memory_mb: 256, uptime_seconds: 172800 },
        { agent_id: "docker-agent", status: "active", category: "infrastructure", display_name: "Docker Agent", tasks_completed: 1234, tasks_failed: 12, cpu_percent: 22, memory_mb: 384, uptime_seconds: 172800 },
        { agent_id: "network-agent", status: "idle", category: "infrastructure", display_name: "Network Agent", tasks_completed: 345, tasks_failed: 0, cpu_percent: 5, memory_mb: 128, uptime_seconds: 172800 },
        { agent_id: "mycobrain-coordinator", status: "active", category: "device", display_name: "MycoBrain Coordinator", tasks_completed: 2456, tasks_failed: 8, cpu_percent: 18, memory_mb: 256, uptime_seconds: 259200 },
        { agent_id: "mindex-agent", status: "active", category: "data", display_name: "MINDEX Agent", tasks_completed: 8934, tasks_failed: 23, cpu_percent: 35, memory_mb: 512, uptime_seconds: 259200 },
        { agent_id: "n8n-agent", status: "active", category: "integration", display_name: "n8n Agent", tasks_completed: 3421, tasks_failed: 15, cpu_percent: 28, memory_mb: 384, uptime_seconds: 259200 },
        { agent_id: "elevenlabs-agent", status: "idle", category: "integration", display_name: "ElevenLabs Agent", tasks_completed: 567, tasks_failed: 2, cpu_percent: 3, memory_mb: 128, uptime_seconds: 172800 },
        { agent_id: "soc-agent", status: "active", category: "security", display_name: "SOC Agent", tasks_completed: 4567, tasks_failed: 0, cpu_percent: 42, memory_mb: 512, uptime_seconds: 259200 },
        { agent_id: "openai-agent", status: "active", category: "integration", display_name: "OpenAI Agent", tasks_completed: 1234, tasks_failed: 5, cpu_percent: 20, memory_mb: 256, uptime_seconds: 172800 },
      ])
    } finally {
      setLoading(false)
    }
  }, [masApiUrl])

  // WebSocket connection for real-time updates
  useEffect(() => {
    let ws: WebSocket | null = null
    
    const connectWebSocket = () => {
      try {
        const wsUrl = masApiUrl.replace(/^http/, "ws").replace("/api/mas", "/api/mas/dashboard/ws")
        ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          console.log("MAS WebSocket connected")
          setWsConnected(true)
        }
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "agent_update" || data.type === "initial_state") {
              setAgents(data.agents || [])
            }
          } catch (e) {
            console.error("Failed to parse WS message:", e)
          }
        }
        
        ws.onclose = () => {
          setWsConnected(false)
          // Reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000)
        }
        
        ws.onerror = () => {
          setWsConnected(false)
        }
      } catch (err) {
        console.error("WebSocket connection failed:", err)
      }
    }
    
    // Initial fetch
    fetchAgents()
    
    // Try WebSocket
    connectWebSocket()
    
    // Fallback polling if WebSocket not available
    const interval = setInterval(() => {
      if (!wsConnected) {
        fetchAgents()
      }
    }, refreshInterval)
    
    return () => {
      clearInterval(interval)
      if (ws) {
        ws.close()
      }
    }
  }, [fetchAgents, masApiUrl, refreshInterval, wsConnected])

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  const activeCount = agents.filter(a => a.status === "active" || a.status === "busy").length
  const totalTasks = agents.reduce((sum, a) => sum + (a.tasks_completed || 0), 0)

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-6 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500" : "bg-yellow-500"}`} />
            <span className="text-sm text-muted-foreground">
              {wsConnected ? "Live" : "Polling"}
            </span>
          </div>
          <div className="text-sm">
            <span className="font-semibold text-green-500">{activeCount}</span>
            <span className="text-muted-foreground"> / {agents.length} agents active</span>
          </div>
          <div className="text-sm">
            <span className="font-semibold">{totalTasks.toLocaleString()}</span>
            <span className="text-muted-foreground"> total tasks</span>
          </div>
        </div>
        {error && (
          <Badge variant="destructive">{error}</Badge>
        )}
      </div>

      {/* Agent Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {agents.map((agent) => (
          <Card key={agent.agent_id} className="group hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${statusColors[agent.status] || "bg-gray-500"}/20`}>
                    {categoryIcons[agent.category] || categoryIcons.default}
                  </div>
                  <div>
                    <CardTitle className="text-base">{agent.display_name}</CardTitle>
                    <CardDescription className="text-xs font-mono">{agent.agent_id}</CardDescription>
                  </div>
                </div>
                <Badge variant={statusVariants[agent.status] || "secondary"}>
                  {agent.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* CPU & Memory */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">CPU</span>
                      <span className="font-mono">{agent.cpu_percent}%</span>
                    </div>
                    <Progress value={agent.cpu_percent} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Memory</span>
                      <span className="font-mono">{agent.memory_mb}MB</span>
                    </div>
                    <Progress value={Math.min(agent.memory_mb / 512 * 100, 100)} className="h-1.5" />
                  </div>
                </div>

                {/* Tasks */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasks</span>
                  <span className="font-mono">
                    <span className="text-green-500">{agent.tasks_completed}</span>
                    {agent.tasks_failed > 0 && (
                      <span className="text-red-500"> / {agent.tasks_failed} failed</span>
                    )}
                  </span>
                </div>

                {/* Uptime */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-mono">{formatUptime(agent.uptime_seconds)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
