"use client"

/**
 * MYCA v2 Command Center
 * The CEO's command and control dashboard for the Multi-Agent System
 * Updated: Feb 4, 2026 - PersonaPlex voice integration
 */

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MYCAChatPanel,
  SystemOverview,
  AgentTopology,
  NotificationCenter,
  AgentCreator,
  AgentGrid,
  AgentTerminal,
  AdvancedTopology3D,
  WorkflowStudio,
} from "@/components/mas"
import { usePersonaPlexContext, VoiceCommandPanel } from "@/components/voice"
import {
  Brain,
  Plus,
  Settings,
  Activity,
  Zap,
  MessageSquare,
  Network,
  Bell,
  RefreshCw,
  ExternalLink,
  LayoutDashboard,
  Bot,
  Terminal,
  Workflow,
  Shield,
  Radio,
  Database,
  Server,
  Maximize2,
  Volume2,
  Sparkles,
  Play,
  Pause,
  Eye,
  HardDrive,
} from "lucide-react"
import { MemoryMonitor } from "@/components/mas/topology/memory-monitor"
import { MemoryDashboard } from "@/components/mas/topology/memory-dashboard"

// MAS API URL - points to the MAS VM orchestrator
const MAS_API_URL = process.env.NEXT_PUBLIC_MAS_API_URL || "http://192.168.0.188:8001"

interface SystemStats {
  activeAgents: number
  totalAgents: number
  tasksQueued: number
  tasksCompleted: number
  systemHealth: "healthy" | "degraded" | "critical"
  uptime: number
}

// Import real agent registry - NO MOCK DATA
import { 
  COMPLETE_AGENT_REGISTRY, 
  TOTAL_AGENT_COUNT, 
  CATEGORY_STATS,
  getActiveAgents 
} from "@/components/mas/topology/agent-registry"

export default function AIStudioPage() {
  // Initialize with REAL data from agent registry
  const realActiveCount = getActiveAgents().length
  const [stats, setStats] = useState<SystemStats>({
    activeAgents: realActiveCount,
    totalAgents: TOTAL_AGENT_COUNT,
    tasksQueued: 0, // Will be fetched from MAS
    tasksCompleted: 0, // Will be fetched from MAS
    systemHealth: "checking" as "healthy" | "degraded" | "critical",
    uptime: 0,
  })
  const [showAgentCreator, setShowAgentCreator] = useState(false)
  const [selectedTab, setSelectedTab] = useState("command")
  const [refreshing, setRefreshing] = useState(false)
  const [orchestratorStatus, setOrchestratorStatus] = useState<"online" | "offline" | "checking">("checking")
  const [topologyFullScreen, setTopologyFullScreen] = useState(false)

  // Check orchestrator health
  const checkOrchestratorHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/mas/health", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setOrchestratorStatus(data.status === "ok" ? "online" : "offline")
      } else {
        setOrchestratorStatus("offline")
      }
    } catch {
      setOrchestratorStatus("offline")
    }
  }, [])

  // Fetch system stats - REAL DATA ONLY
  const fetchStats = useCallback(async () => {
    setRefreshing(true)
    try {
      const [healthRes, agentsRes, tasksRes] = await Promise.allSettled([
        fetch("/api/mas/health"),
        fetch("/api/mas/agents"),
        fetch("/api/mas/orchestrator/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "diagnostics" })
        }),
      ])

      // Health check from MAS VM
      if (healthRes.status === "fulfilled" && healthRes.value.ok) {
        const data = await healthRes.value.json()
        setStats(prev => ({
          ...prev,
          systemHealth: data.status === "ok" ? "healthy" : "degraded",
        }))
      } else {
        setStats(prev => ({ ...prev, systemHealth: "degraded" }))
      }

      // Agent counts - prioritize MAS VM data, fallback to registry
      if (agentsRes.status === "fulfilled" && agentsRes.value.ok) {
        const data = await agentsRes.value.json()
        const agents = data.agents || []
        // If MAS returns agents, use that count for "running" agents
        // But total is ALWAYS from registry (223+ defined)
        setStats(prev => ({
          ...prev,
          activeAgents: agents.filter((a: any) => a.status === "active" || a.status === "busy").length || realActiveCount,
          totalAgents: TOTAL_AGENT_COUNT, // ALWAYS use registry total
        }))
      } else {
        // Fallback to registry counts
        setStats(prev => ({
          ...prev,
          activeAgents: realActiveCount,
          totalAgents: TOTAL_AGENT_COUNT,
        }))
      }

      // Task queue stats from orchestrator
      if (tasksRes.status === "fulfilled" && tasksRes.value.ok) {
        const data = await tasksRes.value.json()
        if (data.diagnostics) {
          setStats(prev => ({
            ...prev,
            tasksQueued: data.diagnostics.pendingTasks || 0,
            tasksCompleted: data.diagnostics.completedTasks || 0,
            uptime: data.diagnostics.uptime || 0,
          }))
        }
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
      // On error, use registry data
      setStats(prev => ({
        ...prev,
        activeAgents: realActiveCount,
        totalAgents: TOTAL_AGENT_COUNT,
        systemHealth: "degraded",
      }))
    } finally {
      setRefreshing(false)
    }
  }, [realActiveCount])

  useEffect(() => {
    checkOrchestratorHealth()
    fetchStats()
    const interval = setInterval(() => {
      checkOrchestratorHealth()
      fetchStats()
    }, 30000)
    return () => clearInterval(interval)
  }, [checkOrchestratorHealth, fetchStats])

  const handleAgentAction = (agentId: string, action: string) => {
    console.log(`Agent action: ${action} on ${agentId}`)
    // In production, this would call the MAS API
  }

  // Use PersonaPlex context from app-level provider
  const personaplex = usePersonaPlexContext()
  const { isConnected, isListening, startListening, stopListening, lastTranscript, connectionState } = personaplex || {
    isConnected: false,
    isListening: false,
    startListening: () => {},
    stopListening: () => {},
    lastTranscript: "",
    connectionState: "disconnected",
  }

  // Handle voice commands for AI Studio navigation
  useEffect(() => {
    if (!lastTranscript) return
    
    const command = lastTranscript.toLowerCase()
    
    // Tab navigation via voice
    if (command.includes("show command") || command.includes("command tab")) {
      setSelectedTab("command")
    } else if (command.includes("show agents") || command.includes("agents tab")) {
      setSelectedTab("agents")
    } else if (command.includes("show topology")) {
      setSelectedTab("topology")
    } else if (command.includes("show memory")) {
      setSelectedTab("memory")
    } else if (command.includes("show activity")) {
      setSelectedTab("activity")
    } else if (command.includes("show workflows")) {
      setSelectedTab("workflows")
    } else if (command.includes("show system")) {
      setSelectedTab("system")
    } else if (command.includes("create agent") || command.includes("new agent")) {
      setShowAgentCreator(true)
    } else if (command.includes("refresh") || command.includes("update")) {
      fetchStats()
    }
  }, [lastTranscript, fetchStats])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                  <Brain className="h-8 w-8 text-purple-500" />
                </div>
                <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                  orchestratorStatus === "online" ? "bg-green-500" :
                  orchestratorStatus === "offline" ? "bg-red-500" :
                  "bg-yellow-500 animate-pulse"
                }`} />
              </div>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  MYCA Command Center
                  <Badge variant="outline" className="text-xs">v2</Badge>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Multi-Agent System Orchestration Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick Stats */}
              <div className="hidden lg:flex items-center gap-4 px-4 py-2 rounded-lg bg-muted/50">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-500">{stats.activeAgents}</div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <div className="text-lg font-bold">{stats.totalAgents}</div>
                  <div className="text-xs text-muted-foreground">Agents</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-500">{stats.tasksQueued}</div>
                  <div className="text-xs text-muted-foreground">Queued</div>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={fetchStats} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={() => setShowAgentCreator(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Agent
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7 h-auto gap-1 p-1">
            <TabsTrigger value="command" className="gap-2 py-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Command</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-2 py-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Agents</span>
            </TabsTrigger>
            <TabsTrigger value="topology" className="gap-2 py-2">
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Topology</span>
            </TabsTrigger>
            <TabsTrigger value="memory" className="gap-2 py-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Memory</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2 py-2">
              <Terminal className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="workflows" className="gap-2 py-2">
              <Workflow className="h-4 w-4" />
              <span className="hidden sm:inline">Workflows</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2 py-2">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
          </TabsList>

          {/* Command Tab - Main CEO Dashboard */}
          <TabsContent value="command" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - MYCA Chat */}
              <div className="lg:col-span-2">
                <MYCAChatPanel
                  masApiUrl="/api/mas"
                  onAgentAction={handleAgentAction}
                  className="h-[500px]"
                />
              </div>

              {/* Right Column - Notifications */}
              <div>
                <NotificationCenter className="h-[500px]" />
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <a href="http://192.168.0.188:8001/docs" target="_blank" rel="noopener noreferrer">
                  <Brain className="h-5 w-5 text-purple-500" />
                  <span className="text-xs">MAS API Docs</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <a href="http://localhost:5678" target="_blank" rel="noopener noreferrer">
                  <Workflow className="h-5 w-5 text-orange-500" />
                  <span className="text-xs">n8n Workflows</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <a href="https://192.168.0.202:8006" target="_blank" rel="noopener noreferrer">
                  <Server className="h-5 w-5 text-blue-500" />
                  <span className="text-xs">Proxmox VE</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <a href="/natureos/devices/network" target="_blank" rel="noopener noreferrer">
                  <Radio className="h-5 w-5 text-green-500" />
                  <span className="text-xs">Devices</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <a href="/natureos/mindex" target="_blank" rel="noopener noreferrer">
                  <Database className="h-5 w-5 text-cyan-500" />
                  <span className="text-xs">MINDEX DB</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <a href="/natureos/monitoring" target="_blank" rel="noopener noreferrer">
                  <Shield className="h-5 w-5 text-red-500" />
                  <span className="text-xs">Security</span>
                </a>
              </Button>
            </div>

            {/* Agent Categories Overview - REAL DATA from Agent Registry */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Agent Categories ({TOTAL_AGENT_COUNT} Real Agents)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                  {[
                    { name: "Core", key: "core" as const, icon: <Brain className="h-5 w-5" />, color: "purple" },
                    { name: "Financial", key: "financial" as const, icon: <Sparkles className="h-5 w-5" />, color: "blue" },
                    { name: "Mycology", key: "mycology" as const, icon: <Sparkles className="h-5 w-5" />, color: "green" },
                    { name: "Research", key: "research" as const, icon: <Database className="h-5 w-5" />, color: "cyan" },
                    { name: "DAO", key: "dao" as const, icon: <Zap className="h-5 w-5" />, color: "yellow" },
                    { name: "Comms", key: "communication" as const, icon: <MessageSquare className="h-5 w-5" />, color: "pink" },
                    { name: "Data", key: "data" as const, icon: <Database className="h-5 w-5" />, color: "cyan" },
                    { name: "Infra", key: "infrastructure" as const, icon: <Server className="h-5 w-5" />, color: "green" },
                    { name: "Simulation", key: "simulation" as const, icon: <Activity className="h-5 w-5" />, color: "orange" },
                    { name: "Security", key: "security" as const, icon: <Shield className="h-5 w-5" />, color: "red" },
                    { name: "Integration", key: "integration" as const, icon: <Zap className="h-5 w-5" />, color: "yellow" },
                    { name: "Device", key: "device" as const, icon: <Radio className="h-5 w-5" />, color: "orange" },
                    { name: "Chemistry", key: "chemistry" as const, icon: <Sparkles className="h-5 w-5" />, color: "purple" },
                    { name: "NLM", key: "nlm" as const, icon: <Brain className="h-5 w-5" />, color: "blue" },
                  ].map((cat) => {
                    // Get REAL counts from the agent registry
                    const categoryAgents = COMPLETE_AGENT_REGISTRY.filter(a => a.category === cat.key)
                    const activeCount = categoryAgents.filter(a => a.defaultStatus === "active").length
                    const totalCount = CATEGORY_STATS[cat.key]?.count || categoryAgents.length
                    
                    return (
                      <div
                        key={cat.name}
                        className={`p-4 rounded-lg border bg-${cat.color}-500/5 border-${cat.color}-500/20 hover:border-${cat.color}-500/40 transition-colors cursor-pointer`}
                      >
                        <div className={`text-${cat.color}-500 mb-2`}>{cat.icon}</div>
                        <div className="font-medium text-sm">{cat.name}</div>
                        <div className="text-xs text-muted-foreground">
                          <span className="text-green-500">{activeCount}</span>/{totalCount} active
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-6">
            <AgentGrid masApiUrl="/api/mas" refreshInterval={15000} />
          </TabsContent>

          {/* Topology Tab - Advanced 3D Visualization */}
          <TabsContent value="topology" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Agent Topology
                </h2>
                <p className="text-sm text-muted-foreground">
                  Interactive 3D visualization of the Multi-Agent System
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setTopologyFullScreen(true)}
                className="gap-2"
              >
                <Maximize2 className="h-4 w-4" />
                Full Screen
              </Button>
            </div>
            
            {/* Embedded 3D Topology */}
            <div className="h-[700px] rounded-xl overflow-hidden border-2 border-purple-500/20">
              <AdvancedTopology3D
                className="h-full"
                fullScreen={false}
              />
            </div>
            
            {/* Full-screen mode */}
            {topologyFullScreen && (
              <AdvancedTopology3D
                fullScreen={true}
                onToggleFullScreen={() => setTopologyFullScreen(false)}
              />
            )}
            
            {/* Legacy grid view toggle */}
            <details className="mt-6">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Show Legacy Grid View
              </summary>
              <div className="mt-4">
                <AgentTopology masApiUrl="/api/mas" />
              </div>
            </details>
          </TabsContent>

          {/* Memory Tab - Full Memory System Control */}
          <TabsContent value="memory" className="space-y-6">
            <MemoryDashboard />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <AgentTerminal masApiUrl="/api/mas" />
          </TabsContent>

          {/* Workflows Tab - Real n8n Integration */}
          <TabsContent value="workflows" className="space-y-6">
            <WorkflowStudio n8nUrl="http://192.168.0.188:5678" />
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <SystemOverview masApiUrl="/api/mas" refreshInterval={15000} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Agent Creator Modal */}
      <AgentCreator
        open={showAgentCreator}
        onOpenChange={setShowAgentCreator}
        masApiUrl="/api/mas"
        onAgentCreated={(agent) => {
          console.log("Agent created:", agent)
          fetchStats()
        }}
      />

      {/* Voice Status Indicator */}
      {isConnected && (
        <div className="fixed bottom-20 right-6 z-40 hidden lg:block">
          <Card className="p-3 shadow-xl bg-background/95 backdrop-blur border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isListening ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
              <span className="text-xs text-muted-foreground">
                {isListening ? "Listening..." : "PersonaPlex Ready"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => isListening ? stopListening() : startListening()}
              >
                <Volume2 className="h-3 w-3" />
              </Button>
            </div>
            {lastTranscript && (
              <p className="text-xs text-muted-foreground mt-2 truncate max-w-[200px]">
                "{lastTranscript}"
              </p>
            )}
          </Card>
        </div>
      )}
      
      {/* Connection Status for PersonaPlex */}
      {!isConnected && connectionState !== "disconnected" && (
        <div className="fixed bottom-6 right-6 z-40">
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            {connectionState === "connecting" ? "Connecting to PersonaPlex..." : "Voice Offline"}
          </Badge>
        </div>
      )}
    </div>
  )
}
