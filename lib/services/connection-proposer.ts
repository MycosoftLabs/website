/**
 * Connection Proposer Service
 * AI-powered connection analysis and implementation proposals
 * 
 * Created: Jan 26, 2026
 * 
 * Features:
 * - NLQ-based quick compatibility check
 * - LLM-powered detailed implementation plans
 * - Cascade connection detection
 */

import type { TopologyNode, TopologyConnection, NodeCategory, ConnectionType } from "@/components/mas/topology/types"

export interface ConnectionProposal {
  compatibility: "high" | "medium" | "low" | "requires-adapter"
  compatibilityScore: number // 0-100
  quickInsights: string[]
  implementationPlan: ImplementationPlan | null
  cascadeConnections: CascadeConnection[]
  riskAssessment: RiskAssessment
  estimatedEffort: "minimal" | "moderate" | "significant"
}

export interface ImplementationPlan {
  summary: string
  codeChanges: CodeChange[]
  newIntegrations: string[]
  configurationChanges: string[]
  testingNotes: string[]
}

export interface CodeChange {
  file: string
  description: string
  snippet?: string
  changeType: "add" | "modify" | "remove"
}

export interface CascadeConnection {
  from: string
  fromName: string
  to: string
  toName: string
  type: ConnectionType
  reason: string
  autoCreate: boolean
}

export interface RiskAssessment {
  level: "low" | "medium" | "high"
  factors: string[]
  mitigations: string[]
}

// Category compatibility matrix
const COMPATIBILITY_MATRIX: Record<NodeCategory, Record<NodeCategory, number>> = {
  core: { core: 100, financial: 80, mycology: 80, research: 80, dao: 80, communication: 90, data: 95, infrastructure: 95, simulation: 70, security: 90, integration: 85, device: 75, chemistry: 75, nlm: 85 },
  financial: { core: 80, financial: 100, mycology: 40, research: 50, dao: 85, communication: 70, data: 90, infrastructure: 60, simulation: 40, security: 85, integration: 75, device: 30, chemistry: 30, nlm: 50 },
  mycology: { core: 80, financial: 40, mycology: 100, research: 95, dao: 50, communication: 60, data: 85, infrastructure: 50, simulation: 80, security: 50, integration: 70, device: 80, chemistry: 90, nlm: 80 },
  research: { core: 80, financial: 50, mycology: 95, research: 100, dao: 55, communication: 65, data: 90, infrastructure: 55, simulation: 75, security: 50, integration: 70, device: 60, chemistry: 85, nlm: 90 },
  dao: { core: 80, financial: 85, mycology: 50, research: 55, dao: 100, communication: 75, data: 80, infrastructure: 60, simulation: 45, security: 80, integration: 70, device: 35, chemistry: 40, nlm: 55 },
  communication: { core: 90, financial: 70, mycology: 60, research: 65, dao: 75, communication: 100, data: 75, infrastructure: 70, simulation: 55, security: 75, integration: 85, device: 70, chemistry: 50, nlm: 80 },
  data: { core: 95, financial: 90, mycology: 85, research: 90, dao: 80, communication: 75, data: 100, infrastructure: 90, simulation: 80, security: 85, integration: 90, device: 80, chemistry: 85, nlm: 90 },
  infrastructure: { core: 95, financial: 60, mycology: 50, research: 55, dao: 60, communication: 70, data: 90, infrastructure: 100, simulation: 65, security: 85, integration: 80, device: 85, chemistry: 45, nlm: 60 },
  simulation: { core: 70, financial: 40, mycology: 80, research: 75, dao: 45, communication: 55, data: 80, infrastructure: 65, simulation: 100, security: 50, integration: 60, device: 70, chemistry: 75, nlm: 70 },
  security: { core: 90, financial: 85, mycology: 50, research: 50, dao: 80, communication: 75, data: 85, infrastructure: 85, simulation: 50, security: 100, integration: 80, device: 75, chemistry: 45, nlm: 65 },
  integration: { core: 85, financial: 75, mycology: 70, research: 70, dao: 70, communication: 85, data: 90, infrastructure: 80, simulation: 60, security: 80, integration: 100, device: 80, chemistry: 65, nlm: 75 },
  device: { core: 75, financial: 30, mycology: 80, research: 60, dao: 35, communication: 70, data: 80, infrastructure: 85, simulation: 70, security: 75, integration: 80, device: 100, chemistry: 70, nlm: 60 },
  chemistry: { core: 75, financial: 30, mycology: 90, research: 85, dao: 40, communication: 50, data: 85, infrastructure: 45, simulation: 75, security: 45, integration: 65, device: 70, chemistry: 100, nlm: 80 },
  nlm: { core: 85, financial: 50, mycology: 80, research: 90, dao: 55, communication: 80, data: 90, infrastructure: 60, simulation: 70, security: 65, integration: 75, device: 60, chemistry: 80, nlm: 100 },
}

/**
 * Generate quick insights about a potential connection
 */
function generateQuickInsights(
  source: TopologyNode,
  target: TopologyNode,
  existingConnections: TopologyConnection[]
): string[] {
  const insights: string[] = []
  
  // Category compatibility
  if (source.category === target.category) {
    insights.push(`Same category (${source.category}) - High compatibility expected`)
  } else {
    const score = COMPATIBILITY_MATRIX[source.category]?.[target.category] || 50
    if (score >= 80) {
      insights.push(`Categories ${source.category}↔${target.category} work well together`)
    } else if (score < 50) {
      insights.push(`Categories ${source.category}↔${target.category} may require adapter`)
    }
  }
  
  // Type-specific insights
  if (source.type === "database" || target.type === "database") {
    insights.push("Database connection - Consider query caching and connection pooling")
  }
  
  if (source.type === "orchestrator" || target.type === "orchestrator") {
    insights.push("Orchestrator link - Enables full control and task routing")
  }
  
  if (source.category === "security" || target.category === "security") {
    insights.push("Security agent involved - Encrypted channel recommended")
  }
  
  if (source.type === "device" || target.type === "device") {
    insights.push("Device connection - Consider latency and offline handling")
  }
  
  // Check for existing indirect path
  const hasIndirectPath = existingConnections.some(c => 
    (c.sourceId === source.id && c.targetId !== target.id) ||
    (c.targetId === source.id && c.sourceId !== target.id)
  )
  if (hasIndirectPath) {
    insights.push("Existing connections may provide indirect path")
  }
  
  // Traffic considerations
  if (source.metrics.messagesPerSecond > 50 || target.metrics.messagesPerSecond > 50) {
    insights.push("High-traffic node - Consider message queuing")
  }
  
  return insights
}

/**
 * Determine recommended connection type
 */
function recommendConnectionType(
  source: TopologyNode,
  target: TopologyNode
): ConnectionType {
  // Database targets get query connections
  if (target.type === "database") return "query"
  
  // Orchestrator connections are commands
  if (target.type === "orchestrator" || source.type === "orchestrator") return "command"
  
  // Workflow connections are typically message-based
  if (source.type === "workflow" || target.type === "workflow") return "message"
  
  // Device connections often stream data
  if (source.type === "device" || target.type === "device") return "stream"
  
  // Same category usually means data sharing
  if (source.category === target.category) return "data"
  
  // Default to message
  return "message"
}

/**
 * Detect cascade connections that should be created
 */
function detectCascadeConnections(
  source: TopologyNode,
  target: TopologyNode,
  allNodes: TopologyNode[],
  existingConnections: TopologyConnection[]
): CascadeConnection[] {
  const cascades: CascadeConnection[] = []
  
  // If connecting to orchestrator, ensure memory system access
  if (target.id === "myca-orchestrator" || target.type === "orchestrator") {
    const hasMemory = existingConnections.some(c => 
      (c.sourceId === source.id || c.targetId === source.id) &&
      (c.sourceId === "memory-manager" || c.targetId === "memory-manager")
    )
    if (!hasMemory) {
      cascades.push({
        from: source.id,
        fromName: source.shortName,
        to: "memory-manager",
        toName: "Memory",
        type: "message",
        reason: "Orchestrator-connected agents need memory access for state management",
        autoCreate: true,
      })
    }
  }
  
  // If connecting data agents, ensure logger access
  if (source.category === "data" || target.category === "data") {
    const hasLogger = existingConnections.some(c => 
      (c.sourceId === source.id || c.targetId === source.id) &&
      (c.sourceId === "logger" || c.targetId === "logger")
    )
    if (!hasLogger) {
      cascades.push({
        from: source.id,
        fromName: source.shortName,
        to: "logger",
        toName: "Logger",
        type: "message",
        reason: "Data operations should be logged for audit trail",
        autoCreate: true,
      })
    }
  }
  
  // If connecting security agents, ensure health monitor access
  if (source.category === "security" || target.category === "security") {
    const hasHealth = existingConnections.some(c => 
      (c.sourceId === source.id || c.targetId === source.id) &&
      (c.sourceId === "health-monitor" || c.targetId === "health-monitor")
    )
    if (!hasHealth) {
      cascades.push({
        from: source.id,
        fromName: source.shortName,
        to: "health-monitor",
        toName: "Health",
        type: "message",
        reason: "Security agents should report to health monitoring",
        autoCreate: true,
      })
    }
  }
  
  return cascades
}

/**
 * Assess risks of the connection
 */
function assessRisks(
  source: TopologyNode,
  target: TopologyNode
): RiskAssessment {
  const factors: string[] = []
  const mitigations: string[] = []
  let level: "low" | "medium" | "high" = "low"
  
  // Check error rates
  if (source.metrics.errorRate > 0.05 || target.metrics.errorRate > 0.05) {
    factors.push("One or both nodes have elevated error rates")
    mitigations.push("Monitor connection for error propagation")
    level = "medium"
  }
  
  // Check status
  if (source.status !== "active" || target.status !== "active") {
    factors.push("Not all nodes are in active status")
    mitigations.push("Ensure nodes are stable before connecting")
    level = "medium"
  }
  
  // Cross-category security considerations
  if (source.category === "security" && target.category !== "security") {
    factors.push("Security agent connecting to non-security node")
    mitigations.push("Ensure proper access controls on shared data")
    level = level === "low" ? "medium" : level
  }
  
  // High traffic concerns
  if (source.metrics.messagesPerSecond > 100 && target.metrics.messagesPerSecond > 100) {
    factors.push("Both nodes have high message throughput")
    mitigations.push("Consider implementing backpressure mechanism")
    level = "medium"
  }
  
  // Database connections
  if (target.type === "database") {
    factors.push("Direct database connection increases coupling")
    mitigations.push("Use connection pooling and query optimization")
    if (source.metrics.messagesPerSecond > 50) {
      level = "high"
      mitigations.push("Consider read replicas or caching layer")
    }
  }
  
  if (factors.length === 0) {
    factors.push("No significant risk factors identified")
  }
  
  return { level, factors, mitigations }
}

/**
 * Generate a connection proposal using NLQ analysis
 */
export function generateConnectionProposal(
  source: TopologyNode,
  target: TopologyNode,
  allNodes: TopologyNode[],
  existingConnections: TopologyConnection[]
): ConnectionProposal {
  // Calculate compatibility score
  const compatibilityScore = COMPATIBILITY_MATRIX[source.category]?.[target.category] || 50
  
  // Determine compatibility level
  let compatibility: ConnectionProposal["compatibility"]
  if (compatibilityScore >= 80) compatibility = "high"
  else if (compatibilityScore >= 60) compatibility = "medium"
  else if (compatibilityScore >= 40) compatibility = "low"
  else compatibility = "requires-adapter"
  
  // Generate insights
  const quickInsights = generateQuickInsights(source, target, existingConnections)
  
  // Detect cascade connections
  const cascadeConnections = detectCascadeConnections(source, target, allNodes, existingConnections)
  
  // Assess risks
  const riskAssessment = assessRisks(source, target)
  
  // Estimate effort
  let estimatedEffort: ConnectionProposal["estimatedEffort"] = "minimal"
  if (compatibility === "requires-adapter") estimatedEffort = "significant"
  else if (cascadeConnections.length > 2) estimatedEffort = "moderate"
  else if (riskAssessment.level === "high") estimatedEffort = "moderate"
  
  // Basic implementation plan (NLQ version - no LLM)
  const recommendedType = recommendConnectionType(source, target)
  const implementationPlan: ImplementationPlan = {
    summary: `Create ${recommendedType} connection from ${source.shortName} to ${target.shortName}`,
    codeChanges: [
      {
        file: `agents/${source.id}/config.yaml`,
        description: `Add ${target.shortName} as ${recommendedType} target`,
        changeType: "modify",
      },
      {
        file: `agents/${target.id}/handlers.py`,
        description: `Add handler for ${source.shortName} ${recommendedType}s`,
        changeType: "modify",
      },
    ],
    newIntegrations: compatibility === "requires-adapter" 
      ? [`${source.category}-to-${target.category}-adapter`] 
      : [],
    configurationChanges: [
      `Register connection in topology registry`,
      `Configure ${recommendedType} channel parameters`,
    ],
    testingNotes: [
      `Test bidirectional communication`,
      `Verify message format compatibility`,
      `Load test with expected traffic volume`,
    ],
  }
  
  return {
    compatibility,
    compatibilityScore,
    quickInsights,
    implementationPlan,
    cascadeConnections,
    riskAssessment,
    estimatedEffort,
  }
}

/**
 * Get LLM-enhanced implementation plan (calls external API)
 */
export async function getLLMImplementationPlan(
  source: TopologyNode,
  target: TopologyNode,
  baseProposal: ConnectionProposal
): Promise<ImplementationPlan | null> {
  try {
    const response = await fetch("/api/myca/connection-proposal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: {
          id: source.id,
          name: source.name,
          type: source.type,
          category: source.category,
        },
        target: {
          id: target.id,
          name: target.name,
          type: target.type,
          category: target.category,
        },
        baseProposal,
      }),
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.implementationPlan || null
    }
  } catch (error) {
    console.error("Failed to get LLM implementation plan:", error)
  }
  
  return null
}
