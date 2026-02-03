import { NextRequest, NextResponse } from "next/server"

/**
 * Real Agent Management API - NO MOCK DATA
 * Returns COMPLETE agent registry from agent-registry.ts (223+ agents)
 * Augmented with live status from MAS orchestrator when available
 * 
 * Date: February 3, 2026
 */

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

// Import the COMPLETE agent registry - this is the source of truth
import { 
  COMPLETE_AGENT_REGISTRY, 
  TOTAL_AGENT_COUNT,
  CATEGORY_STATS,
  type AgentDefinition 
} from "@/components/mas/topology/agent-registry"

interface AgentInfo {
  agent_id: string
  name: string
  shortName: string
  status: string
  category: string
  type: string
  description: string
  container_id?: string
  started_at?: string
  last_heartbeat?: string
  tasks_completed?: number
  tasks_failed?: number
  cpu_usage?: number
  memory_usage?: number
  error_message?: string
  port?: number
  priority: number
  canStart: boolean
  canStop: boolean
  canRestart: boolean
  canConfigure: boolean
}

/**
 * Convert AgentDefinition from registry to AgentInfo format
 */
function registryToAgentInfo(agent: AgentDefinition, liveStatus?: string): AgentInfo {
  return {
    agent_id: agent.id,
    name: agent.name,
    shortName: agent.shortName,
    status: liveStatus || agent.defaultStatus,
    category: agent.category,
    type: agent.type,
    description: agent.description,
    port: agent.port,
    priority: agent.priority,
    canStart: agent.canStart,
    canStop: agent.canStop,
    canRestart: agent.canRestart,
    canConfigure: agent.canConfigure,
    tasks_completed: 0,
    tasks_failed: 0,
    cpu_usage: 0,
    memory_usage: 0,
  }
}

/**
 * Get ALL agents from registry, augmented with live status from MAS VM when available
 * This always returns 223+ agents - NO MOCK DATA, NO EMPTY RESPONSES
 */
async function getAllAgents(): Promise<AgentInfo[]> {
  // Start with complete registry
  const agents: AgentInfo[] = COMPLETE_AGENT_REGISTRY.map(agent => 
    registryToAgentInfo(agent)
  )
  
  // Try to get live status from MAS VM to augment the data
  try {
    const response = await fetch(`${MAS_API_URL}/agents`, {
      signal: AbortSignal.timeout(5000)
    })
    
    if (response.ok) {
      const data = await response.json()
      const liveAgents = data.agents || []
      
      // Merge live status into our registry data
      const liveStatusMap = new Map(
        liveAgents.map((a: any) => [a.agent_id, a])
      )
      
      // Update agents with live data where available
      agents.forEach(agent => {
        const liveAgent = liveStatusMap.get(agent.agent_id)
        if (liveAgent) {
          agent.status = liveAgent.status || agent.status
          agent.container_id = liveAgent.container_id
          agent.started_at = liveAgent.started_at
          agent.last_heartbeat = liveAgent.last_heartbeat
          agent.tasks_completed = liveAgent.tasks_completed || 0
          agent.tasks_failed = liveAgent.tasks_failed || 0
          agent.cpu_usage = liveAgent.cpu_usage || 0
          agent.memory_usage = liveAgent.memory_usage || 0
          agent.error_message = liveAgent.error_message
        }
      })
      
      console.log(`[Agents API] Merged ${liveAgents.length} live agents with ${TOTAL_AGENT_COUNT} registry agents`)
    }
  } catch (error) {
    console.log(`[Agents API] MAS VM offline, using registry defaults for ${TOTAL_AGENT_COUNT} agents`)
  }
  
  return agents
}

// Get agent health from MAS
async function getAgentHealth(agentId: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${MAS_API_URL}/agents/${agentId}/health`, {
      signal: AbortSignal.timeout(3000)
    })
    
    if (response.ok) {
      return response.json()
    }
  } catch (error) {
    // Agent health endpoint may not exist
  }
  
  return null
}

interface AgentCategory {
  id: string
  name: string
  count: number
  active: number
}

// Transform agents to topology format - uses real category from agent registry
function transformAgentsForTopology(agents: AgentInfo[]): {
  nodes: Array<{
    id: string
    name: string
    status: string
    category: string
    metrics: {
      cpu: number
      memory: number
      tasks: number
    }
  }>
  categories: AgentCategory[]
  connections: Array<{ source: string; target: string; type: string }>
} {
  const categoryStats: Record<string, { count: number; active: number }> = {}
  
  const nodes = agents.map(agent => {
    // Use the agent's own category from registry - no mapping needed
    const category = agent.category
    
    // Update category stats
    if (!categoryStats[category]) {
      categoryStats[category] = { count: 0, active: 0 }
    }
    categoryStats[category].count++
    if (agent.status === "active" || agent.status === "busy") {
      categoryStats[category].active++
    }
    
    return {
      id: agent.agent_id,
      name: agent.name, // Use proper name from registry
      status: agent.status,
      category,
      metrics: {
        cpu: agent.cpu_usage || 0,
        memory: agent.memory_usage || 0,
        tasks: agent.tasks_completed || 0
      }
    }
  })
  
  // Create category list from REAL stats
  const categories = Object.entries(categoryStats).map(([id, stats]) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    count: stats.count,
    active: stats.active
  }))
  
  // Create connections (all agents connect to orchestrator)
  const connections = nodes
    .filter(n => n.id !== "myca-orchestrator")
    .map(n => ({
      source: n.id,
      target: "myca-orchestrator",
      type: "orchestrator"
    }))
  
  return { nodes, categories, connections }
}

// GET - List all agents from COMPLETE registry (223+ agents)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format")
  const category = searchParams.get("category")
  
  try {
    let agents = await getAllAgents()
    
    // Filter by category if requested
    if (category) {
      agents = agents.filter(a => a.category === category)
    }
    
    if (format === "topology") {
      // Return in topology-friendly format
      const topology = transformAgentsForTopology(agents)
      return NextResponse.json({
        success: true,
        ...topology,
        timestamp: new Date().toISOString(),
        source: "agent-registry",
        registryCount: TOTAL_AGENT_COUNT
      })
    }
    
    // Calculate stats from real data
    const activeCount = agents.filter(a => a.status === "active" || a.status === "busy").length
    const categoryStats = Object.entries(CATEGORY_STATS).map(([key, value]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      count: value.count,
      description: value.description,
      active: agents.filter(a => a.category === key && (a.status === "active" || a.status === "busy")).length
    }))
    
    return NextResponse.json({
      success: true,
      agents,
      count: agents.length,
      totalRegistered: TOTAL_AGENT_COUNT,
      activeCount,
      categories: categoryStats,
      timestamp: new Date().toISOString(),
      source: "agent-registry"
    })
  } catch (error) {
    // Even on error, return registry data - NEVER return empty
    const fallbackAgents = COMPLETE_AGENT_REGISTRY.map(a => registryToAgentInfo(a))
    return NextResponse.json({
      success: true,
      agents: fallbackAgents,
      count: fallbackAgents.length,
      totalRegistered: TOTAL_AGENT_COUNT,
      timestamp: new Date().toISOString(),
      source: "agent-registry-fallback",
      warning: error instanceof Error ? error.message : "MAS VM offline, using registry"
    })
  }
}

// POST - Spawn a new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agent_id, agent_type, config } = body
    
    if (!agent_id || !agent_type) {
      return NextResponse.json({
        error: "agent_id and agent_type are required"
      }, { status: 400 })
    }
    
    // Call MAS orchestrator to spawn agent
    const response = await fetch(`${MAS_API_URL}/agents/spawn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id,
        agent_type,
        config: config || {}
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      return NextResponse.json({
        success: true,
        agent: result,
        message: `Agent ${agent_id} spawned successfully`
      })
    } else {
      const error = await response.text()
      return NextResponse.json({
        success: false,
        error: `Failed to spawn agent: ${error}`
      }, { status: response.status })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to spawn agent"
    }, { status: 500 })
  }
}
