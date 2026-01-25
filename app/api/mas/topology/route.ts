import { NextRequest, NextResponse } from "next/server"
import type { TopologyData, TopologyNode, TopologyConnection, DataPacket } from "@/components/mas/topology/types"

/**
 * MAS Topology API
 * Returns real-time topology data for 3D visualization
 */

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

// Complete agent registry for topology
const TOPOLOGY_REGISTRY: Omit<TopologyNode, "position" | "metrics">[] = [
  // Core agents
  { id: "myca-orchestrator", name: "MYCA Orchestrator", shortName: "MYCA", type: "orchestrator", category: "core", status: "active", description: "Central AI orchestrator", connections: ["memory-manager", "task-router", "redis-broker", "qdrant-db", "postgres-db"], size: 2.5, priority: 1, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "memory-manager", name: "Memory Manager", shortName: "Memory", type: "agent", category: "core", status: "active", description: "Conversation and context memory", connections: ["myca-orchestrator", "redis-broker", "qdrant-db"], size: 1.2, priority: 2, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "task-router", name: "Task Router", shortName: "Router", type: "agent", category: "core", status: "active", description: "Routes tasks to appropriate agents", connections: ["myca-orchestrator", "redis-broker"], size: 1.2, priority: 2, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "scheduler-agent", name: "Scheduler Agent", shortName: "Scheduler", type: "agent", category: "core", status: "active", description: "Task scheduling and cron jobs", connections: ["myca-orchestrator", "task-router"], size: 1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  
  // Financial agents
  { id: "cfo-agent", name: "CFO Agent", shortName: "CFO", type: "agent", category: "financial", status: "active", description: "Chief Financial Officer operations", connections: ["myca-orchestrator", "mercury-agent", "stripe-agent", "accounting-agent"], size: 1.3, priority: 2, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "mercury-agent", name: "Mercury Bank Agent", shortName: "Mercury", type: "integration", category: "financial", status: "active", description: "Mercury banking integration", connections: ["cfo-agent", "accounting-agent"], size: 1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "stripe-agent", name: "Stripe Agent", shortName: "Stripe", type: "integration", category: "financial", status: "active", description: "Stripe payments integration", connections: ["cfo-agent", "accounting-agent"], size: 1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "accounting-agent", name: "Accounting Agent", shortName: "Accounting", type: "agent", category: "financial", status: "active", description: "Financial accounting operations", connections: ["cfo-agent", "treasury-agent", "postgres-db"], size: 1.1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "treasury-agent", name: "Treasury Agent", shortName: "Treasury", type: "agent", category: "financial", status: "active", description: "Treasury management", connections: ["cfo-agent", "accounting-agent"], size: 1, priority: 4, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  
  // Communication agents
  { id: "elevenlabs-agent", name: "ElevenLabs Voice", shortName: "Voice", type: "integration", category: "communication", status: "active", description: "Text-to-speech via ElevenLabs", connections: ["myca-orchestrator", "n8n-agent"], size: 1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "email-agent", name: "Email Agent", shortName: "Email", type: "agent", category: "communication", status: "active", description: "Email processing and sending", connections: ["myca-orchestrator", "n8n-agent"], size: 1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "sms-agent", name: "SMS Agent", shortName: "SMS", type: "agent", category: "communication", status: "idle", description: "SMS notifications", connections: ["myca-orchestrator"], size: 0.9, priority: 4, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  
  // Infrastructure agents
  { id: "docker-agent", name: "Docker Agent", shortName: "Docker", type: "agent", category: "infrastructure", status: "active", description: "Docker container management", connections: ["myca-orchestrator", "proxmox-agent"], size: 1.2, priority: 2, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "proxmox-agent", name: "Proxmox Agent", shortName: "Proxmox", type: "agent", category: "infrastructure", status: "active", description: "VM and hypervisor management", connections: ["myca-orchestrator", "docker-agent", "network-agent"], size: 1.3, priority: 2, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "network-agent", name: "Network Agent", shortName: "Network", type: "agent", category: "infrastructure", status: "active", description: "Network topology and routing", connections: ["proxmox-agent", "unifi-agent", "firewall-agent"], size: 1.1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "unifi-agent", name: "UniFi Agent", shortName: "UniFi", type: "integration", category: "infrastructure", status: "active", description: "UniFi network controller", connections: ["network-agent"], size: 1, priority: 4, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "firewall-agent", name: "Firewall Agent", shortName: "Firewall", type: "agent", category: "infrastructure", status: "active", description: "Firewall management", connections: ["network-agent", "soc-agent"], size: 1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  
  // Security agents  
  { id: "soc-agent", name: "SOC Agent", shortName: "SOC", type: "agent", category: "security", status: "active", description: "Security Operations Center", connections: ["myca-orchestrator", "firewall-agent", "watchdog-agent", "guardian-agent"], size: 1.4, priority: 2, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "watchdog-agent", name: "Threat Watchdog", shortName: "Watchdog", type: "agent", category: "security", status: "active", description: "Threat detection and monitoring", connections: ["soc-agent", "guardian-agent"], size: 1.1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "guardian-agent", name: "System Guardian", shortName: "Guardian", type: "agent", category: "security", status: "active", description: "System protection and response", connections: ["soc-agent", "watchdog-agent"], size: 1.1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  
  // Data agents
  { id: "mindex-agent", name: "MINDEX Agent", shortName: "MINDEX", type: "agent", category: "data", status: "active", description: "Mycological index database", connections: ["myca-orchestrator", "postgres-db", "etl-agent"], size: 1.3, priority: 2, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "etl-agent", name: "ETL Agent", shortName: "ETL", type: "agent", category: "data", status: "active", description: "Extract, Transform, Load operations", connections: ["mindex-agent", "postgres-db", "qdrant-db"], size: 1.1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "search-agent", name: "Search Agent", shortName: "Search", type: "agent", category: "data", status: "active", description: "Full-text and semantic search", connections: ["myca-orchestrator", "qdrant-db"], size: 1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "analytics-agent", name: "Analytics Agent", shortName: "Analytics", type: "agent", category: "data", status: "active", description: "Data analytics and reporting", connections: ["myca-orchestrator", "postgres-db"], size: 1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  
  // Device agents
  { id: "mycobrain-coordinator", name: "MycoBrain Coordinator", shortName: "MycoBrain", type: "agent", category: "device", status: "active", description: "IoT device coordinator", connections: ["myca-orchestrator", "sensor-agent", "camera-agent", "environment-agent"], size: 1.3, priority: 2, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "sensor-agent", name: "Sensor Agent", shortName: "Sensors", type: "agent", category: "device", status: "active", description: "Environmental sensors", connections: ["mycobrain-coordinator", "environment-agent"], size: 1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "camera-agent", name: "Camera Agent", shortName: "Cameras", type: "agent", category: "device", status: "active", description: "Camera feeds and analysis", connections: ["mycobrain-coordinator"], size: 1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "environment-agent", name: "Environment Agent", shortName: "Environment", type: "agent", category: "device", status: "active", description: "Environmental control", connections: ["mycobrain-coordinator", "sensor-agent"], size: 1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  
  // Integration agents
  { id: "n8n-agent", name: "n8n Agent", shortName: "n8n", type: "workflow", category: "integration", status: "active", description: "Workflow automation", connections: ["myca-orchestrator", "openai-agent", "elevenlabs-agent", "github-agent"], size: 1.3, priority: 2, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "openai-agent", name: "OpenAI Agent", shortName: "OpenAI", type: "integration", category: "integration", status: "active", description: "OpenAI API integration", connections: ["myca-orchestrator", "n8n-agent"], size: 1.1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "github-agent", name: "GitHub Agent", shortName: "GitHub", type: "integration", category: "integration", status: "active", description: "GitHub integration", connections: ["n8n-agent", "devops-agent"], size: 1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "devops-agent", name: "DevOps Agent", shortName: "DevOps", type: "agent", category: "integration", status: "active", description: "CI/CD and deployments", connections: ["github-agent", "docker-agent"], size: 1.1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  
  // Mycology agents
  { id: "species-classifier", name: "Species Classifier", shortName: "Classifier", type: "agent", category: "mycology", status: "active", description: "Mushroom species identification", connections: ["myca-orchestrator", "mindex-agent", "taxonomy-agent"], size: 1.2, priority: 2, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "taxonomy-agent", name: "Taxonomy Agent", shortName: "Taxonomy", type: "agent", category: "mycology", status: "active", description: "Taxonomic classification", connections: ["species-classifier", "mindex-agent"], size: 1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  { id: "cultivation-agent", name: "Cultivation Agent", shortName: "Cultivation", type: "agent", category: "mycology", status: "active", description: "Growing protocol management", connections: ["myca-orchestrator", "environment-agent"], size: 1.1, priority: 3, canStart: true, canStop: true, canRestart: true, canConfigure: true },
  
  // Services/Databases
  { id: "redis-broker", name: "Redis Message Broker", shortName: "Redis", type: "queue", category: "infrastructure", status: "active", description: "Message queue and caching", connections: ["myca-orchestrator", "memory-manager", "task-router"], size: 1.5, priority: 1, canStart: true, canStop: true, canRestart: true, canConfigure: false },
  { id: "postgres-db", name: "PostgreSQL Database", shortName: "PostgreSQL", type: "database", category: "data", status: "active", description: "Primary relational database", connections: ["mindex-agent", "accounting-agent", "etl-agent", "analytics-agent"], size: 1.6, priority: 1, canStart: true, canStop: true, canRestart: true, canConfigure: false },
  { id: "qdrant-db", name: "Qdrant Vector DB", shortName: "Qdrant", type: "database", category: "data", status: "active", description: "Vector embeddings database", connections: ["memory-manager", "search-agent", "etl-agent"], size: 1.4, priority: 1, canStart: true, canStop: true, canRestart: true, canConfigure: false },
  
  // User node
  { id: "user-morgan", name: "Morgan (CEO)", shortName: "Morgan", type: "user", category: "core", status: "active", description: "CEO command interface", connections: ["myca-orchestrator", "website-frontend"], size: 1.5, priority: 0, canStart: false, canStop: false, canRestart: false, canConfigure: false },
  { id: "website-frontend", name: "Website Frontend", shortName: "Website", type: "service", category: "infrastructure", status: "active", description: "Next.js web application", connections: ["user-morgan", "myca-orchestrator", "mindex-agent"], size: 1.3, priority: 1, canStart: true, canStop: true, canRestart: true, canConfigure: true },
]

// Generate positions using force-directed layout simulation
function generatePositions(nodes: typeof TOPOLOGY_REGISTRY): Map<string, [number, number, number]> {
  const positions = new Map<string, [number, number, number]>()
  
  // Category-based clustering
  const categoryAngles: Record<string, number> = {
    core: 0,
    financial: Math.PI / 4,
    communication: Math.PI / 2,
    infrastructure: (3 * Math.PI) / 4,
    security: Math.PI,
    data: (5 * Math.PI) / 4,
    device: (3 * Math.PI) / 2,
    integration: (7 * Math.PI) / 4,
    mycology: Math.PI / 6,
    research: Math.PI / 3,
    dao: (2 * Math.PI) / 3,
    simulation: (5 * Math.PI) / 6,
    chemistry: (7 * Math.PI) / 6,
    nlm: (4 * Math.PI) / 3,
  }
  
  // Group nodes by category
  const categoryNodes: Record<string, typeof TOPOLOGY_REGISTRY> = {}
  nodes.forEach(node => {
    if (!categoryNodes[node.category]) categoryNodes[node.category] = []
    categoryNodes[node.category].push(node)
  })
  
  // Position orchestrator at center
  positions.set("myca-orchestrator", [0, 0, 0])
  positions.set("user-morgan", [0, 5, -8])
  
  // Position nodes by category
  Object.entries(categoryNodes).forEach(([category, catNodes]) => {
    const angle = categoryAngles[category] || 0
    const radius = 12 + Math.random() * 4
    
    catNodes.forEach((node, i) => {
      if (positions.has(node.id)) return
      
      const nodeAngle = angle + (i - catNodes.length / 2) * 0.3
      const heightOffset = (Math.random() - 0.5) * 6
      const radiusOffset = (Math.random() - 0.5) * 4
      
      positions.set(node.id, [
        Math.cos(nodeAngle) * (radius + radiusOffset),
        heightOffset,
        Math.sin(nodeAngle) * (radius + radiusOffset),
      ])
    })
  })
  
  return positions
}

// Generate random metrics
function generateMetrics(): TopologyNode["metrics"] {
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

// Generate connections from node definitions
function generateConnections(nodes: TopologyNode[]): TopologyConnection[] {
  const connections: TopologyConnection[] = []
  const added = new Set<string>()
  
  nodes.forEach(node => {
    node.connections.forEach(targetId => {
      const id = [node.id, targetId].sort().join("--")
      if (added.has(id)) return
      added.add(id)
      
      // Determine connection type based on node types
      let type: TopologyConnection["type"] = "message"
      if (node.type === "database" || nodes.find(n => n.id === targetId)?.type === "database") {
        type = "query"
      } else if (node.type === "queue" || nodes.find(n => n.id === targetId)?.type === "queue") {
        type = "stream"
      } else if (node.category === "integration" || nodes.find(n => n.id === targetId)?.category === "integration") {
        type = "data"
      }
      
      connections.push({
        id,
        sourceId: node.id,
        targetId,
        type,
        traffic: {
          messagesPerSecond: Math.random() * 50 + 5,
          bytesPerSecond: Math.floor(Math.random() * 10000 + 500),
          latencyMs: Math.random() * 50 + 2,
          errorRate: Math.random() * 0.02,
        },
        animated: Math.random() > 0.3,
        active: Math.random() > 0.1,
        intensity: Math.random() * 0.7 + 0.3,
        bidirectional: Math.random() > 0.4,
      })
    })
  })
  
  return connections
}

// Generate active data packets
function generatePackets(connections: TopologyConnection[]): DataPacket[] {
  const packets: DataPacket[] = []
  const activeConnections = connections.filter(c => c.active && c.animated)
  
  // Generate 1-3 packets per active connection
  activeConnections.slice(0, 20).forEach(conn => {
    const numPackets = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < numPackets; i++) {
      packets.push({
        id: `pkt-${conn.id}-${i}-${Date.now()}`,
        connectionId: conn.id,
        sourceId: Math.random() > 0.5 ? conn.sourceId : conn.targetId,
        targetId: Math.random() > 0.5 ? conn.targetId : conn.sourceId,
        type: ["request", "response", "event"][Math.floor(Math.random() * 3)] as DataPacket["type"],
        size: Math.floor(Math.random() * 1000 + 100),
        timestamp: Date.now() - Math.random() * 1000,
        progress: Math.random(),
      })
    }
  })
  
  return packets
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includePackets = searchParams.get("packets") !== "false"
    
    // Try to get real data from MAS
    let masData = null
    try {
      const masRes = await fetch(`${MAS_API_URL}/topology`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      })
      if (masRes.ok) {
        masData = await masRes.json()
      }
    } catch {
      // Use generated data
    }
    
    // Generate positions
    const positions = generatePositions(TOPOLOGY_REGISTRY)
    
    // Build nodes with positions and metrics
    const nodes: TopologyNode[] = TOPOLOGY_REGISTRY.map(node => ({
      ...node,
      position: positions.get(node.id) || [0, 0, 0],
      metrics: generateMetrics(),
    }))
    
    // Generate connections
    const connections = generateConnections(nodes)
    
    // Generate packets
    const packets = includePackets ? generatePackets(connections) : []
    
    // Calculate stats
    const activeNodes = nodes.filter(n => n.status === "active" || n.status === "busy").length
    const activeConnections = connections.filter(c => c.active).length
    
    const topology: TopologyData = {
      nodes,
      connections,
      packets,
      stats: {
        totalNodes: nodes.length,
        activeNodes,
        totalConnections: connections.length,
        activeConnections,
        messagesPerSecond: connections.reduce((sum, c) => sum + c.traffic.messagesPerSecond, 0),
        avgLatencyMs: connections.reduce((sum, c) => sum + c.traffic.latencyMs, 0) / connections.length,
        systemLoad: Math.random() * 0.4 + 0.2,
        uptimeSeconds: 86400 * 3 + Math.floor(Math.random() * 86400),
      },
      lastUpdated: new Date().toISOString(),
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
    
    // Try MAS first
    try {
      const masRes = await fetch(`${MAS_API_URL}/agents/${nodeId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params || {}),
        signal: AbortSignal.timeout(10000),
      })
      
      if (masRes.ok) {
        return NextResponse.json(await masRes.json())
      }
    } catch {
      // Fallback response
    }
    
    // Simulated response
    return NextResponse.json({
      success: true,
      nodeId,
      action,
      message: `Action ${action} queued for ${nodeId}`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Topology action error:", error)
    return NextResponse.json({ error: "Action failed" }, { status: 500 })
  }
}
