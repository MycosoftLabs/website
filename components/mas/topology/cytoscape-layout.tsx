"use client"

/**
 * Cytoscape.js Layout Engine for MAS Topology
 * Force-directed layout with hierarchical clustering using cola algorithm
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import cytoscape, { Core, NodeSingular, EdgeSingular, LayoutOptions } from "cytoscape"
import cola from "cytoscape-cola"
import type {
  TopologyNode,
  TopologyConnection,
  TopologyData,
  TopologyFilter,
  NodeCategory,
  NodeStatus,
} from "./types"
import { CATEGORY_COLORS, STATUS_COLORS, CONNECTION_COLORS } from "./types"

// Register cola layout extension
if (typeof window !== "undefined") {
  cytoscape.use(cola)
}

// Layout configuration for force-directed positioning
const COLA_LAYOUT_CONFIG: LayoutOptions = {
  name: "cola",
  animate: true,
  animationDuration: 1000,
  animationEasing: "ease-out",
  refresh: 1,
  maxSimulationTime: 4000,
  ungrabifyWhileSimulating: false,
  fit: true,
  padding: 50,
  nodeDimensionsIncludeLabels: true,
  // @ts-expect-error - cola-specific options
  nodeSpacing: 40,
  edgeLengthVal: 120,
  avoidOverlap: true,
  handleDisconnected: true,
  convergenceThreshold: 0.01,
  flow: { axis: "y", minSeparation: 60 },
}

// Hierarchical layout for clustered view
const HIERARCHICAL_LAYOUT_CONFIG: LayoutOptions = {
  name: "cola",
  animate: true,
  animationDuration: 800,
  // @ts-expect-error - cola-specific options
  nodeSpacing: 30,
  edgeLengthVal: 80,
  avoidOverlap: true,
  handleDisconnected: true,
  flow: { axis: "y", minSeparation: 80 },
}

export interface CytoscapeLayoutProps {
  data: TopologyData | null
  filter: TopologyFilter
  selectedNodeId: string | null
  hoveredNodeId: string | null
  detailLevel: "overview" | "category" | "agent" | "detail"
  onNodeSelect: (nodeId: string | null) => void
  onNodeHover: (nodeId: string | null) => void
  onNodeAction: (nodeId: string, action: string, params?: Record<string, unknown>) => Promise<void>
  className?: string
}

// Convert topology data to Cytoscape elements
function convertToCytoscapeElements(
  data: TopologyData,
  filter: TopologyFilter,
  detailLevel: "overview" | "category" | "agent" | "detail"
): cytoscape.ElementDefinition[] {
  const elements: cytoscape.ElementDefinition[] = []
  const nodeIds = new Set<string>()

  // Filter nodes
  const filteredNodes = data.nodes.filter((node) => {
    if (filter.categories.length > 0 && !filter.categories.includes(node.category)) {
      return false
    }
    if (!filter.showInactive && (node.status === "offline" || node.status === "error")) {
      return false
    }
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase()
      if (
        !node.name.toLowerCase().includes(query) &&
        !node.shortName.toLowerCase().includes(query) &&
        !String(node.id).toLowerCase().includes(query)
      ) {
        return false
      }
    }
    return true
  })

  // In overview mode, create category compound nodes
  if (detailLevel === "overview") {
    const categories = new Set(filteredNodes.map((n) => n.category))
    categories.forEach((cat) => {
      const catNodes = filteredNodes.filter((n) => n.category === cat)
      const activeCount = catNodes.filter((n) => n.status === "active" || n.status === "busy").length

      elements.push({
        data: {
          id: `cluster-${cat}`,
          label: `${cat.toUpperCase()} (${catNodes.length})`,
          category: cat,
          isCluster: true,
          nodeCount: catNodes.length,
          activeCount,
          color: CATEGORY_COLORS[cat],
        },
        classes: "cluster",
      })
    })
  }

  // Add nodes
  filteredNodes.forEach((node) => {
    nodeIds.add(node.id)

    const nodeData: Record<string, unknown> = {
      id: node.id,
      label: detailLevel === "overview" ? "" : node.shortName,
      fullName: node.name,
      type: node.type,
      category: node.category,
      status: node.status,
      description: node.description,
      metrics: node.metrics,
      color: CATEGORY_COLORS[node.category],
      statusColor: STATUS_COLORS[node.status],
      size: node.size,
      priority: node.priority,
      canStart: node.canStart,
      canStop: node.canStop,
      canRestart: node.canRestart,
      canConfigure: node.canConfigure,
    }

    // Parent to cluster in overview mode
    if (detailLevel === "overview") {
      nodeData.parent = `cluster-${node.category}`
    }

    elements.push({
      data: nodeData,
      classes: `node ${node.type} ${node.status}`,
    })
  })

  // Add connections (edges)
  if (filter.showConnections) {
    data.connections.forEach((conn) => {
      if (nodeIds.has(conn.sourceId) && nodeIds.has(conn.targetId)) {
        elements.push({
          data: {
            id: conn.id,
            source: conn.sourceId,
            target: conn.targetId,
            type: conn.type,
            color: CONNECTION_COLORS[conn.type],
            traffic: conn.traffic,
            animated: conn.animated,
            active: conn.active,
            intensity: conn.intensity,
            bidirectional: conn.bidirectional,
          },
          classes: `edge ${conn.type} ${conn.active ? "active" : "inactive"}`,
        })
      }
    })
  }

  return elements
}

// Cytoscape stylesheet
const cytoscapeStylesheet: cytoscape.Stylesheet[] = [
  // Cluster nodes
  {
    selector: ".cluster",
    style: {
      "background-color": "data(color)",
      "background-opacity": 0.15,
      "border-color": "data(color)",
      "border-width": 2,
      "border-opacity": 0.6,
      label: "data(label)",
      "text-valign": "top",
      "text-halign": "center",
      "font-size": 14,
      "font-weight": "bold",
      color: "#ffffff",
      "text-outline-color": "#000000",
      "text-outline-width": 2,
      shape: "round-rectangle",
      padding: "20px",
    },
  },
  // Regular nodes
  {
    selector: ".node",
    style: {
      "background-color": "data(color)",
      "border-color": "data(statusColor)",
      "border-width": 3,
      label: "data(label)",
      "text-valign": "bottom",
      "text-halign": "center",
      "font-size": 10,
      color: "#ffffff",
      "text-outline-color": "#000000",
      "text-outline-width": 1,
      width: "mapData(size, 0.5, 3, 20, 60)",
      height: "mapData(size, 0.5, 3, 20, 60)",
    },
  },
  // Orchestrator node (larger)
  {
    selector: ".node.orchestrator",
    style: {
      width: 80,
      height: 80,
      "font-size": 14,
      "font-weight": "bold",
      shape: "diamond",
    },
  },
  // User node
  {
    selector: ".node.user",
    style: {
      shape: "ellipse",
      "background-image": "none",
    },
  },
  // Database nodes
  {
    selector: ".node.database",
    style: {
      shape: "barrel",
    },
  },
  // Service nodes
  {
    selector: ".node.service",
    style: {
      shape: "round-rectangle",
    },
  },
  // Queue nodes
  {
    selector: ".node.queue",
    style: {
      shape: "rectangle",
    },
  },
  // Active status glow
  {
    selector: ".node.active",
    style: {
      "border-color": "#22c55e",
      "box-shadow": "0 0 10px #22c55e",
    },
  },
  // Error status
  {
    selector: ".node.error",
    style: {
      "border-color": "#ef4444",
      "background-color": "#7f1d1d",
    },
  },
  // Offline status
  {
    selector: ".node.offline",
    style: {
      opacity: 0.5,
      "border-style": "dashed",
    },
  },
  // Edges
  {
    selector: ".edge",
    style: {
      width: "mapData(intensity, 0, 1, 1, 4)",
      "line-color": "data(color)",
      "target-arrow-color": "data(color)",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      opacity: 0.7,
    },
  },
  // Active edges
  {
    selector: ".edge.active",
    style: {
      opacity: 1,
      "line-style": "solid",
    },
  },
  // Inactive edges
  {
    selector: ".edge.inactive",
    style: {
      opacity: 0.3,
      "line-style": "dashed",
    },
  },
  // Selected node
  {
    selector: ":selected",
    style: {
      "border-width": 5,
      "border-color": "#ffffff",
      "background-color": "#ffffff",
      "background-opacity": 0.3,
    },
  },
  // Hovered node
  {
    selector: ".hover",
    style: {
      "border-width": 4,
      "border-color": "#60a5fa",
    },
  },
  // Highlighted path
  {
    selector: ".highlighted",
    style: {
      "border-width": 4,
      "border-color": "#fbbf24",
      "background-opacity": 1,
      "z-index": 999,
    },
  },
  // Highlighted edge
  {
    selector: ".edge.highlighted",
    style: {
      width: 5,
      "line-color": "#fbbf24",
      "target-arrow-color": "#fbbf24",
      opacity: 1,
      "z-index": 999,
    },
  },
  // Incident affected nodes
  {
    selector: ".incident-affected",
    style: {
      "border-color": "#ef4444",
      "border-width": 5,
      "border-style": "double",
      "background-opacity": 0.9,
    },
  },
  // Ghost nodes (gaps)
  {
    selector: ".ghost",
    style: {
      opacity: 0.3,
      "border-style": "dotted",
      "background-opacity": 0.2,
    },
  },
]

export function CytoscapeLayout({
  data,
  filter,
  selectedNodeId,
  hoveredNodeId,
  detailLevel,
  onNodeSelect,
  onNodeHover,
  onNodeAction,
  className = "",
}: CytoscapeLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || cyRef.current) return

    const cy = cytoscape({
      container: containerRef.current,
      style: cytoscapeStylesheet,
      layout: { name: "preset" },
      minZoom: 0.1,
      maxZoom: 3,
      wheelSensitivity: 0.3,
      boxSelectionEnabled: false,
    })

    // Event handlers
    cy.on("tap", "node", (evt) => {
      const node = evt.target as NodeSingular
      if (!node.data("isCluster")) {
        onNodeSelect(node.id())
      }
    })

    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        onNodeSelect(null)
      }
    })

    cy.on("mouseover", "node", (evt) => {
      const node = evt.target as NodeSingular
      if (!node.data("isCluster")) {
        node.addClass("hover")
        onNodeHover(node.id())
      }
    })

    cy.on("mouseout", "node", (evt) => {
      const node = evt.target as NodeSingular
      node.removeClass("hover")
      onNodeHover(null)
    })

    cyRef.current = cy
    setIsReady(true)

    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [onNodeSelect, onNodeHover])

  // Update elements when data changes
  useEffect(() => {
    if (!cyRef.current || !data || !isReady) return

    const cy = cyRef.current
    const elements = convertToCytoscapeElements(data, filter, detailLevel)

    // Batch update
    cy.batch(() => {
      cy.elements().remove()
      cy.add(elements)
    })

    // Run layout
    const layoutConfig = detailLevel === "overview" ? HIERARCHICAL_LAYOUT_CONFIG : COLA_LAYOUT_CONFIG
    const layout = cy.layout(layoutConfig)
    layout.run()
  }, [data, filter, detailLevel, isReady])

  // Handle selection changes
  useEffect(() => {
    if (!cyRef.current || !isReady) return
    const cy = cyRef.current

    cy.nodes().unselect()
    if (selectedNodeId) {
      const node = cy.getElementById(selectedNodeId)
      if (node.length) {
        node.select()
        cy.animate({
          center: { eles: node },
          zoom: 1.5,
          duration: 500,
        })
      }
    }
  }, [selectedNodeId, isReady])

  // Fit view function
  const fitView = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50)
    }
  }, [])

  // Run layout function
  const runLayout = useCallback(() => {
    if (cyRef.current) {
      const layoutConfig = detailLevel === "overview" ? HIERARCHICAL_LAYOUT_CONFIG : COLA_LAYOUT_CONFIG
      cyRef.current.layout(layoutConfig).run()
    }
  }, [detailLevel])

  // Highlight path function
  const highlightPath = useCallback((fromId: string, toId: string) => {
    if (!cyRef.current) return

    const cy = cyRef.current
    cy.elements().removeClass("highlighted")

    const source = cy.getElementById(fromId)
    const target = cy.getElementById(toId)

    if (source.length && target.length) {
      const dijkstra = cy.elements().dijkstra(source)
      const path = dijkstra.pathTo(target)
      path.addClass("highlighted")
    }
  }, [])

  // Clear highlights
  const clearHighlights = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.elements().removeClass("highlighted")
    }
  }, [])

  return (
    <div className={`relative w-full h-full bg-slate-950 ${className}`}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Controls overlay */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={fitView}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded border border-slate-600 transition-colors"
        >
          Fit View
        </button>
        <button
          onClick={runLayout}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded border border-slate-600 transition-colors"
        >
          Re-layout
        </button>
      </div>

      {/* Stats overlay */}
      {data && (
        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md rounded-lg p-3 text-white font-mono text-xs border border-white/10">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-gray-400">Nodes:</span>
            <span className="text-green-400">{data.stats.activeNodes}/{data.stats.totalNodes}</span>
            <span className="text-gray-400">Edges:</span>
            <span className="text-blue-400">{data.stats.activeConnections}/{data.stats.totalConnections}</span>
            <span className="text-gray-400">Msg/s:</span>
            <span className="text-cyan-400">{data.stats.messagesPerSecond.toFixed(0)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Export utility function type for external use
export type HighlightPathFunction = (fromId: string, toId: string) => void
