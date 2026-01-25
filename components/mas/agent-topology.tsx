"use client"

/**
 * Agent Topology Visualization
 * Network-style visualization of agent connections and hierarchy
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Brain,
  Briefcase,
  Server,
  Radio,
  Database,
  Zap,
  Shield,
  RefreshCw,
  ChevronRight,
  Activity,
  Eye,
  Settings,
  Play,
  Pause,
  MessageSquare,
} from "lucide-react"

interface Agent {
  id: string
  name: string
  category: string
  status: "active" | "idle" | "busy" | "offline" | "error"
  connections: string[]
  tasksCompleted: number
  cpuPercent: number
  memoryMb: number
}

interface AgentTopologyProps {
  masApiUrl?: string
  onAgentSelect?: (agent: Agent) => void
  selectedAgentId?: string
}

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  core: { icon: <Brain className="h-5 w-5" />, color: "purple", label: "Core" },
  corporate: { icon: <Briefcase className="h-5 w-5" />, color: "blue", label: "Corporate" },
  infrastructure: { icon: <Server className="h-5 w-5" />, color: "green", label: "Infrastructure" },
  device: { icon: <Radio className="h-5 w-5" />, color: "orange", label: "Device" },
  data: { icon: <Database className="h-5 w-5" />, color: "cyan", label: "Data" },
  integration: { icon: <Zap className="h-5 w-5" />, color: "yellow", label: "Integration" },
  security: { icon: <Shield className="h-5 w-5" />, color: "red", label: "Security" },
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  busy: "bg-blue-500",
  idle: "bg-yellow-500",
  offline: "bg-gray-500",
  error: "bg-red-500",
}

// Default agents when API is not available
const DEFAULT_AGENTS: Agent[] = [
  { id: "myca-orchestrator", name: "MYCA Orchestrator", category: "core", status: "active", connections: ["ceo-agent", "cto-agent", "cfo-agent", "soc-agent"], tasksCompleted: 145892, cpuPercent: 12, memoryMb: 256 },
  { id: "ceo-agent", name: "CEO Agent", category: "corporate", status: "active", connections: ["myca-orchestrator", "cfo-agent", "cto-agent"], tasksCompleted: 1423, cpuPercent: 8, memoryMb: 128 },
  { id: "cfo-agent", name: "CFO Agent", category: "corporate", status: "active", connections: ["myca-orchestrator", "ceo-agent", "mindex-agent"], tasksCompleted: 892, cpuPercent: 5, memoryMb: 128 },
  { id: "cto-agent", name: "CTO Agent", category: "corporate", status: "busy", connections: ["myca-orchestrator", "ceo-agent", "docker-agent", "proxmox-agent"], tasksCompleted: 2341, cpuPercent: 45, memoryMb: 256 },
  { id: "soc-agent", name: "SOC Agent", category: "security", status: "active", connections: ["myca-orchestrator", "network-agent", "firewall-agent"], tasksCompleted: 4567, cpuPercent: 32, memoryMb: 384 },
  { id: "proxmox-agent", name: "Proxmox Agent", category: "infrastructure", status: "active", connections: ["cto-agent", "docker-agent", "vm-agent"], tasksCompleted: 5678, cpuPercent: 15, memoryMb: 256 },
  { id: "docker-agent", name: "Docker Agent", category: "infrastructure", status: "active", connections: ["cto-agent", "proxmox-agent", "n8n-agent"], tasksCompleted: 12345, cpuPercent: 22, memoryMb: 384 },
  { id: "network-agent", name: "Network Agent", category: "infrastructure", status: "idle", connections: ["soc-agent", "unifi-agent"], tasksCompleted: 3456, cpuPercent: 5, memoryMb: 128 },
  { id: "mycobrain-coordinator", name: "MycoBrain Coordinator", category: "device", status: "active", connections: ["myca-orchestrator", "sensor-agent", "camera-agent"], tasksCompleted: 24567, cpuPercent: 18, memoryMb: 256 },
  { id: "mindex-agent", name: "MINDEX Agent", category: "data", status: "active", connections: ["myca-orchestrator", "cfo-agent", "etl-agent"], tasksCompleted: 89345, cpuPercent: 35, memoryMb: 512 },
  { id: "n8n-agent", name: "n8n Agent", category: "integration", status: "active", connections: ["docker-agent", "openai-agent", "elevenlabs-agent"], tasksCompleted: 34567, cpuPercent: 28, memoryMb: 384 },
  { id: "openai-agent", name: "OpenAI Agent", category: "integration", status: "active", connections: ["n8n-agent", "elevenlabs-agent"], tasksCompleted: 12345, cpuPercent: 20, memoryMb: 256 },
]

export function AgentTopology({ masApiUrl = "/api/mas", onAgentSelect, selectedAgentId }: AgentTopologyProps) {
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${masApiUrl}/agents`)
      if (res.ok) {
        const data = await res.json()
        if (data.agents && data.agents.length > 0) {
          setAgents(data.agents.map((a: any) => ({
            id: a.agent_id,
            name: a.display_name,
            category: a.category || "core",
            status: a.status,
            connections: a.connections || [],
            tasksCompleted: a.tasks_completed || 0,
            cpuPercent: a.cpu_percent || 0,
            memoryMb: a.memory_mb || 0,
          })))
        }
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error)
    } finally {
      setLoading(false)
    }
  }, [masApiUrl])

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 30000)
    return () => clearInterval(interval)
  }, [fetchAgents])

  // Group agents by category
  const groupedAgents = useMemo(() => {
    const filtered = filterCategory ? agents.filter(a => a.category === filterCategory) : agents
    return filtered.reduce((acc, agent) => {
      const cat = agent.category || "core"
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(agent)
      return acc
    }, {} as Record<string, Agent[]>)
  }, [agents, filterCategory])

  const categories = useMemo(() => {
    return Object.keys(groupedAgents).sort()
  }, [groupedAgents])

  const activeCount = agents.filter(a => a.status === "active" || a.status === "busy").length

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Agent Topology
            <Badge variant="secondary" className="ml-2">
              {activeCount}/{agents.length} active
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAgents} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            variant={filterCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterCategory(null)}
          >
            All
          </Button>
          {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => (
            <Button
              key={cat}
              variant={filterCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory(cat)}
              className="gap-1"
            >
              {config.icon}
              {config.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-6">
            {categories.map((category) => {
              const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.core
              const categoryAgents = groupedAgents[category]

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded bg-${config.color}-500/20 text-${config.color}-500`}>
                      {config.icon}
                    </div>
                    <h3 className="font-semibold">{config.label}</h3>
                    <Badge variant="outline" className="text-xs">
                      {categoryAgents.length}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryAgents.map((agent) => (
                      <div
                        key={agent.id}
                        onClick={() => onAgentSelect?.(agent)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-primary ${
                          selectedAgentId === agent.id ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[agent.status]}`} />
                            <span className="font-medium text-sm">{agent.name}</span>
                          </div>
                          <Badge variant={agent.status === "active" ? "default" : agent.status === "busy" ? "secondary" : "outline"}>
                            {agent.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Tasks</span>
                            <span className="font-mono">{agent.tasksCompleted.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>CPU</span>
                            <span className="font-mono">{agent.cpuPercent}%</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Memory</span>
                            <span className="font-mono">{agent.memoryMb}MB</span>
                          </div>
                          {agent.connections.length > 0 && (
                            <div className="pt-2 border-t">
                              <span className="text-muted-foreground">Connections: </span>
                              <span className="font-mono">{agent.connections.length}</span>
                            </div>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-1 mt-3 pt-3 border-t">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            {agent.status === "active" ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Settings className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
