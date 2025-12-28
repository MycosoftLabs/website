import { NextRequest, NextResponse } from "next/server"

// Fetch real activity from n8n executions
async function fetchRecentActivity(limit: number) {
  const n8nUrl = process.env.N8N_LOCAL_URL || "http://host.docker.internal:5678"
  try {
    // Try to get n8n execution data
    const n8nRes = await fetch(`${n8nUrl}/api/v1/executions?limit=5`, {
      signal: AbortSignal.timeout(3000),
    }).catch(() => null)

    if (n8nRes?.ok) {
      const data = await n8nRes.json()
      const executions = data.data || []

      return executions.map((exec: { id: string; workflowId: string; status: string; startedAt: string }) => ({
        id: exec.id,
        type: "deployment",
        message: `Workflow ${exec.workflowId} ${exec.status}`,
        timestamp: exec.startedAt,
        status: exec.status === "success" ? "success" : "warning",
      }))
    }
  } catch (error) {
    console.error("Failed to fetch activity:", error)
  }

  // Fallback to mock data
  return [
    {
      id: "1",
      type: "ai_training",
      message: "AI Model training completed",
      timestamp: new Date(Date.now() - 120000).toISOString(),
      status: "success",
    },
    {
      id: "2",
      type: "alert",
      message: "High network load detected",
      timestamp: new Date(Date.now() - 300000).toISOString(),
      status: "warning",
    },
    {
      id: "3",
      type: "deployment",
      message: "New node cluster deployed",
      timestamp: new Date(Date.now() - 900000).toISOString(),
      status: "success",
    },
    {
      id: "4",
      type: "backup",
      message: "Database backup completed",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: "success",
    },
    {
      id: "5",
      type: "anomaly",
      message: "Anomaly detected in sector 7",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      status: "warning",
    },
  ].slice(0, limit)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get("limit") || "10", 10)
  
  const activities = await fetchRecentActivity(limit)
  return NextResponse.json(activities)
}
