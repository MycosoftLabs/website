import { NextRequest, NextResponse } from "next/server"

/**
 * Real Agent Management API
 * Returns actual running agents from the MAS orchestrator
 * Date: January 27, 2026
 */

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

interface AgentInfo {
  agent_id: string
  status: string
  container_id?: string
  started_at?: string
  last_heartbeat?: string
  tasks_completed?: number
  tasks_failed?: number
  cpu_usage?: number
  memory_usage?: number
  error_message?: string
}

interface AgentCategory {
  id: string
  name: string
  count: number
  active: number
}

// Agent category mapping
const CATEGORY_MAP: Record<string, string> = {
  "myca-orchestrator": "core",
  "memory-manager": "core",
  "task-router": "core",
  "health-monitor": "core",
  "message-broker": "core",
  "scheduler": "core",
  "config-manager": "core",
  "logger": "core",
  "dashboard": "core",
  "heartbeat": "core",
  "financial": "financial",
  "hr-manager": "corporate",
  "legal": "corporate",
  "etl-processor": "data",
  "mindex-agent": "data",
  "search-agent": "data",
  "network-monitor": "infrastructure",
  "docker-manager": "infrastructure",
  "proxmox-monitor": "infrastructure",
  "n8n-integration": "integration",
  "openai-connector": "integration",
  "test-agent-1": "test",
}

// Get real agents from MAS orchestrator
async function getRealAgents(): Promise<AgentInfo[]> {
  try {
    const response = await fetch(`${MAS_API_URL}/agents`, {
      signal: AbortSignal.timeout(5000)
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.agents || []
    }
  } catch (error) {
    console.error("Error fetching agents from MAS:", error)
  }
  
  return []
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

// Transform agents to topology format
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
    const category = CATEGORY_MAP[agent.agent_id] || "unknown"
    
    // Update category stats
    if (!categoryStats[category]) {
      categoryStats[category] = { count: 0, active: 0 }
    }
    categoryStats[category].count++
    if (agent.status === "active") {
      categoryStats[category].active++
    }
    
    return {
      id: agent.agent_id,
      name: agent.agent_id.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      status: agent.status,
      category,
      metrics: {
        cpu: agent.cpu_usage || 0,
        memory: agent.memory_usage || 0,
        tasks: agent.tasks_completed || 0
      }
    }
  })
  
  // Create category list
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

// GET - List all real agents
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format")
  
  try {
    const agents = await getRealAgents()
    
    if (format === "topology") {
      // Return in topology-friendly format
      const topology = transformAgentsForTopology(agents)
      return NextResponse.json({
        success: true,
        ...topology,
        timestamp: new Date().toISOString(),
        source: "real-orchestrator"
      })
    }
    
    return NextResponse.json({
      success: true,
      agents,
      count: agents.length,
      timestamp: new Date().toISOString(),
      source: "real-orchestrator"
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch agents",
      agents: [],
      count: 0
    }, { status: 500 })
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
