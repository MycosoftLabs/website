/**
 * MYCA Conversations API Route
 *
 * Fetches real conversation history from the MAS system
 */

import { type NextRequest, NextResponse } from "next/server"

// MAS API base URL (use Docker internal URL when in container)
const MAS_API_URL = process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MYCA_MAS_API_BASE_URL || "http://host.docker.internal:8040"

interface Conversation {
  id: string
  userId: string
  agentId: string
  agentName: string
  topic: string
  startedAt: string
  lastMessageAt: string
  messageCount: number
  status: "active" | "completed" | "archived"
  preview?: string
}

interface Message {
  id: string
  conversationId: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  agentId?: string
  metadata?: Record<string, unknown>
}

// Fetch conversations from MAS backend
async function fetchMASConversations(userId?: string, limit: number = 50): Promise<Conversation[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) })
    if (userId) params.set("user_id", userId)
    
    const response = await fetch(`${MAS_API_URL}/api/conversations?${params}`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.conversations || data.data || []
    }
  } catch (error) {
    console.log("MAS conversations endpoint not available, trying runs endpoint")
  }
  
  return []
}

// Fetch agent runs and convert to conversation format
async function fetchAgentRunsAsConversations(limit: number = 50): Promise<Conversation[]> {
  try {
    const response = await fetch(`${MAS_API_URL}/api/runs?page_size=${limit}`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
    
    if (response.ok) {
      const data = await response.json()
      const runs = data.data || data.runs || []
      
      return runs.map((run: any) => ({
        id: run.id || run.run_id,
        userId: run.user_id || "system",
        agentId: run.agent_id || run.agentId,
        agentName: run.agent_name || getAgentName(run.agent_id || run.agentId),
        topic: run.input?.message?.substring(0, 100) || run.task || run.description || "Agent Task",
        startedAt: run.started_at || run.created_at || new Date().toISOString(),
        lastMessageAt: run.completed_at || run.updated_at || run.started_at || new Date().toISOString(),
        messageCount: run.steps?.length || run.message_count || 1,
        status: mapRunStatus(run.status),
        preview: run.output?.message || run.result || undefined,
      }))
    }
  } catch (error) {
    console.log("MAS runs endpoint not available")
  }
  
  return []
}

// Try to get chat threads from the MAS database directly
async function fetchChatThreads(limit: number = 50): Promise<Conversation[]> {
  try {
    const response = await fetch(`${MAS_API_URL}/api/threads?page_size=${limit}`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
    
    if (response.ok) {
      const data = await response.json()
      const threads = data.threads || data.data || []
      
      return threads.map((thread: any) => ({
        id: thread.id || thread.thread_id,
        userId: thread.user_id || "anonymous",
        agentId: thread.agent_id || "myca-core",
        agentName: thread.agent_name || "MYCA Core",
        topic: thread.title || thread.topic || thread.first_message?.substring(0, 100) || "Conversation",
        startedAt: thread.created_at || new Date().toISOString(),
        lastMessageAt: thread.updated_at || thread.last_message_at || new Date().toISOString(),
        messageCount: thread.message_count || thread.messages?.length || 0,
        status: thread.status || "completed",
        preview: thread.last_message || thread.preview,
      }))
    }
  } catch (error) {
    console.log("MAS threads endpoint not available")
  }
  
  return []
}

function getAgentName(agentId: string): string {
  const agentNames: Record<string, string> = {
    "myca-core": "MYCA Core",
    "myca-researcher": "Research Agent",
    "myca-vision": "Vision Agent",
    "myca-voice": "Voice Agent",
    "myca-data": "Data Agent",
    "myca-network": "Network Agent",
    "myca-security": "Security Agent",
    "myca-workflow": "Workflow Agent",
  }
  return agentNames[agentId] || agentId || "MYCA"
}

function mapRunStatus(status: string): "active" | "completed" | "archived" {
  if (status === "running" || status === "pending" || status === "in_progress") return "active"
  if (status === "completed" || status === "success" || status === "finished") return "completed"
  return "archived"
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  
  if (diffSec < 60) return "Just now"
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`
  return date.toLocaleDateString()
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get("userId") || searchParams.get("user_id") || undefined
  const limit = parseInt(searchParams.get("limit") || "50")
  
  try {
    // Try multiple endpoints to get conversation data
    const [masConversations, agentRuns, chatThreads] = await Promise.all([
      fetchMASConversations(userId, limit),
      fetchAgentRunsAsConversations(limit),
      fetchChatThreads(limit),
    ])
    
    // Combine all sources and deduplicate
    const allConversations = [...masConversations, ...agentRuns, ...chatThreads]
    
    // Deduplicate by ID
    const uniqueConversations = Array.from(
      new Map(allConversations.map(c => [c.id, c])).values()
    )
    
    // Sort by most recent
    uniqueConversations.sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    )
    
    // Format for display
    const formattedConversations = uniqueConversations.slice(0, limit).map(conv => ({
      ...conv,
      timeAgo: formatTimeAgo(conv.lastMessageAt),
    }))
    
    // If no real data, indicate that
    const hasRealData = formattedConversations.length > 0
    
    return NextResponse.json({
      conversations: formattedConversations,
      total: formattedConversations.length,
      hasRealData,
      sources: ["MAS", "AgentRuns", "ChatThreads"],
      context: {
        user_id: userId || "anonymous",
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json({
      conversations: [],
      total: 0,
      hasRealData: false,
      error: "Failed to fetch conversations",
      timestamp: new Date().toISOString(),
    })
  }
}

// Get messages for a specific conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, user_id, session_id } = body
    
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 })
    }
    
    // Try to fetch messages from MAS
    const response = await fetch(`${MAS_API_URL}/api/conversations/${conversationId}/messages`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        messages: data.messages || data.data || [],
        conversationId,
      })
    }
    
    // Fallback: try run logs
    const logsResponse = await fetch(`${MAS_API_URL}/api/runs/${conversationId}/logs`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
    
    if (logsResponse.ok) {
      const logs = await logsResponse.json()
      return NextResponse.json({
        messages: logs.logs || logs.data || [],
        conversationId,
      })
    }
    
    return NextResponse.json({
      messages: [],
      conversationId,
      context: {
        user_id: user_id || "anonymous",
        session_id,
      },
      error: "Conversation not found",
    }, { status: 404 })
  } catch (error) {
    console.error("Error fetching conversation messages:", error)
    return NextResponse.json({ 
      error: "Failed to fetch messages" 
    }, { status: 500 })
  }
}
