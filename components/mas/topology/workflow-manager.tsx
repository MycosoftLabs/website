"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  RefreshCw, 
  Cloud, 
  Server, 
  Play, 
  Pause, 
  Upload, 
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Workflow,
  X
} from "lucide-react"

interface WorkflowItem {
  id: string
  name: string
  active: boolean
  updatedAt?: string
}

interface SyncStatus {
  local: {
    url: string
    count: number
    workflows: WorkflowItem[]
  }
  cloud: {
    url: string
    count: number
    workflows: WorkflowItem[]
  }
  sync: {
    onlyLocal: string[]
    onlyCloud: string[]
    inBoth: string[]
  }
}

interface WorkflowManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function WorkflowManager({ isOpen, onClose }: WorkflowManagerProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncResults, setSyncResults] = useState<{
    created: string[]
    skipped: string[]
    errors: string[]
  } | null>(null)

  const fetchSyncStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/n8n/sync")
      if (!response.ok) throw new Error("Failed to fetch sync status")
      const data = await response.json()
      setSyncStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchSyncStatus()
    }
  }, [isOpen, fetchSyncStatus])

  const handleSyncToCloud = async () => {
    setSyncing(true)
    setSyncResults(null)
    setError(null)
    try {
      const response = await fetch("/api/n8n/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "local-to-cloud" })
      })
      if (!response.ok) throw new Error("Sync failed")
      const data = await response.json()
      setSyncResults(data.results)
      await fetchSyncStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-zinc-900 border-zinc-700">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-purple-400" />
            <CardTitle className="text-white">n8n Workflow Manager</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSyncStatus}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error && (
            <div className="p-4 bg-red-900/20 border-b border-red-700 text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {syncResults && (
            <div className="p-4 bg-green-900/20 border-b border-green-700">
              <div className="text-green-400 flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4" />
                Sync Complete
              </div>
              <div className="text-sm text-zinc-400">
                Created: {syncResults.created.length} | 
                Skipped: {syncResults.skipped.length} | 
                Errors: {syncResults.errors.length}
              </div>
            </div>
          )}

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-zinc-700 bg-transparent p-0">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500">
                Overview
              </TabsTrigger>
              <TabsTrigger value="local" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500">
                Local ({syncStatus?.local.count || 0})
              </TabsTrigger>
              <TabsTrigger value="cloud" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500">
                Cloud ({syncStatus?.cloud.count || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="h-4 w-4 text-blue-400" />
                      <span className="text-white font-medium">Local n8n</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {syncStatus?.local.count || 0}
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      {syncStatus?.local.url || "Not connected"}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-800 border-zinc-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Cloud className="h-4 w-4 text-green-400" />
                      <span className="text-white font-medium">Cloud n8n</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {syncStatus?.cloud.count || 0}
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      {syncStatus?.cloud.url || "Not connected"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Only in Local ({syncStatus?.sync.onlyLocal.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {syncStatus?.sync.onlyLocal.slice(0, 10).map((name) => (
                      <Badge key={name} variant="outline" className="text-blue-400 border-blue-400">
                        {name}
                      </Badge>
                    ))}
                    {(syncStatus?.sync.onlyLocal.length || 0) > 10 && (
                      <Badge variant="outline" className="text-zinc-400">
                        +{(syncStatus?.sync.onlyLocal.length || 0) - 10} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Only in Cloud ({syncStatus?.sync.onlyCloud.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {syncStatus?.sync.onlyCloud.slice(0, 10).map((name) => (
                      <Badge key={name} variant="outline" className="text-green-400 border-green-400">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Synced ({syncStatus?.sync.inBoth.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {syncStatus?.sync.inBoth.slice(0, 10).map((name) => (
                      <Badge key={name} variant="outline" className="text-zinc-400">
                        {name}
                      </Badge>
                    ))}
                    {(syncStatus?.sync.inBoth.length || 0) > 10 && (
                      <Badge variant="outline" className="text-zinc-400">
                        +{(syncStatus?.sync.inBoth.length || 0) - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  onClick={handleSyncToCloud}
                  disabled={syncing || (syncStatus?.sync.onlyLocal.length || 0) === 0}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Sync to Cloud
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="local" className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-2">
                  {syncStatus?.local.workflows.map((wf) => (
                    <div
                      key={wf.id}
                      className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-zinc-700"
                    >
                      <div className="flex items-center gap-3">
                        {wf.active ? (
                          <Play className="h-4 w-4 text-green-400" />
                        ) : (
                          <Pause className="h-4 w-4 text-zinc-500" />
                        )}
                        <span className="text-white">{wf.name}</span>
                      </div>
                      <Badge variant={wf.active ? "default" : "secondary"}>
                        {wf.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                  {(syncStatus?.local.workflows.length || 0) === 0 && (
                    <div className="text-center text-zinc-500 py-8">
                      No workflows found in local n8n
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="cloud" className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-2">
                  {syncStatus?.cloud.workflows.map((wf) => (
                    <div
                      key={wf.id}
                      className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-zinc-700"
                    >
                      <div className="flex items-center gap-3">
                        {wf.active ? (
                          <Play className="h-4 w-4 text-green-400" />
                        ) : (
                          <Pause className="h-4 w-4 text-zinc-500" />
                        )}
                        <span className="text-white">{wf.name}</span>
                      </div>
                      <Badge variant={wf.active ? "default" : "secondary"}>
                        {wf.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                  {(syncStatus?.cloud.workflows.length || 0) === 0 && (
                    <div className="text-center text-zinc-500 py-8">
                      No workflows found in cloud n8n
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
