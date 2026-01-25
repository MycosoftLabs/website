"use client"

/**
 * MYCA v2 Command Center
 * The CEO's command and control dashboard for the Multi-Agent System
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
} from "@/components/mas"
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
} from "lucide-react"

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

export default function AIStudioPage() {
  const [stats, setStats] = useState<SystemStats>({
    activeAgents: 180,
    totalAgents: 223,
    tasksQueued: 3,
    tasksCompleted: 24589,
    systemHealth: "healthy",
    uptime: 259200,
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

  // Fetch system stats
  const fetchStats = useCallback(async () => {
    setRefreshing(true)
    try {
      const [healthRes, agentsRes] = await Promise.allSettled([
        fetch("/api/mas/health"),
        fetch("/api/mas/agents"),
      ])

      if (healthRes.status === "fulfilled" && healthRes.value.ok) {
        const data = await healthRes.value.json()
        setStats(prev => ({
          ...prev,
          systemHealth: data.status === "ok" ? "healthy" : "degraded",
        }))
      }

      if (agentsRes.status === "fulfilled" && agentsRes.value.ok) {
        const data = await agentsRes.value.json()
        const agents = data.agents || []
        setStats(prev => ({
          ...prev,
          activeAgents: agents.filter((a: any) => a.status === "active" || a.status === "busy").length,
          totalAgents: agents.length || 40,
        }))
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    } finally {
      setRefreshing(false)
    }
  }, [])

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
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto gap-1 p-1">
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

            {/* Agent Categories Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Agent Categories ({stats.totalAgents} Total)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                  {[
                    { name: "Core", icon: <Brain className="h-5 w-5" />, count: 10, active: 10, color: "purple" },
                    { name: "Financial", icon: <Sparkles className="h-5 w-5" />, count: 12, active: 10, color: "blue" },
                    { name: "Mycology", icon: <Sparkles className="h-5 w-5" />, count: 25, active: 23, color: "green" },
                    { name: "Research", icon: <Database className="h-5 w-5" />, count: 15, active: 14, color: "cyan" },
                    { name: "DAO", icon: <Zap className="h-5 w-5" />, count: 40, active: 35, color: "yellow" },
                    { name: "Comms", icon: <MessageSquare className="h-5 w-5" />, count: 10, active: 9, color: "pink" },
                    { name: "Data", icon: <Database className="h-5 w-5" />, count: 30, active: 28, color: "cyan" },
                    { name: "Infra", icon: <Server className="h-5 w-5" />, count: 15, active: 14, color: "green" },
                    { name: "Simulation", icon: <Activity className="h-5 w-5" />, count: 12, active: 11, color: "orange" },
                    { name: "Security", icon: <Shield className="h-5 w-5" />, count: 8, active: 8, color: "red" },
                    { name: "Integration", icon: <Zap className="h-5 w-5" />, count: 20, active: 18, color: "yellow" },
                    { name: "Device", icon: <Radio className="h-5 w-5" />, count: 18, active: 15, color: "orange" },
                    { name: "Chemistry", icon: <Sparkles className="h-5 w-5" />, count: 8, active: 7, color: "purple" },
                  ].map((cat) => (
                    <div
                      key={cat.name}
                      className={`p-4 rounded-lg border bg-${cat.color}-500/5 border-${cat.color}-500/20 hover:border-${cat.color}-500/40 transition-colors cursor-pointer`}
                    >
                      <div className={`text-${cat.color}-500 mb-2`}>{cat.icon}</div>
                      <div className="font-medium text-sm">{cat.name}</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="text-green-500">{cat.active}</span>/{cat.count} active
                      </div>
                    </div>
                  ))}
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

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <AgentTerminal masApiUrl="/api/mas" />
          </TabsContent>

          {/* Workflows Tab */}
          <TabsContent value="workflows" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Workflow className="h-5 w-5" />
                      n8n Workflows
                    </CardTitle>
                    <CardDescription>
                      Automation workflows integrated with MYCA orchestrator
                    </CardDescription>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="http://localhost:5678" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open n8n
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "Voice Chat Pipeline", status: "active", runs: 1250, lastRun: "2m ago", desc: "MYCA voice interaction handler" },
                    { name: "MYCA Jarvis Handler", status: "active", runs: 890, lastRun: "5m ago", desc: "Natural language orchestration" },
                    { name: "Agent Heartbeat Monitor", status: "active", runs: 15420, lastRun: "30s ago", desc: "Health check aggregation" },
                    { name: "MycoBrain Data Sync", status: "active", runs: 5678, lastRun: "1m ago", desc: "Device telemetry pipeline" },
                    { name: "MINDEX ETL Scheduler", status: "active", runs: 2341, lastRun: "10m ago", desc: "Database synchronization" },
                    { name: "Security Alert Router", status: "active", runs: 892, lastRun: "3m ago", desc: "SOC event distribution" },
                    { name: "Report Generator", status: "paused", runs: 156, lastRun: "2h ago", desc: "Scheduled reporting" },
                  ].map((wf) => (
                    <div
                      key={wf.name}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${wf.status === "active" ? "bg-green-500" : "bg-gray-500"}`} />
                        <div>
                          <span className="font-medium">{wf.name}</span>
                          <p className="text-xs text-muted-foreground">{wf.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground font-mono">
                          {wf.runs.toLocaleString()} runs
                        </span>
                        <span className="text-xs text-muted-foreground">{wf.lastRun}</span>
                        <Badge variant={wf.status === "active" ? "default" : "secondary"}>
                          {wf.status}
                        </Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            {wf.status === "active" ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Zap className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Embedded n8n */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">n8n Editor</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] rounded-lg overflow-hidden border">
                  <iframe
                    src="http://localhost:5678"
                    className="w-full h-full border-0"
                    title="n8n Workflow Editor"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                  />
                </div>
              </CardContent>
            </Card>
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
    </div>
  )
}
