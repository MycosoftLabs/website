"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { 
  Box, 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  Terminal, 
  RefreshCw, 
  Search, 
  Plus, 
  Activity, 
  Cpu, 
  HardDrive,
  Download,
  Upload,
  Copy,
  Server,
  Cloud,
  Settings,
  Eye,
  FileText,
  Archive,
  Layers,
  Network,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Bot,
  ExternalLink,
  MoreVertical,
  FlaskConical,
  Shield,
  Save,
  Database
} from "lucide-react"
import { MINDEXDashboard } from "@/components/natureos/mindex-dashboard"

interface Container {
  id: string
  name: string
  image: string
  status: "running" | "stopped" | "restarting" | "paused" | "exited" | "dead"
  cpu: number
  memory: number
  memoryLimit: number
  ports: string[]
  uptime: string
  created: string
  networks: string[]
  volumes: string[]
  health?: "healthy" | "unhealthy" | "starting" | "none"
  restartCount?: number
  labels?: Record<string, string>
}

interface DockerStats {
  totalContainers: number
  running: number
  stopped: number
  paused: number
  totalCpu: number
  totalMemory: number
  totalMemoryLimit: number
  images: number
  volumes: number
  networks: number
}

interface MCPServer {
  id: string
  name: string
  image: string
  status: "running" | "stopped" | "error"
  port?: number
  type: string
  description?: string
  capabilities?: string[]
}

interface DockerImage {
  id: string
  name: string
  tag: string
  sizeFormatted: string
  created: string
  isMcp: boolean
}

export default function ContainersPage() {
  const [containers, setContainers] = useState<Container[]>([])
  const [stats, setStats] = useState<DockerStats | null>(null)
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([])
  const [images, setImages] = useState<DockerImage[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [mainTab, setMainTab] = useState<"containers" | "mcp" | "images" | "mindex">("containers")
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null)
  const [actionDialog, setActionDialog] = useState<{ type: string; container: Container } | null>(null)
  const [logs, setLogs] = useState<string>("")
  const [logsDialog, setLogsDialog] = useState(false)
  const [dockerConnected, setDockerConnected] = useState(false)

  // Fetch real containers from Docker API
  const fetchContainers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/docker/containers")
      if (res.ok) {
        const data = await res.json()
        setContainers(data.containers || [])
        setStats(data.stats || null)
        setDockerConnected(true)
      }
    } catch (error) {
      console.error("Failed to fetch containers:", error)
      setContainers([])
      setStats(null)
      setDockerConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch MCP servers
  const fetchMcpServers = useCallback(async () => {
    try {
      const res = await fetch("/api/docker/mcp")
      if (res.ok) {
        const data = await res.json()
        setMcpServers(data.servers || [])
      }
    } catch (error) {
      console.error("Failed to fetch MCP servers:", error)
    }
  }, [])

  // Fetch Docker images
  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch("/api/docker/images")
      if (res.ok) {
        const data = await res.json()
        setImages(data.images || [])
      }
    } catch (error) {
      console.error("Failed to fetch images:", error)
    }
  }, [])

  useEffect(() => {
    fetchContainers()
    fetchMcpServers()
    fetchImages()
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchContainers()
      fetchMcpServers()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchContainers, fetchMcpServers, fetchImages])

  // Note: mock defaults removed. This page requires a live Docker API.

  // Container actions
  const handleContainerAction = async (action: string, containerId: string) => {
    try {
      const res = await fetch("/api/docker/containers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, containerId }),
      })
      
      if (res.ok) {
        await fetchContainers()
      }
    } catch (error) {
      console.error(`Failed to ${action} container:`, error)
    }
    setActionDialog(null)
  }

  // Fetch container logs
  const fetchLogs = async (containerId: string) => {
    try {
      const res = await fetch(`/api/docker/containers/logs?id=${containerId}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || "No logs available")
      }
    } catch (error) {
      setLogs(`Failed to fetch logs: ${error instanceof Error ? error.message : String(error)}`)
    }
    setLogsDialog(true)
  }

  const filtered = containers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                          c.image.toLowerCase().includes(search.toLowerCase())
    const matchesTab = activeTab === "all" || 
                       (activeTab === "running" && c.status === "running") ||
                       (activeTab === "stopped" && (c.status === "stopped" || c.status === "exited"))
    return matchesSearch && matchesTab
  })

  const getStatusIcon = (status: string, health?: string) => {
    if (health === "unhealthy") return <XCircle className="h-4 w-4 text-red-500" />
    if (health === "starting") return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
    switch (status) {
      case "running": return <CheckCircle className="h-4 w-4 text-green-500" />
      case "stopped": case "exited": return <Square className="h-4 w-4 text-gray-500" />
      case "restarting": return <RotateCcw className="h-4 w-4 text-yellow-500 animate-spin" />
      case "paused": return <Clock className="h-4 w-4 text-blue-500" />
      default: return <AlertTriangle className="h-4 w-4 text-orange-500" />
    }
  }

  const getStatusBadge = (status: string, health?: string) => {
    if (health === "unhealthy") return "destructive"
    switch (status) {
      case "running": return "default"
      case "stopped": case "exited": return "secondary"
      case "restarting": return "outline"
      default: return "secondary"
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Box className="h-8 w-8 text-blue-500" />
            Container Management
          </h1>
          <p className="text-muted-foreground">
            Manage Docker containers, create backups, and deploy to Proxmox VMs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={dockerConnected ? "default" : "secondary"} className="mr-2">
            {dockerConnected ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Docker Connected</>
            ) : (
              <><AlertTriangle className="h-3 w-3 mr-1" /> Demo Mode</>
            )}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <a href="http://localhost:9000" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Portainer
            </a>
          </Button>
          <Button variant="outline" onClick={() => { fetchContainers(); fetchMcpServers(); fetchImages(); }} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Deploy Container
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Box className="h-4 w-4" /> Containers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalContainers || containers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" /> Running
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats?.running || containers.filter(c => c.status === "running").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4" /> CPU
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCpu?.toFixed(1) || 0}%</div>
            <Progress value={stats?.totalCpu || 0} className="h-1 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" /> Memory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((stats?.totalMemory || 0) / 1024).toFixed(1)} GB</div>
            <Progress value={((stats?.totalMemory || 0) / (stats?.totalMemoryLimit || 1)) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4" /> Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.images || 15}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="h-4 w-4" /> Networks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.networks || 3}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common container operations and integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Archive className="h-5 w-5" />
              <span className="text-xs">Backup All</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Download className="h-5 w-5" />
              <span className="text-xs">Export to NAS</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Server className="h-5 w-5" />
              <span className="text-xs">Deploy to Proxmox</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Copy className="h-5 w-5" />
              <span className="text-xs">Clone Stack</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <FlaskConical className="h-5 w-5" />
              <span className="text-xs">Test Environment</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Bot className="h-5 w-5" />
              <span className="text-xs">MYCA Simulation</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "containers" | "mcp" | "images" | "mindex")}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="containers" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            Containers ({containers.length})
          </TabsTrigger>
          <TabsTrigger value="mcp" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            MCP Servers ({mcpServers.filter(s => s.status === "running").length})
          </TabsTrigger>
          <TabsTrigger value="mindex" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            MINDEX
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Images ({images.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="containers" className="mt-4">
      {/* Container List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Containers</CardTitle>
              <CardDescription>All Docker containers in the Mycosoft stack</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="running">Running</TabsTrigger>
                  <TabsTrigger value="stopped">Stopped</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search containers..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="pl-9 w-64" 
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(container => (
              <div 
                key={container.id} 
                className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(container.status, container.health)}
                  <div className="p-2 rounded-lg bg-muted">
                    <Box className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{container.name}</span>
                      <Badge variant={getStatusBadge(container.status, container.health) as "default" | "secondary" | "destructive" | "outline"}>
                        {container.health === "unhealthy" ? "unhealthy" : container.status}
                      </Badge>
                      {container.restartCount && container.restartCount > 3 && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {container.restartCount} restarts
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{container.image}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {container.status === "running" && (
                    <>
                      <div className="text-right">
                        <div className="text-sm font-medium">{container.cpu.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">CPU</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{container.memory} MB</div>
                        <div className="text-xs text-muted-foreground">Memory</div>
                      </div>
                    </>
                  )}
                  
                  <div className="text-right min-w-[100px]">
                    <div className="text-sm font-mono">{container.ports.join(", ") || "-"}</div>
                    <div className="text-xs text-muted-foreground">Ports</div>
                  </div>
                  
                  <div className="text-right min-w-[80px]">
                    <div className="text-sm">{container.uptime}</div>
                    <div className="text-xs text-muted-foreground">Uptime</div>
                  </div>
                  
                  <div className="flex gap-1">
                    {container.status === "running" ? (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setActionDialog({ type: "stop", container })}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-green-500"
                        onClick={() => handleContainerAction("start", container.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleContainerAction("restart", container.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedContainer(container)
                        fetchLogs(container.id)
                      }}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setActionDialog({ type: "clone", container })}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setActionDialog({ type: "backup", container })}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      </TabsContent>

        <TabsContent value="mcp" className="mt-4">
          {/* MCP Servers List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    MCP Servers
                  </CardTitle>
                  <CardDescription>Model Context Protocol servers for AI tool integration</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Deploy MCP Server
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mcpServers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No MCP servers detected</p>
                  <p className="text-sm mt-2">Deploy MCP servers to enable AI tool integrations</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mcpServers.map(server => (
                    <div key={server.id} className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50">
                      <div className="flex items-center gap-4">
                        {server.status === "running" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                        <div className="p-2 rounded-lg bg-yellow-500/10">
                          <Zap className="h-5 w-5 text-yellow-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{server.name}</span>
                            <Badge variant="outline">{server.type}</Badge>
                            <Badge variant={server.status === "running" ? "default" : "secondary"}>
                              {server.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{server.description}</p>
                          {server.capabilities && server.capabilities.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {server.capabilities.map(cap => (
                                <Badge key={cap} variant="secondary" className="text-xs">{cap}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {server.port && (
                          <span className="font-mono text-sm">:{server.port}</span>
                        )}
                        <div className="flex gap-1">
                          {server.status === "running" ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Square className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500">
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Terminal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available MCP Images */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Available MCP Server Images</CardTitle>
              <CardDescription>Pre-built MCP servers ready to deploy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { name: "mcp/filesystem", desc: "File system access", type: "filesystem" },
                  { name: "mcp/github", desc: "GitHub integration", type: "github" },
                  { name: "mcp/postgres", desc: "PostgreSQL queries", type: "database" },
                  { name: "mcp/puppeteer", desc: "Browser automation", type: "browser" },
                  { name: "mcp/fetch", desc: "HTTP requests", type: "http" },
                  { name: "mcp/memory", desc: "Knowledge storage", type: "memory" },
                ].map(img => (
                  <div key={img.name} className="p-4 rounded-lg border hover:border-primary/50 cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{img.name}</span>
                      <Badge variant="outline">{img.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{img.desc}</p>
                    <Button size="sm" variant="outline" className="w-full">
                      <Download className="h-3 w-3 mr-2" />
                      Deploy
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="mt-4">
          {/* Docker Images */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-500" />
                    Docker Images
                  </CardTitle>
                  <CardDescription>Local images and Docker Hub</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Cloud className="h-4 w-4 mr-2" />
                    Docker Hub
                  </Button>
                  <Button variant="outline">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Prune Unused
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {images.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No images found</p>
                  </div>
                ) : (
                  images.map(img => (
                    <div key={img.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Layers className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{img.name}</span>
                            <Badge variant="outline">{img.tag}</Badge>
                            {img.isMcp && (
                              <Badge className="bg-yellow-500">MCP</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{img.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{img.sizeFormatted}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mindex" className="mt-4">
          <MINDEXDashboard />
        </TabsContent>
      </Tabs>

      {/* Integration Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Proxmox Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-orange-500" />
              Proxmox Integration
            </CardTitle>
            <CardDescription>Deploy containers as VMs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Export container stacks to Proxmox VMs for production deployment or isolated testing.
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">Proxmox Host</span>
                <Badge variant="outline">Not Configured</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">Available Templates</span>
                <span className="text-sm font-mono">3</span>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Configure Proxmox
            </Button>
          </CardContent>
        </Card>

        {/* NAS Backup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-blue-500" />
              NAS Backup
            </CardTitle>
            <CardDescription>Automated container backups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Backup container volumes and images to your UniFi NAS for disaster recovery.
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">NAS Status</span>
                <Badge className="bg-green-500">Connected</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">Last Backup</span>
                <span className="text-sm">2h ago</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">Backup Size</span>
                <span className="text-sm font-mono">12.4 GB</span>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              <Archive className="h-4 w-4 mr-2" />
              Backup Now
            </Button>
          </CardContent>
        </Card>

        {/* MYCA Simulation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-500" />
              MYCA Simulation
            </CardTitle>
            <CardDescription>AI-powered testing environment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Let MYCA create isolated container clones for testing improvements without affecting production.
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">Active Simulations</span>
                <span className="text-sm font-mono">0</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">Tests Available</span>
                <span className="text-sm font-mono">5</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <FlaskConical className="h-4 w-4 mr-2" />
                New Test
              </Button>
              <Button variant="outline" className="flex-1">
                <Shield className="h-4 w-4 mr-2" />
                Clone Stack
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === "stop" && "Stop Container"}
              {actionDialog?.type === "clone" && "Clone Container"}
              {actionDialog?.type === "backup" && "Backup Container"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === "stop" && `Are you sure you want to stop ${actionDialog?.container.name}?`}
              {actionDialog?.type === "clone" && `Create a clone of ${actionDialog?.container.name} for testing?`}
              {actionDialog?.type === "backup" && `Backup ${actionDialog?.container.name} to NAS?`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {actionDialog?.type === "clone" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Clone Name</label>
                  <Input defaultValue={`${actionDialog?.container.name}-test`} className="mt-1" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isolated" defaultChecked />
                  <label htmlFor="isolated" className="text-sm">Isolated network (safe testing)</label>
                </div>
              </div>
            )}
            {actionDialog?.type === "backup" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <span>Destination</span>
                  <span className="font-mono text-sm">\\mycosoft-nas\backups\containers</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="volumes" defaultChecked />
                  <label htmlFor="volumes" className="text-sm">Include volumes</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="compress" defaultChecked />
                  <label htmlFor="compress" className="text-sm">Compress backup</label>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button 
              variant={actionDialog?.type === "stop" ? "destructive" : "default"}
              onClick={() => handleContainerAction(actionDialog?.type || "", actionDialog?.container.id || "")}
            >
              {actionDialog?.type === "stop" && "Stop"}
              {actionDialog?.type === "clone" && "Create Clone"}
              {actionDialog?.type === "backup" && "Start Backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={logsDialog} onOpenChange={setLogsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Container Logs: {selectedContainer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="bg-slate-950 rounded-lg p-4 h-[400px] overflow-auto">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{logs}</pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => selectedContainer && fetchLogs(selectedContainer.id)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setLogsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
