"use client"

/**
 * Pipeline Topology 3D – System circulatory view
 * Same stack as Agent Topology: TopologyNode3D + TopologyConnection3D (flow, particles).
 * Frontend (left) → APIs (center) → Infrastructure (right).
 */

import { useState, useEffect, useCallback, useMemo, Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { RefreshCw, Activity, Zap, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import type { TopologyData, TopologyFilter, TopologyViewState } from "./types"
import type { ActivityNode, ActivityTopologyData } from "./activity-types"
import { pipelineToTopologyData } from "./pipeline-adapter"
import { TopologyNode3D } from "./topology-node"
import { TopologyConnection3D } from "./topology-connection"

const DEFAULT_VIEW_STATE: TopologyViewState = {
  zoom: 1,
  rotation: [0, 0, 0],
  center: [0, 0, 0],
  selectedNodeId: null,
  hoveredNodeId: null,
  detailLevel: "overview",
  animationSpeed: 1,
  particleEnabled: true,
}

const DEFAULT_FILTER: TopologyFilter = {
  categories: [],
  types: [],
  statuses: [],
  searchQuery: "",
  showInactive: true,
  showConnections: true,
  showLabels: true,
  showMetrics: false,
}

function PipelineScene({
  data,
  viewState,
  setViewState,
  hoveredNodeId,
  setHoveredNodeId,
  onSelectNode,
}: {
  data: TopologyData
  viewState: TopologyViewState
  setViewState: (v: TopologyViewState) => void
  hoveredNodeId: string | null
  setHoveredNodeId: (id: string | null) => void
  onSelectNode: (id: string) => void
}) {
  const filteredNodes = useMemo(() => {
    return data.nodes.filter((node) => {
      if (!node.position || !Array.isArray(node.position) || node.position.length < 3) return false
      if (viewState.selectedNodeId && node.status === "offline") return true
      if (DEFAULT_FILTER.categories.length > 0 && !DEFAULT_FILTER.categories.includes(node.category)) return false
      if (!DEFAULT_FILTER.showInactive && (node.status === "offline" || node.status === "error")) return false
      if (DEFAULT_FILTER.searchQuery) {
        const q = DEFAULT_FILTER.searchQuery.toLowerCase()
        if (!node.name.toLowerCase().includes(q) && !node.shortName.toLowerCase().includes(q) && !String(node.id).toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [data.nodes])

  const filteredConnections = useMemo(() => {
    if (!DEFAULT_FILTER.showConnections) return []
    const nodeIds = new Set(filteredNodes.map((n) => n.id))
    return data.connections.filter((c) => nodeIds.has(c.sourceId) && nodeIds.has(c.targetId))
  }, [data.connections, filteredNodes])

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[30, 50, 30]} intensity={0.8} castShadow />
      <pointLight position={[-50, 40, -50]} intensity={0.5} color="#4f46e5" />
      <pointLight position={[50, 40, 50]} intensity={0.3} color="#22d3ee" />
      <gridHelper args={[120, 40, "#334155", "#1e293b"]} position={[0, -25, 0]} />

      {filteredConnections.map((connection) => {
        const sourceNode = filteredNodes.find((n) => n.id === connection.sourceId)
        const targetNode = filteredNodes.find((n) => n.id === connection.targetId)
        if (!sourceNode || !targetNode || !sourceNode.position || !targetNode.position) return null
        return (
          <TopologyConnection3D
            key={connection.id}
            connection={connection}
            sourceNode={sourceNode}
            targetNode={targetNode}
            packets={data.packets?.filter((p) => p.connectionId === connection.id) ?? []}
            selected={viewState.selectedNodeId === connection.sourceId || viewState.selectedNodeId === connection.targetId}
            hovered={hoveredNodeId === connection.sourceId || hoveredNodeId === connection.targetId}
            animationSpeed={viewState.animationSpeed}
            showParticles={viewState.particleEnabled}
          />
        )
      })}

      {filteredNodes.map((node) => (
        <TopologyNode3D
          key={node.id}
          node={node}
          selected={node.id === viewState.selectedNodeId}
          hovered={node.id === hoveredNodeId}
          onSelect={(id) => {
            setViewState({ ...viewState, selectedNodeId: id })
            onSelectNode(id)
          }}
          onHover={setHoveredNodeId}
          showLabels={DEFAULT_FILTER.showLabels}
          showMetrics={DEFAULT_FILTER.showMetrics}
          animationSpeed={viewState.animationSpeed}
        />
      ))}
    </>
  )
}

function formatLastUpdated(iso: string): string {
  const t = new Date(iso).getTime()
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 60) return `${s} s ago`
  if (s < 3600) return `${Math.floor(s / 60)} m ago`
  return `${Math.floor(s / 3600)} h ago`
}

const NODE_TYPE_LABELS: Record<string, string> = {
  page: "Page",
  app: "App",
  api: "API",
  device: "Device",
  database: "Database",
  memory: "Memory",
  workflow: "Workflow",
  system: "System",
}

export function PipelineTopology3D({
  className,
  selectedId,
  onNodeClick,
  onDataLoad,
}: {
  className?: string
  selectedId?: string | null
  onNodeClick?: (node: ActivityNode) => void
  onDataLoad?: (data: ActivityTopologyData) => void
}) {
  const [activityData, setActivityData] = useState<ActivityTopologyData | null>(null)
  const [topologyData, setTopologyData] = useState<TopologyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewState, setViewState] = useState<TopologyViewState>(DEFAULT_VIEW_STATE)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/natureos/activity-topology", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load pipeline")
      const json: ActivityTopologyData = await res.json()
      setActivityData(json)
      onDataLoad?.(json)
      setTopologyData(pipelineToTopologyData(json))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [onDataLoad])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh when tab/page is visible (every 20s)
  useEffect(() => {
    if (typeof document === "undefined") return
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchData()
    }, 20000)
    return () => clearInterval(interval)
  }, [fetchData])

  const selectedActivityNode = useMemo(() => {
    const id = selectedId ?? viewState.selectedNodeId
    if (!id || !activityData) return null
    return activityData.nodes.find((n) => n.id === id) ?? null
  }, [selectedId, viewState.selectedNodeId, activityData])

  const connectionCount = useMemo(() => {
    const id = selectedActivityNode?.id
    if (!id || !activityData) return 0
    return activityData.connections.filter((c) => c.sourceId === id || c.targetId === id).length
  }, [selectedActivityNode?.id, activityData])

  useEffect(() => {
    if (selectedId != null) setViewState((v) => ({ ...v, selectedNodeId: selectedId }))
  }, [selectedId])

  const handleSelectNode = useCallback(
    (id: string) => {
      const node = activityData?.nodes.find((n) => n.id === id)
      if (node) onNodeClick?.(node)
    },
    [activityData, onNodeClick]
  )

  if (loading && !topologyData) {
    return (
      <div className={cn("flex items-center justify-center min-h-[500px] bg-muted/30 rounded-lg", className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span>Loading pipeline…</span>
        </div>
      </div>
    )
  }

  if (error && !topologyData) {
    return (
      <div className={cn("flex flex-col items-center justify-center min-h-[500px] bg-muted/30 rounded-lg gap-2", className)}>
        <p className="text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    )
  }

  if (!topologyData) return null

  return (
    <div className={cn("flex flex-col lg:flex-row gap-4 max-h-[calc(100vh-200px)]", className)}>
      <Card className="flex-1 min-h-[500px] max-h-[700px] overflow-hidden p-0 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Pipeline – Circulatory system
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              {activityData?.lastUpdated && (
                <span className="text-xs text-muted-foreground" title={activityData.lastUpdated}>
                  Updated {formatLastUpdated(activityData.lastUpdated)}
                </span>
              )}
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {topologyData.stats.totalNodes} nodes · {topologyData.stats.activeConnections} connections · <Zap className="inline h-3 w-3" /> flow
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Frontend → APIs → Infrastructure. Drag to orbit, scroll to zoom. Click a node for details.
          </p>
          {/* Status legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Healthy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500" /> Degraded
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Error
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <div className="relative rounded-b-lg overflow-hidden bg-[#0f172a] h-full" style={{ minHeight: 480, maxHeight: 'calc(100vh - 350px)' }}>
            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-white/60">Loading 3D…</div>}>
              <Canvas camera={{ position: [80, 20, 80], fov: 50 }} gl={{ antialias: true, alpha: false }}>
                <PipelineScene
                  data={topologyData}
                  viewState={viewState}
                  setViewState={setViewState}
                  hoveredNodeId={hoveredNodeId}
                  setHoveredNodeId={setHoveredNodeId}
                  onSelectNode={handleSelectNode}
                />
                <OrbitControls makeDefault enableDamping dampingFactor={0.05} minDistance={10} maxDistance={200} />
              </Canvas>
            </Suspense>
            <div className="absolute left-4 top-4 pointer-events-none flex gap-8 text-xs font-medium text-white/70">
              <span>Frontend</span>
              <span>APIs</span>
              <span>Infrastructure</span>
            </div>
            {activityData?.summary && (
              <div className="absolute right-4 bottom-4 pointer-events-none flex gap-3 text-[10px] text-white/60">
                <span>Healthy {activityData.summary.healthy}</span>
                <span>Degraded {activityData.summary.degraded}</span>
                <span>Error {activityData.summary.error}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="w-full lg:w-80 shrink-0 max-h-[700px] overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Node details</CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden">
          {selectedActivityNode ? (
            <ScrollArea className="h-[280px] max-h-[calc(100vh-400px)]">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{NODE_TYPE_LABELS[selectedActivityNode.type] ?? selectedActivityNode.type}</Badge>
                  {selectedActivityNode.status && (
                    <Badge variant={selectedActivityNode.status === "healthy" ? "default" : selectedActivityNode.status === "degraded" ? "secondary" : "destructive"}>
                      {selectedActivityNode.status}
                    </Badge>
                  )}
                </div>
                <p className="font-medium">{selectedActivityNode.label}</p>
                {selectedActivityNode.url && (
                  <p className="text-xs text-muted-foreground break-all flex items-center gap-1">
                    {selectedActivityNode.url}
                    {selectedActivityNode.type === "page" && (
                      <a href={selectedActivityNode.url} target="_blank" rel="noopener noreferrer" className="text-primary">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </p>
                )}
                {selectedActivityNode.system && (
                  <p className="text-xs">System: <span className="text-muted-foreground">{selectedActivityNode.system}</span></p>
                )}
                {selectedActivityNode.metadata?.health && (
                  <p className="text-xs text-muted-foreground">
                    Health: latency {String((selectedActivityNode.metadata.health as { latencyMs?: number }).latencyMs ?? "—")} ms
                    {(selectedActivityNode.metadata.health as { requestRate?: number }).requestRate != null && (
                      <> · {String((selectedActivityNode.metadata.health as { requestRate?: number }).requestRate)}/s</>
                    )}
                  </p>
                )}
                {selectedActivityNode.metadata && Object.keys(selectedActivityNode.metadata).filter(k => k !== "health").length > 0 && (
                  <pre className="text-[10px] bg-muted p-2 rounded overflow-auto max-h-24">
                    {JSON.stringify(selectedActivityNode.metadata, null, 2)}
                  </pre>
                )}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Connections: {connectionCount}</p>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">Click a node in the 3D view to see details.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
