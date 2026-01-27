import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
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
 * MAS Topology API v2.2
 * Returns real-time topology data for 3D visualization
 * Supports 223+ agents from the complete MAS registry
 * 
 * REAL PERSISTENCE: Merges database-stored connections with default connections
 */

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Initialize Supabase client for server-side operations with service role
// The service role key bypasses RLS and has full access
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    })
  : null

// Interface for persisted connections
interface PersistedConnection {
  id: string
  source_id: string
  target_id: string
  connection_type: string
  bidirectional: boolean
  priority: number
  created_at: string
  created_by: string
  status: string
  metadata?: Record<string, unknown>
}

// Fetch persisted connections from database
async function fetchPersistedConnections(): Promise<PersistedConnection[]> {
  if (!supabase) {
    return []
  }
  
  try {
    const { data, error } = await supabase
      .from("mas_connections")
      .select("*")
      .eq("status", "active")
    
    if (error) {
      console.warn("[Topology API] Error fetching persisted connections:", error.message)
      return []
    }
    
    return data || []
  } catch (err) {
    console.warn("[Topology API] Supabase unavailable:", err)
    return []
  }
}

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

// Category radii (distance from center) - EXPANDED for 223+ agents
const CATEGORY_RADII: Record<NodeCategory, number> = {
  core: 12,
  financial: 35,
  mycology: 45,
  research: 40,
  dao: 55,
  communication: 30,
  data: 50,
  infrastructure: 38,
  simulation: 42,
  security: 28,
  integration: 44,
  device: 40,
  chemistry: 32,
  nlm: 48,
}

// Generate STABLE force-directed positions using category clustering
// NO randomness - positions are deterministic based on agent index
function generatePositions(agents: AgentDefinition[]): Map<string, [number, number, number]> {
  const positions = new Map<string, [number, number, number]>()
  
  // Group nodes by category
  const categoryNodes: Record<string, AgentDefinition[]> = {}
  agents.forEach(agent => {
    if (!categoryNodes[agent.category]) categoryNodes[agent.category] = []
    categoryNodes[agent.category].push(agent)
  })
  
  // Special positions for core infrastructure (spread out)
  positions.set("myca-orchestrator", [0, 5, 0])
  positions.set("user-morgan", [0, 15, -12])
  positions.set("redis", [-10, 0, -10])
  positions.set("postgresql", [10, 0, -10])
  positions.set("qdrant-service", [0, -5, -10])
  
  // Position nodes by category with expanded spiral arrangement
  Object.entries(categoryNodes).forEach(([category, catNodes]) => {
    const angle = CATEGORY_ANGLES[category as NodeCategory] || 0
    const baseRadius = CATEGORY_RADII[category as NodeCategory] || 40
    const nodeCount = catNodes.length
    
    // Calculate how many nodes per ring to avoid overlap
    const nodesPerRing = Math.max(6, Math.ceil(nodeCount / 4))
    const ringSpacing = 8 // Distance between rings
    const nodeSpacing = (2 * Math.PI) / nodesPerRing // Angular spacing
    
    catNodes.forEach((agent, i) => {
      if (positions.has(agent.id)) return
      
      // Determine which ring this node is on
      const ringIndex = Math.floor(i / nodesPerRing)
      const positionInRing = i % nodesPerRing
      
      // Calculate angle - spread evenly around the ring
      // Offset each ring slightly to avoid vertical stacking
      const ringOffset = (ringIndex * 0.5) % (2 * Math.PI)
      const nodeAngle = angle + (positionInRing * nodeSpacing) + ringOffset
      
      // Radius increases with each ring
      const radius = baseRadius + (ringIndex * ringSpacing)
      
      // Height varies by position to create 3D depth (deterministic, no random)
      const heightOffset = Math.sin(positionInRing * 1.2) * 4
      const heightLayer = ringIndex * 3 - 4 + heightOffset
      
      // Use deterministic "jitter" based on agent ID hash for stable organic look
      const hashCode = agent.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const deterministicOffsetX = ((hashCode % 100) / 100 - 0.5) * 3
      const deterministicOffsetZ = (((hashCode * 7) % 100) / 100 - 0.5) * 3
      
      positions.set(agent.id, [
        Math.cos(nodeAngle) * radius + deterministicOffsetX,
        heightLayer,
        Math.sin(nodeAngle) * radius + deterministicOffsetZ,
      ])
    })
  })
  
  return positions
}

// Seeded random for stable values based on agent ID
function seededRandom(seed: string): () => number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff
    return hash / 0x7fffffff
  }
}

// Generate STABLE metrics based on agent ID (no fluctuation between requests)
function generateMetrics(agentId: string, isActive: boolean): TopologyNode["metrics"] {
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
  
  // Use seeded random for stable values
  const rand = seededRandom(agentId)
  
  return {
    cpuPercent: Math.floor(rand() * 60 + 5),
    memoryMb: Math.floor(rand() * 512 + 64),
    tasksCompleted: Math.floor(rand() * 50000 + 1000),
    tasksQueued: Math.floor(rand() * 10),
    messagesPerSecond: Math.floor(rand() * 100 + 10),
    errorRate: Math.round(rand() * 0.05 * 1000) / 1000,
    uptime: Math.floor(rand() * 86400 * 7 + 3600),
    lastActive: new Date().toISOString(), // Always current
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
    metrics: liveStatus?.metrics || generateMetrics(agent.id, isActive),
    connections: [], // Will be populated from connections array
    size: agent.priority >= 8 ? 1.5 : agent.priority >= 5 ? 1.2 : 1,
    priority: agent.priority,
    canStart: agent.canStart,
    canStop: agent.canStop,
    canRestart: agent.canRestart,
    canConfigure: agent.canConfigure,
  }
}

// Generate STABLE connections with proper typing (no random fluctuation)
// Now includes merging persisted connections from database
function generateConnections(
  nodes: TopologyNode[], 
  persistedConnections: PersistedConnection[] = []
): TopologyConnection[] {
  const connections: TopologyConnection[] = []
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const added = new Set<string>()
  
  // First, add all persisted connections (real connections from database)
  persistedConnections.forEach(pc => {
    const id = [pc.source_id, pc.target_id].sort().join("--")
    if (added.has(id)) return
    if (!nodeMap.has(pc.source_id) || !nodeMap.has(pc.target_id)) return
    added.add(id)
    
    const sourceNode = nodeMap.get(pc.source_id)!
    const targetNode = nodeMap.get(pc.target_id)!
    const isActive = sourceNode.status === "active" && targetNode.status === "active"
    
    // Use seeded random for stable traffic values
    const rand = seededRandom(id)
    
    connections.push({
      id: pc.id, // Use persisted ID
      sourceId: pc.source_id,
      targetId: pc.target_id,
      type: pc.connection_type as TopologyConnection["type"],
      traffic: {
        messagesPerSecond: isActive ? Math.floor(rand() * 50 + 5) : 0,
        bytesPerSecond: isActive ? Math.floor(rand() * 10000 + 500) : 0,
        latencyMs: isActive ? Math.floor(rand() * 50 + 2) : 0,
        errorRate: isActive ? Math.round(rand() * 0.02 * 1000) / 1000 : 0,
      },
      animated: isActive && rand() > 0.3,
      active: isActive,
      intensity: isActive ? Math.round((rand() * 0.7 + 0.3) * 100) / 100 : 0.1,
      bidirectional: pc.bidirectional,
      // Mark as persisted for UI differentiation
      metadata: { persisted: true, createdBy: pc.created_by, createdAt: pc.created_at },
    })
  })
  
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
    
    // Use seeded random for stable traffic values
    const rand = seededRandom(id)
    
    connections.push({
      id,
      sourceId: source,
      targetId: target,
      type,
      traffic: {
        messagesPerSecond: isActive ? Math.floor(rand() * 50 + 5) : 0,
        bytesPerSecond: isActive ? Math.floor(rand() * 10000 + 500) : 0,
        latencyMs: isActive ? Math.floor(rand() * 50 + 2) : 0,
        errorRate: isActive ? Math.round(rand() * 0.02 * 1000) / 1000 : 0,
      },
      animated: isActive && rand() > 0.3,
      active: isActive,
      intensity: isActive ? Math.round((rand() * 0.7 + 0.3) * 100) / 100 : 0.1,
      bidirectional: rand() > 0.4,
    })
  })
  
  // Generate additional intra-category connections (stable)
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
      
      const rand = seededRandom(id)
      
      connections.push({
        id,
        sourceId: source.id,
        targetId: target.id,
        type: "sync",
        traffic: {
          messagesPerSecond: Math.floor(rand() * 20 + 2),
          bytesPerSecond: Math.floor(rand() * 5000 + 100),
          latencyMs: Math.floor(rand() * 30 + 1),
          errorRate: Math.round(rand() * 0.01 * 1000) / 1000,
        },
        animated: rand() > 0.5,
        active: true,
        intensity: Math.round((rand() * 0.5 + 0.2) * 100) / 100,
        bidirectional: true,
      })
    }
  })
  
  return connections
}

// Generate STABLE active data packets (animation only, positions change)
function generatePackets(connections: TopologyConnection[], count: number = 30): DataPacket[] {
  const packets: DataPacket[] = []
  const activeConnections = connections.filter(c => c.active && c.animated)
  
  // Distribute packets across active connections (stable selection)
  const connsToUse = activeConnections.slice(0, Math.min(activeConnections.length, count))
  
  connsToUse.forEach((conn, idx) => {
    const rand = seededRandom(conn.id + "-pkt")
    const numPackets = Math.floor(rand() * 2) + 1
    
    for (let i = 0; i < numPackets; i++) {
      const direction = rand() > 0.5
      const packetTypes: DataPacket["type"][] = ["request", "response", "event"]
      
      packets.push({
        id: `pkt-${conn.id}-${i}`,
        connectionId: conn.id,
        sourceId: direction ? conn.sourceId : conn.targetId,
        targetId: direction ? conn.targetId : conn.sourceId,
        type: packetTypes[Math.floor(rand() * 3)],
        size: Math.floor(rand() * 1000 + 100),
        timestamp: Date.now(), // Current time for animation
        progress: ((Date.now() / 1000 + idx * 0.3 + i * 0.5) % 1), // Animated progress
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
    
    // Fetch persisted connections from database
    const persistedConnections = await fetchPersistedConnections()
    
    // Generate connections (merges default + persisted)
    const connections = generateConnections(nodes, persistedConnections)
    
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
    const persistedCount = connections.filter(c => c.metadata?.persisted).length
    
    const topology: ExtendedTopologyData = {
      nodes,
      connections,
      packets,
      stats: {
        totalNodes: nodes.length,
        activeNodes,
        totalConnections: connections.length,
        activeConnections,
        persistedConnections: persistedCount,
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
      // Include persistence info
      persistence: supabase ? "supabase" : "memory",
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
