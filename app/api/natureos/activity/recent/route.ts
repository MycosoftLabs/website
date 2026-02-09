import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Fetch real activity from n8n, MAS, and system
async function fetchRealActivity(limit: number) {
  const n8nUrl = process.env.N8N_WEBHOOK_URL || "http://localhost:5678"
  const masUrl = process.env.MAS_API_URL || "http://localhost:8001"
  
  const activities: any[] = []

  try {
    // Fetch n8n workflow executions
    try {
      const n8nRes = await fetch(`${n8nUrl}/api/v1/executions?limit=${limit}`, {
        signal: AbortSignal.timeout(3000),
      })
      
      if (n8nRes.ok) {
        const data = await n8nRes.json()
        const executions = data.data || []
        
        for (const exec of executions) {
          activities.push({
            id: exec.id,
            type: exec.mode === "manual" ? "deployment" : "network_event",
            message: `Workflow execution ${exec.status}: ${exec.workflowId}`,
            timestamp: exec.startedAt || new Date().toISOString(),
            status: exec.status === "success" ? "success" : exec.status === "error" ? "error" : "warning",
            metadata: {
              workflowId: exec.workflowId,
              mode: exec.mode,
            },
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch n8n executions:", error)
    }

    // Fetch MAS agent activity
    try {
      const agentsRes = await fetch(`${masUrl}/agents/registry/`, {
        signal: AbortSignal.timeout(2000),
      })
      
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json()
        const activeAgents = agentsData.agents?.filter((a: any) => a.active) || []
        
        if (activeAgents.length > 0) {
          activities.push({
            id: `agents-${Date.now()}`,
            type: "ai_training",
            message: `${activeAgents.length} agents active in MAS`,
            timestamp: new Date().toISOString(),
            status: "success",
            metadata: {
              activeCount: activeAgents.length,
            },
          })
        }
      }
    } catch (error) {
      // MAS not available
    }

    // Check MycoBrain activity
    try {
      const mycoRes = await fetch(`${process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8765"}/devices`, {
        signal: AbortSignal.timeout(2000),
      })
      
      if (mycoRes.ok) {
        const mycoData = await mycoRes.json()
        const connectedDevices = (mycoData.devices || []).filter((d: any) => d.connected)
        
        if (connectedDevices.length > 0) {
          activities.push({
            id: `mycobrain-${Date.now()}`,
            type: "network_event",
            message: `${connectedDevices.length} MycoBrain device(s) connected`,
            timestamp: new Date().toISOString(),
            status: "success",
            metadata: {
              deviceCount: connectedDevices.length,
            },
          })
        }
      }
    } catch (error) {
      // MycoBrain service not available
    }

    // Sort by timestamp (newest first) and limit
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  } catch (error) {
    console.error("Failed to fetch activity:", error)
    // Return empty array - no mock fallback
    return []
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get("limit") || "10", 10)
  
  const activities = await fetchRealActivity(limit)
  return NextResponse.json(activities)
}
