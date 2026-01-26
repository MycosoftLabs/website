/**
 * Auto-Connector Service
 * Automatically creates connections for new agents and fills detected gaps
 * 
 * Created: Jan 26, 2026
 * 
 * Features:
 * - On agent spawn: connect to orchestrator + relevant core services
 * - On gap detection: create missing connections
 * - Manual trigger for user-confirmed connections
 */

import type { 
  TopologyNode, 
  TopologyConnection, 
  NodeCategory, 
  NodeType, 
  ConnectionType,
  DetectedGap,
} from "@/components/mas/topology/types"
import {
  validateAgentConnections,
  generateAutoConnections,
  type ConnectionValidationResult,
} from "./connection-validator"

// Core system IDs that agents should connect to
const ORCHESTRATOR_ID = "myca-orchestrator"
const CORE_SYSTEMS = {
  memory: ["memory-manager", "task-router"],
  data: ["redis", "postgres", "mindex-db"],
  monitoring: ["health-monitor", "logger"],
  communication: ["message-router", "event-bus"],
}

// Category-specific recommended connections
const CATEGORY_CONNECTIONS: Partial<Record<NodeCategory, string[]>> = {
  financial: ["financial-manager", "transaction-processor", "audit-logger"],
  mycology: ["mindex-db", "species-identifier", "observation-processor"],
  security: ["security-monitor", "audit-logger", "access-controller"],
  data: ["redis", "postgres", "data-transformer"],
  communication: ["message-router", "notification-service"],
  device: ["device-registry", "telemetry-collector", "health-monitor"],
}

export interface AutoConnectResult {
  success: boolean
  connectionsCreated: TopologyConnection[]
  agentId: string
  error?: string
}

export interface GapFillResult {
  success: boolean
  connectionsCreated: TopologyConnection[]
  gapId: string
  agentSpawned?: string
  error?: string
}

export interface AutoConnectorConfig {
  autoConnectOnSpawn: boolean
  autoFillGaps: boolean
  notifyOnConnection: boolean
  requireConfirmationForNonCore: boolean
  maxAutoConnections: number
}

const DEFAULT_CONFIG: AutoConnectorConfig = {
  autoConnectOnSpawn: true,
  autoFillGaps: true,
  notifyOnConnection: true,
  requireConfirmationForNonCore: false,
  maxAutoConnections: 5,
}

/**
 * Determine required connections for a new agent based on its type and category
 */
export function determineRequiredConnections(
  agent: TopologyNode,
  existingNodes: TopologyNode[],
  existingConnections: TopologyConnection[]
): TopologyConnection[] {
  const connections: TopologyConnection[] = []
  const nodeIds = new Set(existingNodes.map(n => n.id))
  const timestamp = Date.now()
  
  // Always connect to orchestrator
  if (nodeIds.has(ORCHESTRATOR_ID) && agent.id !== ORCHESTRATOR_ID) {
    connections.push(createConnection(
      agent.id,
      ORCHESTRATOR_ID,
      "command",
      timestamp
    ))
  }
  
  // Connect to memory system
  const memoryTarget = CORE_SYSTEMS.memory.find(id => nodeIds.has(id))
  if (memoryTarget && agent.type !== "database") {
    connections.push(createConnection(
      agent.id,
      memoryTarget,
      "message",
      timestamp
    ))
  }
  
  // Connect to appropriate data system
  if (agent.type !== "user") {
    const dataTarget = CORE_SYSTEMS.data.find(id => nodeIds.has(id))
    if (dataTarget) {
      connections.push(createConnection(
        agent.id,
        dataTarget,
        "query",
        timestamp
      ))
    }
  }
  
  // Connect to monitoring for non-user nodes
  if (agent.type !== "user") {
    const monitorTarget = CORE_SYSTEMS.monitoring.find(id => nodeIds.has(id))
    if (monitorTarget) {
      connections.push(createConnection(
        agent.id,
        monitorTarget,
        "heartbeat",
        timestamp
      ))
    }
  }
  
  // Category-specific connections
  const categoryTargets = CATEGORY_CONNECTIONS[agent.category] || []
  for (const targetId of categoryTargets) {
    if (nodeIds.has(targetId) && !connections.some(c => c.targetId === targetId)) {
      connections.push(createConnection(
        agent.id,
        targetId,
        "message",
        timestamp
      ))
    }
  }
  
  return connections
}

/**
 * Create a connection object
 */
function createConnection(
  sourceId: string,
  targetId: string,
  type: ConnectionType,
  timestamp: number
): TopologyConnection {
  return {
    id: `auto-${sourceId}-${targetId}-${timestamp}`,
    sourceId,
    targetId,
    type,
    traffic: {
      messagesPerSecond: 0,
      bytesPerSecond: 0,
      latencyMs: 0,
      errorRate: 0,
    },
    animated: true,
    active: true,
    intensity: 0.5,
    bidirectional: true,
  }
}

/**
 * Auto-connect a newly spawned agent
 */
export async function autoConnectAgent(
  agent: TopologyNode,
  nodes: TopologyNode[],
  connections: TopologyConnection[],
  onCreateConnection: (connection: TopologyConnection) => Promise<void>,
  config: Partial<AutoConnectorConfig> = {}
): Promise<AutoConnectResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  if (!mergedConfig.autoConnectOnSpawn) {
    return {
      success: true,
      connectionsCreated: [],
      agentId: agent.id,
    }
  }
  
  try {
    const requiredConnections = determineRequiredConnections(agent, nodes, connections)
    const connectionsToCreate = requiredConnections.slice(0, mergedConfig.maxAutoConnections)
    
    for (const conn of connectionsToCreate) {
      await onCreateConnection(conn)
    }
    
    return {
      success: true,
      connectionsCreated: connectionsToCreate,
      agentId: agent.id,
    }
  } catch (error) {
    return {
      success: false,
      connectionsCreated: [],
      agentId: agent.id,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Validate and auto-fix connections for all agents
 */
export async function validateAndFixConnections(
  nodes: TopologyNode[],
  connections: TopologyConnection[],
  onCreateConnection: (connection: TopologyConnection) => Promise<void>,
  config: Partial<AutoConnectorConfig> = {}
): Promise<{
  results: ConnectionValidationResult[]
  fixed: TopologyConnection[]
  remaining: ConnectionValidationResult[]
}> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  // Validate all agents
  const validationResults = validateAgentConnections(nodes, connections)
  
  // Find agents needing connections
  const needsFixing = validationResults.filter(r => !r.isFullyConnected)
  
  if (!mergedConfig.autoFillGaps) {
    return {
      results: validationResults,
      fixed: [],
      remaining: needsFixing,
    }
  }
  
  const fixedConnections: TopologyConnection[] = []
  
  // Auto-fix each agent
  for (const result of needsFixing) {
    const autoConnections = generateAutoConnections(result.agentId, nodes, connections)
    const toCreate = autoConnections.slice(0, mergedConfig.maxAutoConnections)
    
    for (const conn of toCreate) {
      try {
        await onCreateConnection(conn)
        fixedConnections.push(conn)
      } catch (error) {
        console.error(`Failed to create connection for ${result.agentId}:`, error)
      }
    }
  }
  
  // Re-validate after fixes
  const updatedConnections = [...connections, ...fixedConnections]
  const updatedResults = validateAgentConnections(nodes, updatedConnections)
  const stillNeedsFixing = updatedResults.filter(r => !r.isFullyConnected)
  
  return {
    results: updatedResults,
    fixed: fixedConnections,
    remaining: stillNeedsFixing,
  }
}

/**
 * Fill a detected gap by creating connections or spawning an agent
 */
export async function fillGap(
  gap: DetectedGap,
  nodes: TopologyNode[],
  connections: TopologyConnection[],
  onCreateConnection: (connection: TopologyConnection) => Promise<void>,
  onSpawnAgent?: (type: string, category: NodeCategory) => Promise<TopologyNode>
): Promise<GapFillResult> {
  const timestamp = Date.now()
  const connectionsCreated: TopologyConnection[] = []
  
  try {
    // If the gap suggests spawning an agent and we have a spawn handler
    if (gap.autoSpawnRecommended && onSpawnAgent) {
      const newAgent = await onSpawnAgent(gap.suggestedAgentType, gap.suggestedCategory)
      
      // Auto-connect the new agent
      const result = await autoConnectAgent(
        newAgent,
        [...nodes, newAgent],
        connections,
        onCreateConnection
      )
      
      return {
        success: true,
        connectionsCreated: result.connectionsCreated,
        gapId: gap.id,
        agentSpawned: newAgent.id,
      }
    }
    
    // Otherwise, try to fill the gap by creating connections between existing nodes
    switch (gap.gapType) {
      case "route_coverage": {
        // Find orphaned nodes and connect them to nearest hub
        const orphans = nodes.filter(n => 
          !connections.some(c => c.sourceId === n.id || c.targetId === n.id)
        )
        
        for (const orphan of orphans.slice(0, 3)) {
          const conn = createConnection(orphan.id, ORCHESTRATOR_ID, "message", timestamp)
          await onCreateConnection(conn)
          connectionsCreated.push(conn)
        }
        break
      }
      
      case "device_monitoring": {
        // Connect devices to health monitor
        const devices = nodes.filter(n => n.type === "device")
        const monitor = nodes.find(n => n.id === "health-monitor")
        
        if (monitor) {
          for (const device of devices.slice(0, 5)) {
            if (!connections.some(c => 
              (c.sourceId === device.id && c.targetId === monitor.id) ||
              (c.targetId === device.id && c.sourceId === monitor.id)
            )) {
              const conn = createConnection(device.id, monitor.id, "stream", timestamp)
              await onCreateConnection(conn)
              connectionsCreated.push(conn)
            }
          }
        }
        break
      }
      
      case "integration": {
        // Connect integration agents to their targets
        const integrations = nodes.filter(n => n.type === "integration")
        for (const int of integrations.slice(0, 3)) {
          if (!connections.some(c => c.sourceId === int.id || c.targetId === int.id)) {
            const conn = createConnection(int.id, ORCHESTRATOR_ID, "message", timestamp)
            await onCreateConnection(conn)
            connectionsCreated.push(conn)
          }
        }
        break
      }
      
      case "data_pipeline": {
        // Ensure data agents are connected to databases
        const dataAgents = nodes.filter(n => n.category === "data" && n.type === "agent")
        const databases = nodes.filter(n => n.type === "database")
        
        if (databases.length > 0) {
          const primaryDb = databases[0]
          for (const agent of dataAgents.slice(0, 3)) {
            if (!connections.some(c => 
              (c.sourceId === agent.id && c.targetId === primaryDb.id) ||
              (c.targetId === agent.id && c.sourceId === primaryDb.id)
            )) {
              const conn = createConnection(agent.id, primaryDb.id, "query", timestamp)
              await onCreateConnection(conn)
              connectionsCreated.push(conn)
            }
          }
        }
        break
      }
      
      default:
        // Generic gap filling
        break
    }
    
    return {
      success: true,
      connectionsCreated,
      gapId: gap.id,
    }
  } catch (error) {
    return {
      success: false,
      connectionsCreated,
      gapId: gap.id,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Get connection health summary
 */
export function getConnectionHealth(
  nodes: TopologyNode[],
  connections: TopologyConnection[]
): {
  score: number
  fullyConnected: number
  partiallyConnected: number
  disconnected: number
  recommendations: string[]
} {
  const results = validateAgentConnections(nodes, connections)
  
  const fullyConnected = results.filter(r => r.isFullyConnected).length
  const partiallyConnected = results.filter(r => !r.isFullyConnected && r.score >= 30).length
  const disconnected = results.filter(r => r.score < 30).length
  
  const score = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 100
  
  const recommendations: string[] = []
  
  if (disconnected > 0) {
    recommendations.push(`${disconnected} agents are disconnected and need core connections`)
  }
  if (partiallyConnected > 0) {
    recommendations.push(`${partiallyConnected} agents have partial connections`)
  }
  
  const noOrchestrator = results.filter(r => !r.hasOrchestratorPath).length
  if (noOrchestrator > 0) {
    recommendations.push(`${noOrchestrator} agents cannot reach the orchestrator`)
  }
  
  const noData = results.filter(r => !r.hasDataPath).length
  if (noData > 0) {
    recommendations.push(`${noData} agents have no data storage access`)
  }
  
  return {
    score,
    fullyConnected,
    partiallyConnected,
    disconnected,
    recommendations,
  }
}

/**
 * Create auto-connector event handlers for WebSocket integration
 */
export function createAutoConnectorHandlers(
  getNodes: () => TopologyNode[],
  getConnections: () => TopologyConnection[],
  onCreateConnection: (connection: TopologyConnection) => Promise<void>,
  onNotify: (message: string, type: "success" | "info" | "warning") => void,
  config: Partial<AutoConnectorConfig> = {}
) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  return {
    onAgentSpawned: async (agent: TopologyNode) => {
      if (!mergedConfig.autoConnectOnSpawn) return
      
      const nodes = getNodes()
      const connections = getConnections()
      
      const result = await autoConnectAgent(
        agent,
        nodes,
        connections,
        onCreateConnection,
        mergedConfig
      )
      
      if (mergedConfig.notifyOnConnection && result.connectionsCreated.length > 0) {
        onNotify(
          `Auto-connected ${agent.shortName} to ${result.connectionsCreated.length} core services`,
          "success"
        )
      }
    },
    
    onGapDetected: async (gap: DetectedGap) => {
      if (!mergedConfig.autoFillGaps) return
      
      const nodes = getNodes()
      const connections = getConnections()
      
      const result = await fillGap(
        gap,
        nodes,
        connections,
        onCreateConnection
      )
      
      if (mergedConfig.notifyOnConnection && result.success) {
        const msg = result.agentSpawned
          ? `Spawned ${result.agentSpawned} and created ${result.connectionsCreated.length} connections`
          : `Filled gap: created ${result.connectionsCreated.length} connections`
        onNotify(msg, "info")
      }
    },
  }
}
