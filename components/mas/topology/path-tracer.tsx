"use client"

/**
 * Path Tracer Component
 * Traces and visualizes data paths between nodes with latency info
 */

import { useState, useCallback, useMemo } from "react"
import {
  Route,
  ArrowRight,
  Clock,
  Zap,
  Activity,
  X,
  Search,
  GitBranch,
  Circle,
  AlertTriangle,
} from "lucide-react"
import type { TopologyNode, TopologyConnection, PathTraceResult } from "./types"

interface PathTracerProps {
  nodes: TopologyNode[]
  connections: TopologyConnection[]
  onHighlightPath: (nodeIds: string[], edgeIds: string[]) => void
  onClearHighlight: () => void
  onNodeSelect: (nodeId: string) => void
  className?: string
}

export function PathTracer({
  nodes,
  connections,
  onHighlightPath,
  onClearHighlight,
  onNodeSelect,
  className = "",
}: PathTracerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [sourceNode, setSourceNode] = useState<string | null>(null)
  const [targetNode, setTargetNode] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectingFor, setSelectingFor] = useState<"source" | "target" | null>(null)
  const [traceResult, setTraceResult] = useState<PathTraceResult | null>(null)

  // Build adjacency list for path finding
  const adjacencyList = useMemo(() => {
    const adj = new Map<string, Array<{ nodeId: string; edgeId: string; latency: number }>>()
    
    nodes.forEach((node) => {
      adj.set(node.id, [])
    })
    
    connections.forEach((conn) => {
      if (conn.active) {
        adj.get(conn.sourceId)?.push({
          nodeId: conn.targetId,
          edgeId: conn.id,
          latency: conn.traffic.latencyMs,
        })
        if (conn.bidirectional) {
          adj.get(conn.targetId)?.push({
            nodeId: conn.sourceId,
            edgeId: conn.id,
            latency: conn.traffic.latencyMs,
          })
        }
      }
    })
    
    return adj
  }, [nodes, connections])

  // Dijkstra's algorithm for shortest path with latency
  const findPath = useCallback(
    (from: string, to: string): PathTraceResult | null => {
      const distances = new Map<string, number>()
      const previous = new Map<string, { nodeId: string; edgeId: string } | null>()
      const unvisited = new Set<string>()

      nodes.forEach((node) => {
        distances.set(node.id, Infinity)
        previous.set(node.id, null)
        unvisited.add(node.id)
      })

      distances.set(from, 0)

      while (unvisited.size > 0) {
        // Find node with minimum distance
        let minNode: string | null = null
        let minDist = Infinity
        unvisited.forEach((nodeId) => {
          const dist = distances.get(nodeId)!
          if (dist < minDist) {
            minDist = dist
            minNode = nodeId
          }
        })

        if (minNode === null || minNode === to) break
        unvisited.delete(minNode)

        // Update neighbors
        const neighbors = adjacencyList.get(minNode) || []
        neighbors.forEach(({ nodeId, edgeId, latency }) => {
          if (unvisited.has(nodeId)) {
            const alt = distances.get(minNode!)! + latency
            if (alt < distances.get(nodeId)!) {
              distances.set(nodeId, alt)
              previous.set(nodeId, { nodeId: minNode!, edgeId })
            }
          }
        })
      }

      // Reconstruct path
      if (distances.get(to) === Infinity) {
        return null // No path found
      }

      const path: string[] = []
      const edges: string[] = []
      let current: string | null = to

      while (current !== null) {
        path.unshift(current)
        const prev = previous.get(current)
        if (prev) {
          edges.unshift(prev.edgeId)
          current = prev.nodeId
        } else {
          current = null
        }
      }

      // Find bottleneck (node with highest latency contribution)
      let maxLatency = 0
      let bottleneckNodeId: string | undefined

      for (let i = 0; i < path.length - 1; i++) {
        const nodeId = path[i]
        const neighbors = adjacencyList.get(nodeId) || []
        const edge = neighbors.find((n) => n.nodeId === path[i + 1])
        if (edge && edge.latency > maxLatency) {
          maxLatency = edge.latency
          bottleneckNodeId = nodeId
        }
      }

      return {
        path,
        edges,
        totalLatencyMs: distances.get(to)!,
        hopCount: path.length - 1,
        bottleneckNodeId,
      }
    },
    [nodes, adjacencyList]
  )

  // Execute trace
  const executeTrace = useCallback(() => {
    if (!sourceNode || !targetNode) return

    const result = findPath(sourceNode, targetNode)
    setTraceResult(result)

    if (result) {
      onHighlightPath(result.path, result.edges)
    }
  }, [sourceNode, targetNode, findPath, onHighlightPath])

  // Clear trace
  const clearTrace = useCallback(() => {
    setTraceResult(null)
    onClearHighlight()
  }, [onClearHighlight])

  // Get node by ID
  const getNode = useCallback(
    (nodeId: string) => nodes.find((n) => n.id === nodeId),
    [nodes]
  )

  // Filter nodes for selection
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes.slice(0, 20)
    const query = searchQuery.toLowerCase()
    return nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(query) ||
        n.shortName.toLowerCase().includes(query) ||
        n.id.toLowerCase().includes(query)
    )
  }, [nodes, searchQuery])

  // Handle node selection
  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      if (selectingFor === "source") {
        setSourceNode(nodeId)
      } else if (selectingFor === "target") {
        setTargetNode(nodeId)
      }
      setSelectingFor(null)
      setSearchQuery("")
    },
    [selectingFor]
  )

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed bottom-20 right-4 z-40 flex items-center gap-2
          px-4 py-2 bg-slate-800/90 backdrop-blur-sm rounded-lg
          border border-white/10 hover:border-cyan-500/50 
          text-white text-sm font-medium
          transition-all hover:shadow-lg hover:shadow-cyan-500/20
          ${className}
        `}
      >
        <Route className="h-4 w-4 text-cyan-400" />
        <span>Path Tracer</span>
      </button>
    )
  }

  return (
    <div
      className={`
        fixed bottom-20 right-4 z-40 w-96
        bg-slate-900/95 backdrop-blur-md rounded-lg
        border border-white/10 shadow-2xl
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Route className="h-5 w-5 text-cyan-400" />
          <h3 className="text-white font-semibold">Path Tracer</h3>
        </div>
        <button
          onClick={() => {
            setIsOpen(false)
            clearTrace()
          }}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Source & Target Selection */}
        <div className="space-y-3">
          {/* Source */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Source Node</label>
            <button
              onClick={() => setSelectingFor("source")}
              className={`
                w-full px-3 py-2 bg-slate-800 rounded border text-left
                ${selectingFor === "source" ? "border-cyan-500" : "border-white/10"}
                hover:border-cyan-500/50 transition-colors
              `}
            >
              {sourceNode ? (
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3 text-green-400 fill-green-400" />
                  <span className="text-white">{getNode(sourceNode)?.shortName || sourceNode}</span>
                </div>
              ) : (
                <span className="text-gray-500">Select source...</span>
              )}
            </button>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="h-4 w-4 text-gray-500" />
          </div>

          {/* Target */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Target Node</label>
            <button
              onClick={() => setSelectingFor("target")}
              className={`
                w-full px-3 py-2 bg-slate-800 rounded border text-left
                ${selectingFor === "target" ? "border-cyan-500" : "border-white/10"}
                hover:border-cyan-500/50 transition-colors
              `}
            >
              {targetNode ? (
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3 text-red-400 fill-red-400" />
                  <span className="text-white">{getNode(targetNode)?.shortName || targetNode}</span>
                </div>
              ) : (
                <span className="text-gray-500">Select target...</span>
              )}
            </button>
          </div>
        </div>

        {/* Node Selector */}
        {selectingFor && (
          <div className="p-3 bg-slate-800 rounded-lg border border-cyan-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes..."
                className="flex-1 bg-transparent text-white text-sm outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredNodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleNodeSelect(node.id)}
                  className={`
                    w-full px-2 py-1.5 text-left rounded text-sm
                    ${node.id === sourceNode || node.id === targetNode
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "hover:bg-white/10 text-gray-300"
                    }
                    transition-colors
                  `}
                >
                  <span className="font-medium">{node.shortName}</span>
                  <span className="text-gray-500 text-xs ml-2">{node.category}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trace Button */}
        <div className="flex gap-2">
          <button
            onClick={executeTrace}
            disabled={!sourceNode || !targetNode}
            className={`
              flex-1 px-4 py-2 rounded font-medium text-sm
              ${sourceNode && targetNode
                ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                : "bg-slate-700 text-gray-500 cursor-not-allowed"
              }
              transition-colors
            `}
          >
            Trace Path
          </button>
          {traceResult && (
            <button
              onClick={clearTrace}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        {traceResult && (
          <div className="p-3 bg-slate-800 rounded-lg border border-cyan-500/30 space-y-3">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-cyan-400" />
                <div>
                  <div className="text-xs text-gray-400">Hops</div>
                  <div className="text-white font-medium">{traceResult.hopCount}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-400" />
                <div>
                  <div className="text-xs text-gray-400">Total Latency</div>
                  <div className="text-white font-medium">{traceResult.totalLatencyMs.toFixed(1)}ms</div>
                </div>
              </div>
            </div>

            {/* Path Visualization */}
            <div className="space-y-1">
              <div className="text-xs text-gray-400 mb-2">Path</div>
              {traceResult.path.map((nodeId, i) => {
                const node = getNode(nodeId)
                const isBottleneck = nodeId === traceResult.bottleneckNodeId
                return (
                  <div key={nodeId} className="flex items-center gap-2">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${i === 0 ? "bg-green-500 text-white" : 
                        i === traceResult.path.length - 1 ? "bg-red-500 text-white" : 
                        isBottleneck ? "bg-yellow-500 text-black" : "bg-slate-600 text-white"}
                    `}>
                      {i + 1}
                    </div>
                    <button
                      onClick={() => onNodeSelect(nodeId)}
                      className={`
                        flex-1 px-2 py-1 rounded text-left text-sm
                        ${isBottleneck ? "bg-yellow-500/20 text-yellow-300" : "hover:bg-white/10 text-white"}
                        transition-colors
                      `}
                    >
                      {node?.shortName || nodeId}
                      {isBottleneck && (
                        <span className="ml-2 text-[10px] text-yellow-400 flex items-center gap-1 inline-flex">
                          <AlertTriangle className="h-3 w-3" />
                          Bottleneck
                        </span>
                      )}
                    </button>
                    {i < traceResult.path.length - 1 && (
                      <div className="text-gray-500 text-xs">→</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Bottleneck Warning */}
            {traceResult.bottleneckNodeId && (
              <div className="p-2 bg-yellow-950/50 border border-yellow-500/30 rounded flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="text-yellow-400 font-medium">Bottleneck Detected: </span>
                  <span className="text-gray-300">
                    {getNode(traceResult.bottleneckNodeId)?.name} has the highest latency on this path.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Path Found */}
        {traceResult === null && sourceNode && targetNode && (
          <div className="p-3 bg-red-950/50 border border-red-500/30 rounded text-center">
            <X className="h-6 w-6 text-red-400 mx-auto mb-2" />
            <p className="text-red-400 text-sm">No path found between these nodes</p>
          </div>
        )}
      </div>
    </div>
  )
}
