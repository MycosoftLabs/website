"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Search,
  RefreshCw,
  Play,
  Pause,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Activity,
  Zap,
  Box,
  ChevronDown,
  ChevronRight,
  Eye,
  AlertTriangle,
  Wifi,
  WifiOff,
} from "lucide-react"

interface Workflow {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
  category: string
  nodesCount: number
}

interface WorkflowStats {
  total: number
  active: number
  inactive: number
  byCategory: Record<string, number>
}

interface ExecutionStats {
  total: number
  success: number
  error: number
  running: number
}

const CATEGORY_COLORS: Record<string, string> = {
  core: "bg-blue-500",
  native: "bg-green-500",
  ops: "bg-orange-500",
  speech: "bg-purple-500",
  mindex: "bg-cyan-500",
  custom: "bg-gray-500",
}

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core MYCA",
  native: "Native Integrations",
  ops: "Operations",
  speech: "Speech/Voice",
  mindex: "MINDEX",
  custom: "Custom",
}

interface WorkflowStudioProps {
  n8nUrl?: string
  className?: string
}

export function WorkflowStudio({ n8nUrl = "http://192.168.0.188:5678", className }: WorkflowStudioProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats | null>(null)
  const [executionStats, setExecutionStats] = useState<ExecutionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"online" | "offline" | "checking">("checking")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["core", "speech"]))

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/n8n/workflows")
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setConnectionStatus("offline")
      } else if (data.workflows) {
        setWorkflows(data.workflows)
        setWorkflowStats(data.stats)
        setConnectionStatus("online")
        setError(null)
      }
    } catch (err) {
      console.error("Error fetching workflows:", err)
      setError(String(err))
      setConnectionStatus("offline")
    }
  }, [])

  const fetchExecutions = useCallback(async () => {
    try {
      const res = await fetch("/api/n8n/executions?limit=50")
      const data = await res.json()
      if (data.stats) {
        setExecutionStats(data.stats)
      }
    } catch (err) {
      console.error("Error fetching executions:", err)
    }
  }, [])

  const refreshData = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchWorkflows(), fetchExecutions()])
    setLoading(false)
  }, [fetchWorkflows, fetchExecutions])

  useEffect(() => {
    refreshData()
    const interval = setInterval(refreshData, 30000)
    return () => clearInterval(interval)
  }, [refreshData])

  const handleToggleWorkflow = async (workflow: Workflow) => {
    try {
      const action = workflow.active ? "deactivate" : "activate"
      const res = await fetch("/api/n8n/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: workflow.id, action }),
      })
      if (res.ok) {
        setWorkflows(prev => prev.map(w =>
          w.id === workflow.id ? { ...w, active: !w.active } : w
        ))
      }
    } catch (error) {
      console.error("Error toggling workflow:", error)
    }
  }

  const openN8N = (workflowId?: string) => {
    const url = workflowId ? `${n8nUrl}/workflow/${workflowId}` : n8nUrl
    window.open(url, "_blank")
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedWorkflows = filteredWorkflows.reduce((acc, w) => {
    if (!acc[w.category]) acc[w.category] = []
    acc[w.category].push(w)
    return acc
  }, {} as Record<string, Workflow[]>)

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A"
    const date = new Date(dateStr)
    return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className={className}>
      {/* Connection Status Banner */}
      {connectionStatus === "offline" && (
        <div className="mb-4 p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 flex items-center gap-3">
          <WifiOff className="h-5 w-5 text-yellow-500" />
          <div className="flex-1">
            <p className="font-medium text-yellow-600 dark:text-yellow-400">n8n Connection Unavailable</p>
            <p className="text-sm text-muted-foreground">
              Cannot connect to n8n at {n8nUrl}. Make sure the MAS VM is running.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Retry
          </Button>
        </div>
      )}

      {connectionStatus === "online" && workflows.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-green-500/30 bg-green-500/5 flex items-center gap-2">
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600 dark:text-green-400">
            Connected to n8n - {workflows.length} workflows loaded
          </span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Workflows</p>
                <p className="text-2xl font-bold">{workflowStats?.total || 0}</p>
              </div>
              <Zap className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-500">{workflowStats?.active || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Executions (24h)</p>
                <p className="text-2xl font-bold">{executionStats?.total || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-500">{executionStats?.error || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={refreshData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Button onClick={() => openN8N()}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open n8n
        </Button>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        {Object.entries(groupedWorkflows).sort(([a], [b]) => {
          const order = ["core", "speech", "native", "ops", "mindex", "custom"]
          return order.indexOf(a) - order.indexOf(b)
        }).map(([category, categoryWorkflows]) => (
          <Card key={category}>
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
              onClick={() => toggleCategory(category)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {expandedCategories.has(category) ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className={`h-3 w-3 rounded-full ${CATEGORY_COLORS[category]}`} />
                  <CardTitle className="text-base">{CATEGORY_LABELS[category] || category}</CardTitle>
                  <Badge variant="secondary">{categoryWorkflows.length}</Badge>
                </div>
                <div className="text-sm text-green-500">
                  {categoryWorkflows.filter(w => w.active).length} active
                </div>
              </div>
            </CardHeader>
            {expandedCategories.has(category) && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {categoryWorkflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${workflow.active ? "bg-green-500" : "bg-gray-400"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{workflow.name}</div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Box className="h-3 w-3" />
                              {workflow.nodesCount} nodes
                            </span>
                            <span>Updated: {formatDate(workflow.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={workflow.active ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleWorkflow(workflow)}
                          className="gap-1"
                        >
                          {workflow.active ? (
                            <>
                              <Pause className="h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" />
                              Inactive
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openN8N(workflow.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* n8n Quick Access */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            n8n Workflow Editor
          </CardTitle>
          <CardDescription>
            Access the full n8n workflow editor to create and manage automation workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 px-6 border rounded-lg bg-gradient-to-br from-orange-500/5 to-amber-500/5 border-orange-500/20">
            <Zap className="h-16 w-16 text-orange-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Open n8n Editor</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              The n8n workflow editor opens in a new tab for security. Create, edit, and manage 
              your automation workflows with the full visual editor.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => openN8N()} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open n8n Editor
              </Button>
              <Button variant="outline" onClick={() => window.open("http://localhost:5678", "_blank")} className="gap-2">
                <Zap className="h-4 w-4" />
                Local n8n
              </Button>
            </div>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-green-500">{workflowStats?.active || 0}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{workflowStats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-blue-500">{executionStats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Executions</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-red-500">{executionStats?.error || 0}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
