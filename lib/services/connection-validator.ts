/**
 * Connection Validator Service
 * Ensures all agents are properly connected to core systems
 * 
 * Created: Jan 26, 2026
 * 
 * Required connections (direct or indirect):
 * - Every agent must reach myca-orchestrator
 * - Every agent must reach one of: memory-manager, task-router, health-monitor
 * - Every agent must reach one of: redis, postgres, mindex-db
 */

import type { TopologyNode, TopologyConnection, NodeCategory } from "@/components/mas/topology/types"

// Core system IDs (must match actual agent IDs in agent-registry.ts)
const ORCHESTRATOR_ID = "myca-orchestrator"
const MEMORY_SYSTEM_IDS = ["memory-manager", "task-router", "health-monitor", "cache-manager", "vector-store"]
const DATA_SYSTEM_IDS = ["redis", "postgresql", "mindex", "supabase", "qdrant-service", "mongodb", "elasticsearch"]

export interface ConnectionValidationResult {
  agentId: string
  agentName: string
  category: NodeCategory
  isFullyConnected: boolean
  hasOrchestratorPath: boolean
  hasMemoryPath: boolean
  hasDataPath: boolean
  missingConnections: MissingConnection[]
  connectionPath: string[] // Path to orchestrator
  score: number // 0-100 connectivity score
}

export interface MissingConnection {
  type: "orchestrator" | "memory" | "data"
  suggestedTarget: string
  suggestedTargetName: string
  reason: string
  autoConnectable: boolean
  priority: number // 1-10
}

export interface ValidationSummary {
  totalAgents: number
  fullyConnectedAgents: number
  partiallyConnectedAgents: number
  disconnectedAgents: number
  overallScore: number
  criticalIssues: ConnectionValidationResult[]
  autoFixableCount: number
}

/**
 * Build adjacency list from connections
 */
function buildAdjacencyList(
  connections: TopologyConnection[]
): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>()
  
  for (const conn of connections) {
    // Skip only explicitly inactive connections
    // Include connections where active is undefined (default to active)
    if (conn.active === false) continue
    
    // Add forward edge
    if (!adjacency.has(conn.sourceId)) {
      adjacency.set(conn.sourceId, new Set())
    }
    adjacency.get(conn.sourceId)!.add(conn.targetId)
    
    // Always add reverse edge for path finding - all connections are logically bidirectional
    // This is for connectivity checking, not for actual data flow
    if (!adjacency.has(conn.targetId)) {
      adjacency.set(conn.targetId, new Set())
    }
    adjacency.get(conn.targetId)!.add(conn.sourceId)
  }
  
  return adjacency
}

/**
 * Find path between two nodes using BFS
 */
function findPath(
  startId: string,
  targetIds: string[],
  adjacency: Map<string, Set<string>>
): string[] | null {
  const targetSet = new Set(targetIds)
  const queue: { nodeId: string; path: string[] }[] = [{ nodeId: startId, path: [startId] }]
  const visited = new Set<string>([startId])
  
  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!
    
    if (targetSet.has(nodeId)) {
      return path
    }
    
    const neighbors = adjacency.get(nodeId) || new Set()
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push({ nodeId: neighbor, path: [...path, neighbor] })
      }
    }
  }
  
  return null
}

/**
 * Check if node can reach any of the target IDs
 */
function canReach(
  startId: string,
  targetIds: string[],
  adjacency: Map<string, Set<string>>
): boolean {
  return findPath(startId, targetIds, adjacency) !== null
}

/**
 * Find the best target to connect to for a missing connection type
 */
function findBestTarget(
  agentId: string,
  targetIds: string[],
  nodes: TopologyNode[],
  adjacency: Map<string, Set<string>>
): { id: string; name: string } | null {
  // Get agent info
  const agent = nodes.find(n => n.id === agentId)
  if (!agent) return null
  
  // Sort targets by:
  // 1. Same category (prefer)
  // 2. Number of existing connections (more = better hub)
  // 3. Status (active preferred)
  const targetNodes = nodes
    .filter(n => targetIds.includes(n.id))
    .filter(n => n.status === "active" || n.status === "busy")
    .sort((a, b) => {
      // Same category first
      if (a.category === agent.category && b.category !== agent.category) return -1
      if (b.category === agent.category && a.category !== agent.category) return 1
      
      // More connections = better hub
      const aConns = adjacency.get(a.id)?.size || 0
      const bConns = adjacency.get(b.id)?.size || 0
      return bConns - aConns
    })
  
  return targetNodes.length > 0 
    ? { id: targetNodes[0].id, name: targetNodes[0].shortName }
    : null
}

/**
 * Validate a single agent's connections
 */
function validateAgent(
  agent: TopologyNode,
  nodes: TopologyNode[],
  adjacency: Map<string, Set<string>>
): ConnectionValidationResult {
  const missingConnections: MissingConnection[] = []
  
  // Check orchestrator path
  const orchestratorPath = findPath(agent.id, [ORCHESTRATOR_ID], adjacency)
  const hasOrchestratorPath = orchestratorPath !== null
  
  if (!hasOrchestratorPath && agent.id !== ORCHESTRATOR_ID) {
    const target = findBestTarget(agent.id, [ORCHESTRATOR_ID], nodes, adjacency)
    missingConnections.push({
      type: "orchestrator",
      suggestedTarget: target?.id || ORCHESTRATOR_ID,
      suggestedTargetName: target?.name || "MYCA",
      reason: "No path to orchestrator - agent cannot receive commands or report status",
      autoConnectable: true,
      priority: 10,
    })
  }
  
  // Check memory system path
  const hasMemoryPath = canReach(agent.id, MEMORY_SYSTEM_IDS, adjacency)
  
  if (!hasMemoryPath && agent.type !== "database") {
    const target = findBestTarget(agent.id, MEMORY_SYSTEM_IDS, nodes, adjacency)
    if (target) {
      missingConnections.push({
        type: "memory",
        suggestedTarget: target.id,
        suggestedTargetName: target.name,
        reason: "No path to memory/task system - agent cannot share state or receive tasks",
        autoConnectable: true,
        priority: 8,
      })
    }
  }
  
  // Check data system path
  const hasDataPath = canReach(agent.id, DATA_SYSTEM_IDS, adjacency)
  
  if (!hasDataPath && agent.type !== "user") {
    const target = findBestTarget(agent.id, DATA_SYSTEM_IDS, nodes, adjacency)
    if (target) {
      missingConnections.push({
        type: "data",
        suggestedTarget: target.id,
        suggestedTargetName: target.name,
        reason: "No path to data storage - agent cannot persist or query data",
        autoConnectable: true,
        priority: 7,
      })
    }
  }
  
  // Calculate connectivity score
  let score = 0
  if (hasOrchestratorPath) score += 40
  if (hasMemoryPath) score += 30
  if (hasDataPath) score += 30
  
  // Bonus for direct connections
  const directConnections = adjacency.get(agent.id)?.size || 0
  score += Math.min(directConnections * 2, 10)
  score = Math.min(score, 100)
  
  return {
    agentId: agent.id,
    agentName: agent.shortName,
    category: agent.category,
    isFullyConnected: missingConnections.length === 0,
    hasOrchestratorPath,
    hasMemoryPath,
    hasDataPath,
    missingConnections,
    connectionPath: orchestratorPath || [],
    score,
  }
}

/**
 * Validate all agent connections
 */
export function validateAgentConnections(
  nodes: TopologyNode[],
  connections: TopologyConnection[]
): ConnectionValidationResult[] {
  const adjacency = buildAdjacencyList(connections)
  
  // Only validate actual agents, not services/databases/users
  const agents = nodes.filter(n => 
    n.type === "agent" || 
    n.type === "orchestrator" || 
    n.type === "integration" ||
    n.type === "workflow"
  )
  
  return agents.map(agent => validateAgent(agent, nodes, adjacency))
}

/**
 * Get validation summary
 */
export function getValidationSummary(
  results: ConnectionValidationResult[]
): ValidationSummary {
  const fullyConnected = results.filter(r => r.isFullyConnected)
  const disconnected = results.filter(r => r.score < 30)
  const partial = results.filter(r => !r.isFullyConnected && r.score >= 30)
  
  const overallScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.score, 0) / results.length
    : 100
  
  const criticalIssues = results
    .filter(r => !r.hasOrchestratorPath)
    .sort((a, b) => a.score - b.score)
  
  const autoFixableCount = results.reduce(
    (sum, r) => sum + r.missingConnections.filter(m => m.autoConnectable).length,
    0
  )
  
  return {
    totalAgents: results.length,
    fullyConnectedAgents: fullyConnected.length,
    partiallyConnectedAgents: partial.length,
    disconnectedAgents: disconnected.length,
    overallScore: Math.round(overallScore),
    criticalIssues,
    autoFixableCount,
  }
}

/**
 * Generate auto-connect configuration for an agent
 */
export function generateAutoConnections(
  agentId: string,
  nodes: TopologyNode[],
  connections: TopologyConnection[]
): TopologyConnection[] {
  const adjacency = buildAdjacencyList(connections)
  const agent = nodes.find(n => n.id === agentId)
  if (!agent) return []
  
  const result = validateAgent(agent, nodes, adjacency)
  const newConnections: TopologyConnection[] = []
  
  for (const missing of result.missingConnections) {
    if (!missing.autoConnectable) continue
    
    newConnections.push({
      id: `auto-${agentId}-${missing.suggestedTarget}-${Date.now()}`,
      sourceId: agentId,
      targetId: missing.suggestedTarget,
      type: missing.type === "orchestrator" ? "command" : 
            missing.type === "memory" ? "message" : "query",
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
    })
  }
  
  return newConnections
}

/**
 * Fix all auto-connectable issues
 */
export function generateAllAutoConnections(
  results: ConnectionValidationResult[],
  nodes: TopologyNode[]
): TopologyConnection[] {
  const newConnections: TopologyConnection[] = []
  
  for (const result of results) {
    for (const missing of result.missingConnections) {
      if (!missing.autoConnectable) continue
      
      newConnections.push({
        id: `auto-${result.agentId}-${missing.suggestedTarget}-${Date.now()}-${Math.random()}`,
        sourceId: result.agentId,
        targetId: missing.suggestedTarget,
        type: missing.type === "orchestrator" ? "command" : 
              missing.type === "memory" ? "message" : "query",
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
      })
    }
  }
  
  return newConnections
}
