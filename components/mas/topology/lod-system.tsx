"use client"

/**
 * Level of Detail (LOD) System
 * Controls visualization detail based on zoom level and category focus
 */

import { useMemo, useCallback } from "react"
import type { TopologyNode, TopologyConnection, NodeCategory } from "./types"
import { CATEGORY_COLORS } from "./types"

export type DetailLevel = "overview" | "category" | "agent" | "detail"

export interface LODState {
  level: DetailLevel
  focusedCategory: NodeCategory | null
  focusedAgentId: string | null
  showLabels: boolean
  showMetrics: boolean
  showConnections: boolean
  showParticles: boolean
  clusterView: boolean
}

export interface LODConfig {
  // Zoom thresholds for auto-LOD
  overviewZoom: number     // Below this, show overview
  categoryZoom: number     // Show category clusters
  agentZoom: number        // Show individual agents
  detailZoom: number       // Show all details
  
  // Performance limits
  maxVisibleNodes: number
  maxVisibleConnections: number
  maxParticles: number
  
  // Label visibility
  labelMinSize: number     // Minimum node size to show label
  metricsMinSize: number   // Minimum node size to show metrics
}

export const DEFAULT_LOD_CONFIG: LODConfig = {
  overviewZoom: 0.3,
  categoryZoom: 0.6,
  agentZoom: 1.0,
  detailZoom: 1.5,
  maxVisibleNodes: 100,
  maxVisibleConnections: 150,
  maxParticles: 50,
  labelMinSize: 0.8,
  metricsMinSize: 1.2,
}

// Category cluster data for overview mode
export interface CategoryCluster {
  category: NodeCategory
  name: string
  color: string
  nodeCount: number
  activeCount: number
  position: [number, number, number]
  aggregateMetrics: {
    avgCpu: number
    avgMemory: number
    totalMessages: number
    errorRate: number
  }
}

// Determine LOD level based on camera zoom
export function calculateLODLevel(zoom: number, config: LODConfig = DEFAULT_LOD_CONFIG): DetailLevel {
  if (zoom < config.overviewZoom) return "overview"
  if (zoom < config.categoryZoom) return "category"
  if (zoom < config.agentZoom) return "agent"
  return "detail"
}

// Filter and prioritize nodes based on LOD
export function filterNodesByLOD(
  nodes: TopologyNode[],
  lodState: LODState,
  config: LODConfig = DEFAULT_LOD_CONFIG
): TopologyNode[] {
  let filtered = [...nodes]
  
  // Category focus
  if (lodState.focusedCategory) {
    filtered = filtered.filter(n => n.category === lodState.focusedCategory)
  }
  
  // Priority sorting
  filtered.sort((a, b) => {
    // Orchestrator always first
    if (a.type === "orchestrator") return -1
    if (b.type === "orchestrator") return 1
    // Then by status (active first)
    if (a.status === "active" && b.status !== "active") return -1
    if (b.status === "active" && a.status !== "active") return 1
    // Then by priority
    return b.priority - a.priority
  })
  
  // Limit based on LOD level
  const limit = lodState.level === "overview" ? 30 :
                lodState.level === "category" ? 60 :
                lodState.level === "agent" ? config.maxVisibleNodes :
                nodes.length
  
  return filtered.slice(0, limit)
}

// Filter connections based on LOD
export function filterConnectionsByLOD(
  connections: TopologyConnection[],
  visibleNodeIds: Set<string>,
  lodState: LODState,
  config: LODConfig = DEFAULT_LOD_CONFIG
): TopologyConnection[] {
  if (!lodState.showConnections) return []
  
  let filtered = connections.filter(c => 
    visibleNodeIds.has(c.sourceId) && visibleNodeIds.has(c.targetId)
  )
  
  // Only show active connections in lower detail levels
  if (lodState.level === "overview" || lodState.level === "category") {
    filtered = filtered.filter(c => c.active)
  }
  
  // Sort by intensity/importance
  filtered.sort((a, b) => b.intensity - a.intensity)
  
  // Limit connections
  const limit = lodState.level === "overview" ? 20 :
                lodState.level === "category" ? 50 :
                config.maxVisibleConnections
  
  return filtered.slice(0, limit)
}

// Generate category clusters for overview mode
export function generateCategoryClusters(nodes: TopologyNode[]): CategoryCluster[] {
  const categoryMap = new Map<NodeCategory, TopologyNode[]>()
  
  nodes.forEach(node => {
    if (!categoryMap.has(node.category)) {
      categoryMap.set(node.category, [])
    }
    categoryMap.get(node.category)!.push(node)
  })
  
  // Category positions in a circle
  const categoryAngles: Partial<Record<NodeCategory, number>> = {
    core: 0,
    financial: Math.PI / 7,
    mycology: (2 * Math.PI) / 7,
    research: (3 * Math.PI) / 7,
    dao: (4 * Math.PI) / 7,
    communication: (5 * Math.PI) / 7,
    data: (6 * Math.PI) / 7,
    infrastructure: Math.PI,
    simulation: (8 * Math.PI) / 7,
    security: (9 * Math.PI) / 7,
    integration: (10 * Math.PI) / 7,
    device: (11 * Math.PI) / 7,
    chemistry: (12 * Math.PI) / 7,
    nlm: (13 * Math.PI) / 7,
  }
  
  const clusters: CategoryCluster[] = []
  
  categoryMap.forEach((catNodes, category) => {
    const angle = categoryAngles[category] || 0
    const radius = 8
    
    // Calculate aggregate metrics
    const activeNodes = catNodes.filter(n => n.status === "active" || n.status === "busy")
    const avgCpu = catNodes.reduce((sum, n) => sum + n.metrics.cpuPercent, 0) / catNodes.length
    const avgMemory = catNodes.reduce((sum, n) => sum + n.metrics.memoryMb, 0) / catNodes.length
    const totalMessages = catNodes.reduce((sum, n) => sum + n.metrics.messagesPerSecond, 0)
    const errorRate = catNodes.reduce((sum, n) => sum + n.metrics.errorRate, 0) / catNodes.length
    
    clusters.push({
      category,
      name: category.charAt(0).toUpperCase() + category.slice(1),
      color: CATEGORY_COLORS[category],
      nodeCount: catNodes.length,
      activeCount: activeNodes.length,
      position: [
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius,
      ],
      aggregateMetrics: {
        avgCpu,
        avgMemory,
        totalMessages,
        errorRate,
      },
    })
  })
  
  return clusters
}

// Hook for LOD management
export function useLODSystem(
  nodes: TopologyNode[],
  connections: TopologyConnection[],
  cameraZoom: number,
  config: LODConfig = DEFAULT_LOD_CONFIG
) {
  // Calculate current LOD level
  const currentLevel = useMemo(() => 
    calculateLODLevel(cameraZoom, config),
    [cameraZoom, config]
  )
  
  // LOD state
  const lodState = useMemo<LODState>(() => ({
    level: currentLevel,
    focusedCategory: null,
    focusedAgentId: null,
    showLabels: currentLevel !== "overview",
    showMetrics: currentLevel === "detail",
    showConnections: true,
    showParticles: currentLevel === "agent" || currentLevel === "detail",
    clusterView: currentLevel === "overview",
  }), [currentLevel])
  
  // Filtered nodes
  const visibleNodes = useMemo(() => 
    filterNodesByLOD(nodes, lodState, config),
    [nodes, lodState, config]
  )
  
  // Visible node IDs set
  const visibleNodeIds = useMemo(() => 
    new Set(visibleNodes.map(n => n.id)),
    [visibleNodes]
  )
  
  // Filtered connections
  const visibleConnections = useMemo(() => 
    filterConnectionsByLOD(connections, visibleNodeIds, lodState, config),
    [connections, visibleNodeIds, lodState, config]
  )
  
  // Category clusters for overview
  const clusters = useMemo(() => 
    lodState.clusterView ? generateCategoryClusters(nodes) : [],
    [nodes, lodState.clusterView]
  )
  
  return {
    lodState,
    currentLevel,
    visibleNodes,
    visibleConnections,
    clusters,
    stats: {
      totalNodes: nodes.length,
      visibleNodes: visibleNodes.length,
      totalConnections: connections.length,
      visibleConnections: visibleConnections.length,
    },
  }
}

// LOD Indicator component
interface LODIndicatorProps {
  level: DetailLevel
  nodeCount: { visible: number; total: number }
  connectionCount: { visible: number; total: number }
  onLevelChange?: (level: DetailLevel) => void
}

export function LODIndicator({
  level,
  nodeCount,
  connectionCount,
  onLevelChange,
}: LODIndicatorProps) {
  const levels: DetailLevel[] = ["overview", "category", "agent", "detail"]
  
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-black/70 backdrop-blur-md rounded-lg border border-white/10">
      {/* Level indicators */}
      <div className="flex items-center gap-1">
        {levels.map((l) => (
          <button
            key={l}
            onClick={() => onLevelChange?.(l)}
            className={`
              w-2 h-2 rounded-full transition-all
              ${l === level 
                ? "bg-cyan-400 scale-125" 
                : levels.indexOf(l) <= levels.indexOf(level)
                  ? "bg-cyan-600"
                  : "bg-gray-600"
              }
            `}
            title={l.charAt(0).toUpperCase() + l.slice(1)}
          />
        ))}
      </div>
      
      {/* Level label */}
      <span className="text-xs text-cyan-400 font-medium uppercase">
        {level}
      </span>
      
      {/* Stats */}
      <div className="text-xs text-gray-400 border-l border-white/10 pl-3">
        <span className="text-green-400">{nodeCount.visible}</span>
        <span>/{nodeCount.total}</span>
        <span className="ml-2 text-blue-400">{connectionCount.visible}</span>
        <span>/{connectionCount.total}</span>
      </div>
    </div>
  )
}
