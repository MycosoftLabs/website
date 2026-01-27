import { NextRequest, NextResponse } from "next/server"

/**
 * Individual Agent Management API
 * GET/POST/DELETE for specific agents
 * Date: January 27, 2026
 */

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

// GET - Get specific agent details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agentId = params.id
  
  try {
    const response = await fetch(`${MAS_API_URL}/agents/${agentId}`, {
      signal: AbortSignal.timeout(5000)
    })
    
    if (response.ok) {
      const agent = await response.json()
      return NextResponse.json({
        success: true,
        agent,
        timestamp: new Date().toISOString()
      })
    } else if (response.status === 404) {
      return NextResponse.json({
        success: false,
        error: `Agent ${agentId} not found`
      }, { status: 404 })
    } else {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch agent: ${response.statusText}`
      }, { status: response.status })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch agent"
    }, { status: 500 })
  }
}

// POST - Agent actions (start, stop, restart)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agentId = params.id
  
  try {
    const body = await request.json()
    const { action } = body
    
    if (!action || !["start", "stop", "restart"].includes(action)) {
      return NextResponse.json({
        error: "Valid action required: start, stop, or restart"
      }, { status: 400 })
    }
    
    const response = await fetch(`${MAS_API_URL}/agents/${agentId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    })
    
    if (response.ok) {
      const result = await response.json()
      return NextResponse.json({
        success: true,
        action,
        agent_id: agentId,
        result,
        message: `Agent ${agentId} ${action} successful`
      })
    } else {
      const error = await response.text()
      return NextResponse.json({
        success: false,
        error: `Failed to ${action} agent: ${error}`
      }, { status: response.status })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Agent action failed"
    }, { status: 500 })
  }
}

// DELETE - Stop and remove agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agentId = params.id
  
  try {
    const response = await fetch(`${MAS_API_URL}/agents/${agentId}`, {
      method: "DELETE"
    })
    
    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: `Agent ${agentId} stopped and removed`
      })
    } else {
      const error = await response.text()
      return NextResponse.json({
        success: false,
        error: `Failed to remove agent: ${error}`
      }, { status: response.status })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove agent"
    }, { status: 500 })
  }
}
