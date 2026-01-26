import { NextRequest, NextResponse } from "next/server"
import type { 
  TopologyData, 
  TopologyNode, 
  TopologyConnection, 
  DataPacket,
  TopologyIncident,
  DetectedGap,
  ExtendedTopologyData,
  NodeCategory,
} from "@/components/mas/topology/types"
import { 
  COMPLETE_AGENT_REGISTRY, 
  TOTAL_AGENT_COUNT,
  generateDefaultConnections,
  type AgentDefinition,
} from "@/components/mas/topology/agent-registry"

/**
 * MAS Topology API v2.1
 * Returns real-time topology data for 3D visualization
 * Supports 223+ agents from the complete MAS registry
 */

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

// Category-based clustering angles for positioning
const CATEGORY_ANGLES: Record<NodeCategory, number> = {
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

// Category radii (distance from center)
const CATEGORY_RADII: Record<NodeCategory, number> = {
  core: 6,
  financial: 14,
  mycology: 16,
  research: 14,
  dao: 18,
  communication: 12,
  data: 16,
  infrastructure: 14,
  simulation: 14,
  security: 12,
  integration: 14,
  device: 14,
  chemistry: 12,
  nlm: 16,
}

// Generate force-directed positions using category clustering
function generatePositions(agents: AgentDefinition[]): Map<string, [number, number, number]> {
  const positions = new Map<string, [number, number, number]>()
  
  // Group nodes by category
  const categoryNodes: Record<string, AgentDefinition[]> = {}
  agents.forEach(agent => {
    if (!categoryNodes[agent.category]) categoryNodes[agent.category] = []
    categoryNodes[agent.category].push(agent)
  })
  
  // Special positions
  positions.set("myca-orchestrator", [0, 2, 0])
  positions.set("user-morgan", [0, 8, -6])
  positions.set("redis", [-4, 0, -4])
  positions.set("postgresql", [4, 0, -4])
  positions.set("qdrant-service", [0, -2, -4])
  
  // Position nodes by category with spiral arrangement
  Object.entries(categoryNodes).forEach(([category, catNodes]) => {
    const angle = CATEGORY_ANGLES[category as NodeCategory] || 0
    const baseRadius = CATEGORY_RADII[category as NodeCategory] || 14
    const nodeCount = catNodes.length
    
    catNodes.forEach((agent, i) => {
      if (positions.has(agent.id)) return
      
      // Spiral arrangement within category cluster
      const spiralAngle = angle + (i / nodeCount) * (Math.PI / 4) - (Math.PI / 8)
      const spiralRadius = baseRadius + (i % 4) * 2 - 3
      const heightLayer = Math.floor(i / 8) * 3 - 3
      
      // Add some randomness for organic look
      const jitterX = (Math.random() - 0.5) * 2
      const jitterY = (Math.random() - 0.5) * 1.5
      const jitterZ = (Math.random() - 0.5) * 2
      
      positions.set(agent.id, [
        Math.cos(spiralAngle) * spiralRadius + jitterX,
        heightLayer + jitterY,
        Math.sin(spiralAngle) * spiralRadius + jitterZ,
      ])
    })
  })
  
  return positions
}

// Generate metrics (will be replaced by real MAS data when available)
function generateMetrics(isActive: boolean): TopologyNode["metrics"] {
  if (!isActive) {
    return {
      cpuPercent: 0,
      memoryMb: 0,
      tasksCompleted: 0,
      tasksQueued: 0,
      messagesPerSecond: 0,
      errorRate: 0,
      uptime: 0,
      lastActive: new Date(Date.now() - 86400000).toISOString(),
    }
  }
  
  return {
    cpuPercent: Math.random() * 60 + 5,
    memoryMb: Math.floor(Math.random() * 512 + 64),
    tasksCompleted: Math.floor(Math.random() * 50000 + 1000),
    tasksQueued: Math.floor(Math.random() * 10),
    messagesPerSecond: Math.random() * 100 + 10,
    errorRate: Math.random() * 0.05,
    uptime: Math.floor(Math.random() * 86400 * 7 + 3600),
    lastActive: new Date(Date.now() - Math.random() * 60000).toISOString(),
  }
}

// Convert agent definition to topology node
function agentToNode(
  agent: AgentDefinition, 
  position: [number, number, number],
  liveStatus?: { status: string; metrics?: TopologyNode["metrics"] }
): TopologyNode {
  const status = liveStatus?.status as TopologyNode["status"] || agent.defaultStatus
  const isActive = status === "active" || status === "busy"
  
  return {
    id: agent.id,
    name: agent.name,
    shortName: agent.shortName,
    type: agent.type,
    category: agent.category,
    status,
    description: agent.description,
    position,
    metrics: liveStatus?.metrics || generateMetrics(isActive),
    connections: [], // Will be populated from connections array
    size: agent.priority >= 8 ? 1.5 : agent.priority >= 5 ? 1.2 : 1,
    priority: agent.priority,
    canStart: agent.canStart,
    canStop: agent.canStop,
    canRestart: agent.canRestart,
    canConfigure: agent.canConfigure,
  }
}

// Generate connections with proper typing
function generateConnections(nodes: TopologyNode[]): TopologyConnection[] {
  const connections: TopologyConnection[] = []
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const added = new Set<string>()
  
  // Get default connections
  const defaultConns = generateDefaultConnections()
  
  defaultConns.forEach(({ source, target }) => {
    const id = [source, target].sort().join("--")
    if (added.has(id)) return
    if (!nodeMap.has(source) || !nodeMap.has(target)) return
    added.add(id)
    
    const sourceNode = nodeMap.get(source)!
    const targetNode = nodeMap.get(target)!
    
    // Determine connection type
    let type: TopologyConnection["type"] = "message"
    if (sourceNode.type === "database" || targetNode.type === "database") {
      type = "query"
    } else if (sourceNode.type === "queue" || targetNode.type === "queue") {
      type = "stream"
    } else if (sourceNode.category === "integration" || targetNode.category === "integration") {
      type = "data"
    } else if (sourceNode.type === "orchestrator" || targetNode.type === "orchestrator") {
      type = "command"
    }
    
    const isActive = sourceNode.status === "active" && targetNode.status === "active"
    
    connections.push({
      id,
      sourceId: source,
      targetId: target,
      type,
      traffic: {
        messagesPerSecond: isActive ? Math.random() * 50 + 5 : 0,
        bytesPerSecond: isActive ? Math.floor(Math.random() * 10000 + 500) : 0,
        latencyMs: isActive ? Math.random() * 50 + 2 : 0,
        errorRate: isActive ? Math.random() * 0.02 : 0,
      },
      animated: isActive && Math.random() > 0.3,
      active: isActive,
      intensity: isActive ? Math.random() * 0.7 + 0.3 : 0.1,
      bidirectional: Math.random() > 0.4,
    })
  })
  
  // Generate additional intra-category connections
  const categories = [...new Set(nodes.map(n => n.category))]
  categories.forEach(cat => {
    const catNodes = nodes.filter(n => n.category === cat && n.status === "active")
    if (catNodes.length < 2) return
    
    // Connect some agents within the same category
    for (let i = 0; i < Math.min(catNodes.length - 1, 5); i++) {
      const source = catNodes[i]
      const target = catNodes[i + 1]
      const id = [source.id, target.id].sort().join("--")
      
      if (added.has(id)) continue
      added.add(id)
      
      connections.push({
        id,
        sourceId: source.id,
        targetId: target.id,
        type: "sync",
        traffic: {
          messagesPerSecond: Math.random() * 20 + 2,
          bytesPerSecond: Math.floor(Math.random() * 5000 + 100),
          latencyMs: Math.random() * 30 + 1,
          errorRate: Math.random() * 0.01,
        },
        animated: Math.random() > 0.5,
        active: true,
        intensity: Math.random() * 0.5 + 0.2,
        bidirectional: true,
      })
    }
  })
  
  return connections
}

// Generate active data packets
function generatePackets(connections: TopologyConnection[], count: number = 30): DataPacket[] {
  const packets: DataPacket[] = []
  const activeConnections = connections.filter(c => c.active && c.animated)
  
  // Distribute packets across active connections
  const connsToUse = activeConnections.slice(0, Math.min(activeConnections.length, count))
  
  connsToUse.forEach(conn => {
    const numPackets = Math.floor(Math.random() * 2) + 1
    for (let i = 0; i < numPackets; i++) {
      const direction = Math.random() > 0.5
      packets.push({
        id: `pkt-${conn.id}-${i}-${Date.now()}`,
        connectionId: conn.id,
        sourceId: direction ? conn.sourceId : conn.targetId,
        targetId: direction ? conn.targetId : conn.sourceId,
        type: ["request", "response", "event"][Math.floor(Math.random() * 3)] as DataPacket["type"],
        size: Math.floor(Math.random() * 1000 + 100),
        timestamp: Date.now() - Math.random() * 1000,
        progress: Math.random(),
      })
    }
  })
  
  return packets
}

// Fetch live data from MAS orchestrator
async function fetchMASData(): Promise<{
  agents?: Array<{ id: string; status: string; metrics?: TopologyNode["metrics"] }>;
  incidents?: TopologyIncident[];
  gaps?: DetectedGap[];
} | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    
    const [agentsRes, incidentsRes, gapsRes] = await Promise.all([
      fetch(`${MAS_API_URL}/api/dashboard/agents`, { 
        signal: controller.signal,
        cache: "no-store",
      }).catch(() => null),
      fetch(`${MAS_API_URL}/api/security/incidents?status=active`, { 
        signal: controller.signal,
        cache: "no-store",
      }).catch(() => null),
      fetch(`${MAS_API_URL}/gaps`, { 
        signal: controller.signal,
        cache: "no-store",
      }).catch(() => null),
    ])
    
    clearTimeout(timeout)
    
    const data: {
      agents?: Array<{ id: string; status: string; metrics?: TopologyNode["metrics"] }>;
      incidents?: TopologyIncident[];
      gaps?: DetectedGap[];
    } = {}
    
    if (agentsRes?.ok) {
      const agentsData = await agentsRes.json()
      data.agents = agentsData.agents || []
    }
    
    if (incidentsRes?.ok) {
      const incidentsData = await incidentsRes.json()
      data.incidents = incidentsData.incidents || []
    }
    
    if (gapsRes?.ok) {
      const gapsData = await gapsRes.json()
      data.gaps = gapsData.gaps || []
    }
    
    return Object.keys(data).length > 0 ? data : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includePackets = searchParams.get("packets") !== "false"
    const includeIncidents = searchParams.get("incidents") !== "false"
    const categoryFilter = searchParams.get("category")
    
    // Try to get real data from MAS
    const masData = await fetchMASData()
    
    // Build agent status map from live data
    const liveStatusMap = new Map<string, { status: string; metrics?: TopologyNode["metrics"] }>()
    if (masData?.agents) {
      masData.agents.forEach(agent => {
        liveStatusMap.set(agent.id, { status: agent.status, metrics: agent.metrics })
      })
    }
    
    // Generate positions for all agents
    const positions = generatePositions(COMPLETE_AGENT_REGISTRY)
    
    // Filter agents if category specified
    let agentsToProcess = COMPLETE_AGENT_REGISTRY
    if (categoryFilter) {
      agentsToProcess = COMPLETE_AGENT_REGISTRY.filter(a => a.category === categoryFilter)
    }
    
    // Build nodes with positions and metrics (merge live data)
    const nodes: TopologyNode[] = agentsToProcess.map(agent => 
      agentToNode(
        agent, 
        positions.get(agent.id) || [0, 0, 0],
        liveStatusMap.get(agent.id)
      )
    )
    
    // Generate connections
    const connections = generateConnections(nodes)
    
    // Update node connections arrays
    nodes.forEach(node => {
      node.connections = connections
        .filter(c => c.sourceId === node.id || c.targetId === node.id)
        .map(c => c.sourceId === node.id ? c.targetId : c.sourceId)
    })
    
    // Generate packets
    const packets = includePackets ? generatePackets(connections) : []
    
    // Calculate stats
    const activeNodes = nodes.filter(n => n.status === "active" || n.status === "busy").length
    const activeConnections = connections.filter(c => c.active).length
    
    const topology: ExtendedTopologyData = {
      nodes,
      connections,
      packets,
      stats: {
        totalNodes: nodes.length,
        activeNodes,
        totalConnections: connections.length,
        activeConnections,
        messagesPerSecond: connections.reduce((sum, c) => sum + c.traffic.messagesPerSecond, 0),
        avgLatencyMs: connections.length > 0 
          ? connections.reduce((sum, c) => sum + c.traffic.latencyMs, 0) / connections.length 
          : 0,
        systemLoad: activeNodes / nodes.length,
        uptimeSeconds: 86400 * 3 + Math.floor(Math.random() * 86400),
      },
      lastUpdated: new Date().toISOString(),
      incidents: includeIncidents ? (masData?.incidents || []) : [],
      gaps: masData?.gaps || [],
      predictions: [],
    }
    
    return NextResponse.json(topology)
  } catch (error) {
    console.error("Topology API error:", error)
    return NextResponse.json({ error: "Failed to generate topology" }, { status: 500 })
  }
}

// POST - Execute action on a node
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nodeId, action, params } = body
    
    if (!nodeId || !action) {
      return NextResponse.json({ error: "nodeId and action required" }, { status: 400 })
    }
    
    // Validate action
    const validActions = ["start", "stop", "restart", "configure", "spawn"]
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Invalid action. Must be one of: ${validActions.join(", ")}` }, { status: 400 })
    }
    
    // Try MAS orchestrator
    try {
      const endpoint = action === "spawn" 
        ? `${MAS_API_URL}/agents/spawn`
        : `${MAS_API_URL}/agents/${nodeId}/${action}`
      
      const masRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params || {}),
        signal: AbortSignal.timeout(10000),
      })
      
      if (masRes.ok) {
        const result = await masRes.json()
        return NextResponse.json({
          success: true,
          nodeId,
          action,
          message: result.message || `Action ${action} completed for ${nodeId}`,
          data: result,
          timestamp: new Date().toISOString(),
        })
      }
      
      // Return error from MAS
      const errorData = await masRes.json().catch(() => ({}))
      return NextResponse.json({
        success: false,
        nodeId,
        action,
        message: errorData.error || `Action ${action} failed`,
        timestamp: new Date().toISOString(),
      }, { status: masRes.status })
    } catch (masError) {
      // MAS not reachable - return simulated response for development
      console.warn("MAS not reachable, returning simulated response:", masError)
      
      return NextResponse.json({
        success: true,
        nodeId,
        action,
        message: `Action ${action} queued for ${nodeId} (simulated - MAS offline)`,
        simulated: true,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("Topology action error:", error)
    return NextResponse.json({ error: "Action failed" }, { status: 500 })
  }
}
