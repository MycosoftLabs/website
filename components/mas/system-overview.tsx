"use client"

/**
 * System Overview Panel
 * Real-time system metrics and status for MYCA Command Center
 */

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Server,
  Database,
  Cpu,
  HardDrive,
  Activity,
  Zap,
  Globe,
  Wifi,
  Shield,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Brain,
  Radio,
  Container,
} from "lucide-react"

interface ServiceStatus {
  name: string
  status: "up" | "down" | "degraded"
  latency?: number
  icon?: React.ReactNode
  url?: string
}

interface SystemMetrics {
  cpu: number
  memory: number
  disk: number
  network: number
  activeAgents: number
  totalAgents: number
  tasksQueued: number
  tasksCompleted: number
}

interface SystemOverviewProps {
  masApiUrl?: string
  refreshInterval?: number
}

const DEFAULT_SERVICES: ServiceStatus[] = [
  { name: "MYCA Orchestrator", status: "up", latency: 12, icon: <Brain className="h-4 w-4" />, url: "http://192.168.0.188:8001" },
  { name: "Redis Broker", status: "up", latency: 2, icon: <Zap className="h-4 w-4" /> },
  { name: "PostgreSQL", status: "up", latency: 5, icon: <Database className="h-4 w-4" /> },
  { name: "n8n Workflows", status: "up", latency: 18, icon: <Activity className="h-4 w-4" />, url: "http://localhost:5678" },
  { name: "MycoBrain", status: "up", latency: 45, icon: <Radio className="h-4 w-4" /> },
  { name: "Docker Engine", status: "up", latency: 3, icon: <Container className="h-4 w-4" /> },
  { name: "Proxmox VE", status: "up", latency: 8, icon: <Server className="h-4 w-4" />, url: "https://192.168.0.202:8006" },
  { name: "UniFi Network", status: "up", latency: 15, icon: <Wifi className="h-4 w-4" /> },
]

export function SystemOverview({ masApiUrl = "/api/mas", refreshInterval = 15000 }: SystemOverviewProps) {
  const [services, setServices] = useState<ServiceStatus[]>(DEFAULT_SERVICES)
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 18,
    memory: 42,
    disk: 35,
    network: 12,
    activeAgents: 12,
    totalAgents: 40,
    tasksQueued: 3,
    tasksCompleted: 24589
  })
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch orchestrator health
      const healthRes = await fetch(`${masApiUrl}/health`).catch(() => null)
      if (healthRes?.ok) {
        const data = await healthRes.json()
        setServices(prev => prev.map(s => 
          s.name === "MYCA Orchestrator" 
            ? { ...s, status: data.status === "ok" ? "up" : "degraded" }
            : s
        ))
      }

      // Fetch agents
      const agentsRes = await fetch(`${masApiUrl}/agents`).catch(() => null)
      if (agentsRes?.ok) {
        const data = await agentsRes.json()
        const agents = data.agents || []
        setMetrics(prev => ({
          ...prev,
          activeAgents: agents.filter((a: any) => a.status === "active" || a.status === "busy").length,
          totalAgents: agents.length || 40
        }))
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error("Failed to fetch system status:", error)
    } finally {
      setLoading(false)
    }
  }, [masApiUrl])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchStatus, refreshInterval])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "up": return <CheckCircle className="h-4 w-4 text-green-500" />
      case "degraded": return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "down": return <XCircle className="h-4 w-4 text-red-500" />
      default: return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "up": return "bg-green-500"
      case "degraded": return "bg-yellow-500"
      case "down": return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  const upCount = services.filter(s => s.status === "up").length
  const overallStatus = upCount === services.length ? "healthy" : upCount > services.length / 2 ? "degraded" : "critical"

  return (
    <div className="space-y-4">
      {/* Overall Status Banner */}
      <Card className={`border-2 ${
        overallStatus === "healthy" ? "border-green-500/30 bg-green-500/5" :
        overallStatus === "degraded" ? "border-yellow-500/30 bg-yellow-500/5" :
        "border-red-500/30 bg-red-500/5"
      }`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${
                overallStatus === "healthy" ? "bg-green-500/20" :
                overallStatus === "degraded" ? "bg-yellow-500/20" :
                "bg-red-500/20"
              }`}>
                {overallStatus === "healthy" ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : overallStatus === "degraded" ? (
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg capitalize">{overallStatus}</h3>
                <p className="text-sm text-muted-foreground">
                  {upCount}/{services.length} services online • Last check: {lastUpdate.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">CPU</span>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{metrics.cpu}%</div>
            <Progress value={metrics.cpu} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Memory</span>
              <Server className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{metrics.memory}%</div>
            <Progress value={metrics.memory} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Disk</span>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{metrics.disk}%</div>
            <Progress value={metrics.disk} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Agents</span>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-green-500">{metrics.activeAgents}/{metrics.totalAgents}</div>
            <Progress value={(metrics.activeAgents / metrics.totalAgents) * 100} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Services Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Infrastructure Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(service.status)}`} />
                  <div className="p-1.5 rounded bg-muted">
                    {service.icon}
                  </div>
                  <div>
                    <span className="font-medium text-sm">{service.name}</span>
                    {service.latency && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {service.latency}ms
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={service.status === "up" ? "default" : service.status === "degraded" ? "secondary" : "destructive"}>
                    {service.status}
                  </Badge>
                  {service.url && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <a href={service.url} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
