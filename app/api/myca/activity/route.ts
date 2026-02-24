/**
 * MYCA Activity Stream API - Feb 10, 2026
 *
 * Aggregates consciousness status, recent conversations, and agent activity
 * for the Search Activity Stream panel.
 */

import { type NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

interface ActivityEvent {
  id: string
  type: "consciousness" | "memory" | "agent" | "conversation" | "intention"
  title: string
  summary?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

async function fetchConsciousnessStatus(): Promise<ActivityEvent | null> {
  try {
    const res = await fetch(`${MAS_API_URL}/api/myca/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      id: `consciousness-${Date.now()}`,
      type: "consciousness",
      title: data.is_conscious ? "MYCA is awake" : "MYCA is dormant",
      summary: data.state || (data.is_conscious ? "Ready to assist" : "Standing by"),
      timestamp: new Date().toISOString(),
      metadata: { ...data },
    }
  } catch {
    return null
  }
}

async function fetchAgentRuns(limit = 15): Promise<ActivityEvent[]> {
  try {
    const res = await fetch(`${MAS_API_URL}/api/runs?page_size=${limit}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const runs = data.data || data.runs || []
    return runs.slice(0, limit).map((r: { id: string; agent_id?: string; agent_name?: string; status?: string; created_at?: string; input?: { message?: string } }) => ({
      id: `run-${r.id}`,
      type: "agent" as const,
      title: r.agent_name || r.agent_id || "Agent",
      summary: r.input?.message?.slice(0, 80) || r.status || "Task completed",
      timestamp: r.created_at || new Date().toISOString(),
      metadata: { runId: r.id, status: r.status },
    }))
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50)

  try {
    const [consciousness, runs] = await Promise.all([
      fetchConsciousnessStatus(),
      fetchAgentRuns(limit),
    ])

    const events: ActivityEvent[] = []
    if (consciousness) events.push(consciousness)
    events.push(...runs)

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const limited = events.slice(0, limit)

    return NextResponse.json({
      events: limited,
      total: limited.length,
      sources: ["consciousness", "agent_runs"],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("MYCA activity stream error:", error)
    return NextResponse.json(
      {
        events: [],
        total: 0,
        error: error instanceof Error ? error.message : "Failed to fetch activity",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  }
}
