"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, Play, Pause, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle, Brain, Zap, Shield, Mic, Settings, FileCode } from "lucide-react"

interface Workflow {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface Execution {
  id: string
  workflowId: string
  status: string
  startedAt: string
  stoppedAt?: string
}

interface N8NStatus {
  local: {
    connected: boolean
    url: string
    workflows: Workflow[]
    executions: Execution[]
    activeWorkflows: number
    totalWorkflows: number
  }
  cloud: {
    connected: boolean
    url: string
    workflows: Workflow[]
    executions: Execution[]
    activeWorkflows: number
    totalWorkflows: number
  }
}

interface KnownWorkflow {
  id: string
  name: string
  description: string
  category: "myca" | "native" | "ops" | "speech" | "defense" | "other"
  file: string
}

interface WorkflowsList {
  total: number
  categories: Record<string, number>
  workflows: KnownWorkflow[]
}

export default function WorkflowsPage() {
  const [status, setStatus] = useState<N8NStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("local")
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string>("")
  const [knownWorkflows, setKnownWorkflows] = useState<WorkflowsList | null>(null)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/natureos/n8n")
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (error) {
      console.error("Failed to fetch n8n status:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchKnownWorkflows = async () => {
    try {
      const res = await fetch("/api/natureos/n8n/workflows-list")
      if (res.ok) {
        const data = await res.json()
        setKnownWorkflows(data)
      }
    } catch (error) {
      console.error("Failed to fetch known workflows:", error)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchKnownWorkflows()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "running":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const currentInstance = activeTab === "local" ? status?.local : status?.cloud

  return (
    <DashboardShell>
      <DashboardHeader 
        heading="Workflow Automation" 
        text="Manage n8n workflows across local and cloud instances"
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="local" className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status?.local?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                Local (localhost:5678)
              </TabsTrigger>
              <TabsTrigger value="cloud" className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status?.cloud?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                Cloud (mycosoft.app.n8n.cloud)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {activeTab === "cloud" && (
              <Button
                variant="outline"
                size="sm"
                disabled={importing}
                onClick={async () => {
                  setImporting(true)
                  setImportMessage("")
                  try {
                    const res = await fetch("/api/natureos/n8n/import", { method: "POST" })
                    const json = await res.json().catch(() => ({}))
                    if (!res.ok) {
                      setImportMessage(json?.error || "Import failed")
                    } else {
                      setImportMessage(
                        `Imported: created ${json?.totals?.created ?? 0}, updated ${json?.totals?.updated ?? 0}, skipped ${json?.totals?.skipped ?? 0}`,
                      )
                      await fetchStatus()
                    }
                  } catch (e) {
                    setImportMessage(e instanceof Error ? e.message : "Import failed")
                  } finally {
                    setImporting(false)
                  }
                }}
              >
                {importing ? "Importing..." : "Import workflows to cloud"}
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <a 
                href={activeTab === "local" ? "http://localhost:5678" : "https://mycosoft.app.n8n.cloud"} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open n8n
              </a>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${currentInstance?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-2xl font-bold">
                  {currentInstance?.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentInstance?.totalWorkflows || 0}</div>
              <p className="text-xs text-muted-foreground">
                {currentInstance?.activeWorkflows || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentInstance?.executions?.length || 0}</div>
              <p className="text-xs text-muted-foreground">in the last hour</p>
            </CardContent>
          </Card>
        </div>

        {importMessage && (
          <Card>
            <CardContent className="py-4 text-sm">{importMessage}</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Workflows</CardTitle>
            <CardDescription>
              {currentInstance?.connected 
                ? `${currentInstance.workflows?.length || 0} workflows available`
                : "Connect to n8n to see workflows"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : currentInstance?.workflows && currentInstance.workflows.length > 0 ? (
              <div className="space-y-2">
                {currentInstance.workflows.map((workflow) => (
                  <div 
                    key={workflow.id} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {workflow.active ? (
                        <Play className="h-4 w-4 text-green-500" />
                      ) : (
                        <Pause className="h-4 w-4 text-gray-500" />
                      )}
                      <div>
                        <p className="font-medium">{workflow.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {formatDate(workflow.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={workflow.active ? "default" : "secondary"}>
                      {workflow.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {currentInstance?.connected 
                  ? "No workflows found. Create one in n8n!"
                  : "Unable to connect to n8n. Make sure it's running."
                }
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Executions</CardTitle>
            <CardDescription>Latest workflow runs</CardDescription>
          </CardHeader>
          <CardContent>
            {currentInstance?.executions && currentInstance.executions.length > 0 ? (
              <div className="space-y-2">
                {currentInstance.executions.map((execution) => (
                  <div 
                    key={execution.id} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <p className="font-medium">Workflow {execution.workflowId}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(execution.startedAt)}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={execution.status === "success" ? "default" : execution.status === "error" ? "destructive" : "secondary"}
                    >
                      {execution.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent executions
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Workflows in Repository */}
        {knownWorkflows && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Available Workflows in MAS Repository
              </CardTitle>
              <CardDescription>
                {knownWorkflows.total} workflow definitions available for import
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Category Stats */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
                <div className="text-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Brain className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                  <p className="text-lg font-bold">{knownWorkflows.categories.myca || 0}</p>
                  <p className="text-xs text-muted-foreground">MYCA</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Zap className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                  <p className="text-lg font-bold">{knownWorkflows.categories.native || 0}</p>
                  <p className="text-xs text-muted-foreground">Native</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <Settings className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                  <p className="text-lg font-bold">{knownWorkflows.categories.ops || 0}</p>
                  <p className="text-xs text-muted-foreground">Ops</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Mic className="h-4 w-4 mx-auto mb-1 text-green-500" />
                  <p className="text-lg font-bold">{knownWorkflows.categories.speech || 0}</p>
                  <p className="text-xs text-muted-foreground">Speech</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <Shield className="h-4 w-4 mx-auto mb-1 text-red-500" />
                  <p className="text-lg font-bold">{knownWorkflows.categories.defense || 0}</p>
                  <p className="text-xs text-muted-foreground">Defense</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-gray-500/10 border border-gray-500/20">
                  <FileCode className="h-4 w-4 mx-auto mb-1 text-gray-500" />
                  <p className="text-lg font-bold">{knownWorkflows.categories.other || 0}</p>
                  <p className="text-xs text-muted-foreground">Other</p>
                </div>
              </div>

              {/* Workflow List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {knownWorkflows.workflows.map((wf) => {
                  const categoryIcon = {
                    myca: <Brain className="h-4 w-4 text-purple-500" />,
                    native: <Zap className="h-4 w-4 text-blue-500" />,
                    ops: <Settings className="h-4 w-4 text-orange-500" />,
                    speech: <Mic className="h-4 w-4 text-green-500" />,
                    defense: <Shield className="h-4 w-4 text-red-500" />,
                    other: <FileCode className="h-4 w-4 text-gray-500" />,
                  }[wf.category]
                  
                  return (
                    <div 
                      key={wf.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {categoryIcon}
                        <div>
                          <p className="font-medium text-sm">{wf.name}</p>
                          <p className="text-xs text-muted-foreground">{wf.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {wf.category}
                      </Badge>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  To import these workflows, start n8n and run:
                </p>
                <code className="text-xs bg-muted p-2 rounded block">
                  cd n8n && .\scripts\import_all_workflows.ps1
                </code>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
