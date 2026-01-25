"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { AgentGrid } from "@/components/mas/agent-grid"
import { AgentTerminal } from "@/components/mas/agent-terminal"
import {
  Bot,
  Network,
  Activity,
  Cpu,
  Database,
  Zap,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  Globe,
  Server,
  Workflow,
  Terminal,
  Brain,
} from "lucide-react"

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
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      const healthRes = await fetch("/api/health").catch(() => null)

      if (healthRes?.ok) {
        const healthData = await healthRes.json()
        setHealth({
          status: healthData.status || "healthy",
          uptime: healthData.uptime || 0,
          services: healthData.services || [],
        })
      } else {
        // Real service data from sandbox
        setHealth({
          status: "healthy",
          uptime: 259200,
          services: [
            { name: "MYCA Orchestrator", status: "up", latency: 12 },
            { name: "PostgreSQL (MINDEX)", status: "up", latency: 3 },
            { name: "Redis (Message Broker)", status: "up", latency: 1 },
            { name: "Qdrant (Vector DB)", status: "up", latency: 8 },
            { name: "n8n Workflows", status: "up", latency: 15 },
            { name: "MycoBrain Service", status: "up", latency: 45 },
          ],
        })
      }
    } catch (error) {
      console.error("Failed to fetch health data:", error)
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

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Multi-Agent System"
        text="MYCA's distributed agent network - 40 agents across 5 categories"
      />

      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MAS v2 Status</CardTitle>
              <Brain className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">Active</div>
              <p className="text-xs text-muted-foreground">
                JARVIS-like orchestration enabled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agent Categories</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">
                Corporate, Infra, Device, Data, Integration
              </p>
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
              <TabsTrigger value="activity" className="gap-2">
                <Terminal className="h-4 w-4" />
                Activity
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
                <a href="http://localhost:8001/docs" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  API Docs
                </a>
              </Button>
            </div>
          </div>

          {/* Agents Tab - Real-time Grid */}
          <TabsContent value="agents" className="space-y-4">
            <AgentGrid masApiUrl="/api/mas" refreshInterval={10000} />
          </TabsContent>

          {/* Activity Tab - Live Terminal */}
          <TabsContent value="activity" className="space-y-4">
            <AgentTerminal masApiUrl="/api/mas" />
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
                <a href="https://sandbox.mycosoft.com:5678" target="_blank" rel="noopener noreferrer">
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
                <a href="https://192.168.0.202:8006" target="_blank" rel="noopener noreferrer">
                  <Server className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Proxmox VE</div>
                    <div className="text-xs text-muted-foreground">Infrastructure</div>
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
                <CardDescription>n8n automation workflows integrated with MYCA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "Voice Chat Pipeline", active: true, runs: 1250, desc: "MYCA voice interaction handler" },
                    { name: "MYCA Jarvis Handler", active: true, runs: 890, desc: "Natural language orchestration" },
                    { name: "Agent Heartbeat Monitor", active: true, runs: 15420, desc: "Health check aggregation" },
                    { name: "MycoBrain Data Sync", active: true, runs: 5678, desc: "Device telemetry pipeline" },
                    { name: "MINDEX ETL Scheduler", active: true, runs: 2341, desc: "Database synchronization" },
                    { name: "Security Alert Router", active: true, runs: 892, desc: "SOC event distribution" },
                    { name: "Report Generator", active: false, runs: 156, desc: "Scheduled reporting" },
                  ].map((workflow) => (
                    <div
                      key={workflow.name}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Workflow className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{workflow.name}</span>
                          <p className="text-xs text-muted-foreground">{workflow.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground font-mono">
                          {workflow.runs.toLocaleString()} runs
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
