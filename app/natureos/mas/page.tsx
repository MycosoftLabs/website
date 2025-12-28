"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bot,
  Network,
  Activity,
  Cpu,
  Database,
  Zap,
  RefreshCw,
  Play,
  Pause,
  Settings,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  Globe,
  Radio,
  Server,
  Workflow,
} from "lucide-react"
import Link from "next/link"

interface Agent {
  id: string
  name: string
  type: string
  status: "active" | "idle" | "offline" | "error"
  lastRun?: string
  successRate?: number
  tasksCompleted?: number
}

interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy"
  uptime: number
  services: {
    name: string
    status: "up" | "down" | "degraded"
    latency?: number
  }[]
}

export default function MASIntegrationPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      // Fetch from MAS API
      const [healthRes, agentsRes] = await Promise.all([
        fetch("/api/health").catch(() => null),
        fetch("/api/myca/runs").catch(() => null),
      ])

      if (healthRes?.ok) {
        const healthData = await healthRes.json()
        setHealth({
          status: healthData.status || "healthy",
          uptime: healthData.uptime || 0,
          services: healthData.services || [],
        })
      } else {
        // Mock health data
        setHealth({
          status: "healthy",
          uptime: 86400,
          services: [
            { name: "MAS Orchestrator", status: "up", latency: 12 },
            { name: "PostgreSQL", status: "up", latency: 3 },
            { name: "Redis", status: "up", latency: 1 },
            { name: "Qdrant", status: "up", latency: 8 },
            { name: "n8n", status: "up", latency: 15 },
          ],
        })
      }

      // Mock agents data
      setAgents([
        { id: "1", name: "MYCA Core", type: "orchestrator", status: "active", successRate: 99.5, tasksCompleted: 1250 },
        { id: "2", name: "Data Scout", type: "research", status: "active", successRate: 97.2, tasksCompleted: 892 },
        { id: "3", name: "Spore Tracker", type: "monitoring", status: "active", successRate: 98.8, tasksCompleted: 2341 },
        { id: "4", name: "Network Guardian", type: "security", status: "idle", successRate: 100, tasksCompleted: 156 },
        { id: "5", name: "Growth Analyst", type: "analytics", status: "active", successRate: 96.5, tasksCompleted: 678 },
        { id: "6", name: "Lab Assistant", type: "automation", status: "idle", successRate: 95.0, tasksCompleted: 423 },
      ])
    } catch (error) {
      console.error("Failed to fetch MAS data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const activeAgents = agents.filter((a) => a.status === "active").length
  const totalTasks = agents.reduce((sum, a) => sum + (a.tasksCompleted || 0), 0)

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Multi-Agent System"
        text="Monitor and manage MYCA's distributed agent network"
      />

      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{activeAgents}</div>
              <p className="text-xs text-muted-foreground">
                {agents.length} total registered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTasks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Across all agents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold capitalize">{health?.status || "—"}</div>
                {health?.status === "healthy" && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {health?.services?.filter((s) => s.status === "up").length || 0} services online
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {health ? `${Math.floor((health.uptime || 0) / 86400)}d` : "—"}
              </div>
              <p className="text-xs text-muted-foreground">Since last restart</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="agents" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="agents" className="gap-2">
                <Bot className="h-4 w-4" />
                Agents
              </TabsTrigger>
              <TabsTrigger value="services" className="gap-2">
                <Server className="h-4 w-4" />
                Services
              </TabsTrigger>
              <TabsTrigger value="workflows" className="gap-2">
                <Workflow className="h-4 w-4" />
                Workflows
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" asChild>
                <a href="http://localhost:3100" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Full Dashboard
                </a>
              </Button>
            </div>
          </div>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <Card key={agent.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            agent.status === "active"
                              ? "bg-green-500/20"
                              : agent.status === "error"
                                ? "bg-red-500/20"
                                : "bg-gray-500/20"
                          }`}
                        >
                          <Bot
                            className={`h-5 w-5 ${
                              agent.status === "active"
                                ? "text-green-500"
                                : agent.status === "error"
                                  ? "text-red-500"
                                  : "text-gray-500"
                            }`}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                          <CardDescription className="capitalize">{agent.type}</CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant={
                          agent.status === "active"
                            ? "default"
                            : agent.status === "error"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {agent.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Success Rate</span>
                          <span className="font-mono">{agent.successRate}%</span>
                        </div>
                        <Progress value={agent.successRate} className="h-2" />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tasks Completed</span>
                        <span className="font-mono">{agent.tasksCompleted?.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Infrastructure Services</CardTitle>
                <CardDescription>Status of all MAS backend services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {health?.services?.map((service) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            service.status === "up"
                              ? "bg-green-500"
                              : service.status === "degraded"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                        />
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {service.latency && (
                          <span className="text-sm text-muted-foreground">
                            {service.latency}ms
                          </span>
                        )}
                        <Badge variant={service.status === "up" ? "default" : "destructive"}>
                          {service.status}
                        </Badge>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      No service data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" className="h-auto py-4 justify-start" asChild>
                <a href="http://localhost:5678" target="_blank" rel="noopener noreferrer">
                  <Workflow className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">n8n Workflows</div>
                    <div className="text-xs text-muted-foreground">Port 5678</div>
                  </div>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-4 justify-start" asChild>
                <a href="http://localhost:8001/docs" target="_blank" rel="noopener noreferrer">
                  <Globe className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">MAS API Docs</div>
                    <div className="text-xs text-muted-foreground">Port 8001</div>
                  </div>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-4 justify-start" asChild>
                <a href="http://localhost:3100" target="_blank" rel="noopener noreferrer">
                  <Network className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">MYCA Dashboard</div>
                    <div className="text-xs text-muted-foreground">Port 3100</div>
                  </div>
                </a>
              </Button>
            </div>
          </TabsContent>

          {/* Workflows Tab */}
          <TabsContent value="workflows" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Workflows</CardTitle>
                <CardDescription>n8n automation workflows</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "Voice Chat Pipeline", active: true, runs: 1250 },
                    { name: "MYCA Jarvis Handler", active: true, runs: 890 },
                    { name: "Spore Detection Alert", active: true, runs: 342 },
                    { name: "Data Sync Workflow", active: false, runs: 156 },
                    { name: "Report Generator", active: false, runs: 89 },
                  ].map((workflow) => (
                    <div
                      key={workflow.name}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Workflow className="h-4 w-4 text-muted-foreground" />
                        <span>{workflow.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {workflow.runs} runs
                        </span>
                        <Badge variant={workflow.active ? "default" : "secondary"}>
                          {workflow.active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
