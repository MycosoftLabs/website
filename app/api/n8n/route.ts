import { NextRequest, NextResponse } from "next/server"

/**
 * n8n Workflow API Integration for MYCA
 * 
 * This route provides:
 * - Webhook triggers for n8n workflows
 * - Voice chat processing via n8n
 * - Workflow execution status
 * 
 * Date: January 27, 2026
 */

const N8N_URL = process.env.N8N_URL || "http://192.168.0.188:5678"
const N8N_API_KEY = process.env.N8N_API_KEY || ""
const N8N_USERNAME = process.env.N8N_USERNAME || "admin"
const N8N_PASSWORD = process.env.N8N_PASSWORD || "Mushroom1!"

// Get n8n auth header
function getAuthHeader(): string {
  return `Basic ${Buffer.from(`${N8N_USERNAME}:${N8N_PASSWORD}`).toString("base64")}`
}

// Trigger a webhook workflow
async function triggerWebhook(webhookPath: string, data: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${N8N_URL}/webhook/${webhookPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": getAuthHeader()
    },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error(`Webhook trigger failed: ${response.statusText}`)
  }
  
  return response.json()
}

// Get workflow list
async function getWorkflows(): Promise<unknown[]> {
  try {
    const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
      headers: {
        "Authorization": getAuthHeader(),
        "Accept": "application/json"
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.data || []
    }
  } catch (error) {
    console.error("n8n workflows error:", error)
  }
  
  return []
}

// Execute workflow by ID
async function executeWorkflow(workflowId: string, data: Record<string, unknown> = {}): Promise<unknown> {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/${workflowId}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": getAuthHeader()
    },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error(`Workflow execution failed: ${response.statusText}`)
  }
  
  return response.json()
}

// GET - Health check and workflow list
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  
  try {
    // Check n8n connectivity
    const healthResponse = await fetch(`${N8N_URL}/healthz`, {
      signal: AbortSignal.timeout(5000),
      headers: { "Authorization": getAuthHeader() }
    })
    
    const isHealthy = healthResponse.ok
    
    if (action === "workflows") {
      const workflows = await getWorkflows()
      return NextResponse.json({ workflows, healthy: isHealthy })
    }
    
    return NextResponse.json({
      status: isHealthy ? "connected" : "unavailable",
      url: N8N_URL,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: "offline",
      error: "n8n is not reachable",
      url: N8N_URL
    }, { status: 503 })
  }
}

// POST - Execute workflows and webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, webhookPath, workflowId, data } = body
    
    switch (action) {
      case "webhook":
        // Trigger a webhook
        if (!webhookPath) {
          return NextResponse.json({ error: "Webhook path is required" }, { status: 400 })
        }
        const webhookResult = await triggerWebhook(webhookPath, data || {})
        return NextResponse.json({ result: webhookResult, type: "webhook" })
        
      case "execute":
        // Execute a workflow by ID
        if (!workflowId) {
          return NextResponse.json({ error: "Workflow ID is required" }, { status: 400 })
        }
        const execResult = await executeWorkflow(workflowId, data || {})
        return NextResponse.json({ result: execResult, type: "execution" })
        
      case "myca-chat":
        // MYCA voice/chat processing workflow
        const chatData = {
          message: data?.message || "",
          session_id: data?.session_id || `session-${Date.now()}`,
          context: data?.context || {},
          timestamp: new Date().toISOString(),
          source: "topology-dashboard"
        }
        
        try {
          // Try to trigger MYCA chat webhook
          const chatResult = await triggerWebhook("myca-chat", chatData)
          return NextResponse.json({ result: chatResult, type: "myca-chat" })
        } catch (error) {
          // Fallback: workflow not yet configured
          return NextResponse.json({
            result: {
              response: "n8n MYCA workflow not yet configured. Please set up the myca-chat webhook in n8n.",
              status: "workflow_not_found"
            },
            type: "myca-chat"
          })
        }
        
      case "myca-voice":
        // MYCA voice-to-text and text-to-speech workflow
        const voiceData = {
          audio_base64: data?.audio_base64,
          text: data?.text,
          action: data?.voice_action || "tts", // "stt" or "tts"
          voice_id: data?.voice_id || "aEO01A4wXwd1O8GPgGlF", // Arabella
          timestamp: new Date().toISOString()
        }
        
        try {
          const voiceResult = await triggerWebhook("myca-voice", voiceData)
          return NextResponse.json({ result: voiceResult, type: "myca-voice" })
        } catch (error) {
          return NextResponse.json({
            result: {
              response: "n8n MYCA voice workflow not yet configured.",
              status: "workflow_not_found"
            },
            type: "myca-voice"
          })
        }
        
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("n8n API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "n8n operation failed" },
      { status: 500 }
    )
  }
}
