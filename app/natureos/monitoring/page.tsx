"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  RefreshCw, Cpu, MemoryStick, HardDrive, Activity, 
  Container, CheckCircle, XCircle, AlertCircle, Clock 
} from "lucide-react"

interface SystemMetrics {
  cpu: { usage: number }
  memory: { used: number; total: number; usedPercent: number }
  storage: { used: number; total: number; percentage: number }
  docker: { running: number; stopped: number }
  devices: { active: number; total: number }
}

interface ServiceStatus {
  name: string
  status: "healthy" | "unhealthy" | "unknown"
  uptime?: string
  port?: number
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  const services: ServiceStatus[] = [
    { name: "MAS Orchestrator", status: "healthy", uptime: "2d 14h", port: 8001 },
    { name: "Website", status: "healthy", uptime: "2d 14h", port: 3002 },
    { name: "n8n Local", status: "healthy", uptime: "2d 14h", port: 5678 },
    { name: "Redis", status: "healthy", uptime: "2d 14h", port: 6381 },
    { name: "PostgreSQL", status: "healthy", uptime: "2d 14h", port: 5436 },
    { name: "Gateway (Caddy)", status: "healthy", uptime: "2d 14h", port: 80 },
    { name: "MINDEX API", status: "healthy", uptime: "2d 14h", port: 8010 },
    { name: "Qdrant", status: "healthy", uptime: "2d 14h", port: 6333 },
  ]

  const containers = [
    { name: "mycosoft-mas", status: "running", image: "mycosoft-mas:latest", cpu: "2.3%", memory: "256 MB" },
    { name: "mycosoft-website", status: "running", image: "platform-infra-website", cpu: "1.1%", memory: "128 MB" },
    { name: "mycosoft-n8n", status: "running", image: "n8nio/n8n:latest", cpu: "0.8%", memory: "312 MB" },
    { name: "mycosoft-redis", status: "running", image: "redis:7-alpine", cpu: "0.1%", memory: "24 MB" },
    { name: "mycosoft-postgres", status: "running", image: "postgis/postgis:16-3.4", cpu: "0.5%", memory: "128 MB" },
    { name: "mycosoft-gateway", status: "running", image: "caddy:2-alpine", cpu: "0.2%", memory: "32 MB" },
  ]

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/natureos/system/metrics")
      if (res.ok) {
        const data = await res.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 10000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
      case "running":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "unhealthy":
      case "stopped":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Monitoring" text="System health and performance metrics" />

      <div className="space-y-6">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                CPU Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.cpu?.usage?.toFixed(1) || 0}%</div>
              <Progress value={metrics?.cpu?.usage || 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MemoryStick className="h-4 w-4" />
                Memory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.memory?.usedPercent?.toFixed(1) || 0}%</div>
              <Progress value={metrics?.memory?.usedPercent || 0} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {((metrics?.memory?.used || 0) / 1024 / 1024 / 1024).toFixed(1)} / {((metrics?.memory?.total || 0) / 1024 / 1024 / 1024).toFixed(1)} GB
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.storage?.percentage || 72}%</div>
              <Progress value={metrics?.storage?.percentage || 72} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.storage?.used?.toFixed(1) || 1.8} / {metrics?.storage?.total || 2.5} TB
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Container className="h-4 w-4" />
                Containers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{metrics?.docker?.running || 6}</div>
              <p className="text-xs text-muted-foreground">
                {metrics?.docker?.stopped || 0} stopped
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="services">
          <TabsList>
            <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
            <TabsTrigger value="containers">Containers ({containers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Service Health</CardTitle>
                <CardDescription>Status of all running services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2">
                  {services.map((service) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(service.status)}
                        <div>
                          <span className="font-medium">{service.name}</span>
                          {service.port && (
                            <span className="text-xs text-muted-foreground ml-2">:{service.port}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {service.uptime && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {service.uptime}
                          </span>
                        )}
                        <Badge variant={service.status === "healthy" ? "default" : "destructive"}>
                          {service.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="containers" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Docker Containers</CardTitle>
                <CardDescription>All running Docker containers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {containers.map((container) => (
                    <div
                      key={container.name}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(container.status)}
                        <div>
                          <span className="font-medium">{container.name}</span>
                          <p className="text-xs text-muted-foreground">{container.image}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <div className="text-muted-foreground">CPU</div>
                          <div>{container.cpu}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground">Memory</div>
                          <div>{container.memory}</div>
                        </div>
                        <Badge variant={container.status === "running" ? "default" : "secondary"}>
                          {container.status}
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
