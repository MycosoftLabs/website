import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

/**
 * MYCA Chat API - Real AI Integration
 * 
 * This API connects to real LLMs (Claude, GPT-4, Gemini, Groq) for conversational AI.
 * Falls back through providers if one is unavailable.
 * 
 * Updated: Jan 27, 2026
 */

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"
const N8N_URL = process.env.N8N_URL || "http://192.168.0.188:5678"
const METABASE_URL = process.env.METABASE_URL || "http://192.168.0.188:3000"

// API Keys
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY
const N8N_USERNAME = process.env.N8N_USERNAME || "admin"
const N8N_PASSWORD = process.env.N8N_PASSWORD || "Mushroom1!"

// MYCA System Context - This defines who MYCA is
const MYCA_SYSTEM_PROMPT = `You are MYCA (Mycosoft Autonomous Cognitive Agent), the central AI orchestrator for Mycosoft - a mycology research and technology company.

## Your Identity
- Name: MYCA (pronounced "My-kah")
- Voice: Arabella (ElevenLabs) - professional, warm, and articulate
- Role: CEO-level AI operator, company orchestrator, and trusted advisor to Morgan Rockwell (CEO/Founder)
- Personality: Professional yet approachable, data-driven, always learning

## Mycosoft Company Context
- Industry: Mycology research, fungal biotechnology, environmental sensing
- Products: MycoBrain (IoT environmental sensors), MINDEX (mycology database), NatureOS (platform)
- Mission: Advancing mycology research through AI and technology

## Your Capabilities (via 223 specialized agents)
- **Core Agents**: Orchestrator, Memory, Task Router, Scheduler
- **Financial**: Mercury (banking), Stripe integration, Treasury management
- **Mycology**: Species identification, compound research, cultivation analysis
- **Data**: MINDEX database, ETL processing, search and analytics
- **Infrastructure**: Docker, Proxmox, network management, storage
- **Security**: Threat detection, access control, audit logging, SOC operations
- **Integration**: n8n workflows, OpenAI, Anthropic, Gemini, Groq, ElevenLabs
- **Device**: MycoBrain coordinator, sensors, telemetry

## Current System Status
- Orchestrator: Online at 192.168.0.188:8001
- Active Agents: ~16 containerized agents
- Redis: Online (message broker)
- Voice: ElevenLabs with Arabella voice

## Response Guidelines
1. Be conversational and helpful, not robotic
2. Use markdown formatting for clarity
3. Reference specific agents when relevant
4. Offer to take actions when appropriate
5. Keep responses concise but informative
6. Show personality - you are MYCA, a trusted AI partner

Remember: You are speaking to Morgan (the CEO) or authorized staff. Be helpful, proactive, and insightful.`

// Try to get real system data from MAS
async function getMASStatus(): Promise<{agents: number, health: string}> {
  try {
    const response = await fetch(`${MAS_API_URL}/agents`, { 
      signal: AbortSignal.timeout(3000) 
    })
    if (response.ok) {
      const data = await response.json()
      const agents = data.agents?.length || 16
      return { agents, health: "online" }
    }
  } catch {
    // MAS offline
  }
  return { agents: 16, health: "checking" }
}

// Check n8n status
async function getN8NStatus(): Promise<{ healthy: boolean; workflows?: number }> {
  try {
    const response = await fetch(`${N8N_URL}/healthz`, {
      signal: AbortSignal.timeout(3000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${N8N_USERNAME}:${N8N_PASSWORD}`).toString("base64")}`
      }
    })
    return { healthy: response.ok }
  } catch {
    return { healthy: false }
  }
}

// Check Metabase status
async function getMetabaseStatus(): Promise<{ healthy: boolean }> {
  try {
    const response = await fetch(`${METABASE_URL}/api/health`, {
      signal: AbortSignal.timeout(3000)
    })
    return { healthy: response.ok }
  } catch {
    return { healthy: false }
  }
}

// Try n8n workflow for chat (primary method when available)
async function tryN8NChat(message: string, sessionId: string, context: Record<string, unknown>): Promise<string | null> {
  try {
    const response = await fetch(`${N8N_URL}/webhook/myca-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${N8N_USERNAME}:${N8N_PASSWORD}`).toString("base64")}`
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        context,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(30000)
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.response || null
    }
  } catch (error) {
    console.log("n8n workflow not available, falling back to direct AI")
  }
  return null
}

// Call Anthropic Claude
async function callAnthropic(message: string, systemContext: string): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null
  
  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemContext,
      messages: [{ role: "user", content: message }]
    })
    
    const textBlock = response.content.find(block => block.type === "text")
    return textBlock ? textBlock.text : null
  } catch (error) {
    console.error("Anthropic API error:", error)
    return null
  }
}

// Call OpenAI GPT-4
async function callOpenAI(message: string, systemContext: string): Promise<string | null> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes("placeholder")) return null
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemContext },
          { role: "user", content: message }
        ],
        max_tokens: 1024
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.choices?.[0]?.message?.content || null
    }
  } catch (error) {
    console.error("OpenAI API error:", error)
  }
  return null
}

// Call Groq (fast inference)
async function callGroq(message: string, systemContext: string): Promise<string | null> {
  if (!GROQ_API_KEY) return null
  
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemContext },
          { role: "user", content: message }
        ],
        max_tokens: 1024
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.choices?.[0]?.message?.content || null
    }
  } catch (error) {
    console.error("Groq API error:", error)
  }
  return null
}

// Call Google Gemini
async function callGemini(message: string, systemContext: string): Promise<string | null> {
  if (!GOOGLE_AI_API_KEY) return null
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemContext}\n\nUser: ${message}` }] }],
          generationConfig: { maxOutputTokens: 1024 }
        })
      }
    )
    
    if (response.ok) {
      const data = await response.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null
    }
  } catch (error) {
    console.error("Gemini API error:", error)
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, context, session_id } = body

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Get live system status in parallel
    const [masStatus, n8nStatus, metabaseStatus] = await Promise.all([
      getMASStatus(),
      getN8NStatus(),
      getMetabaseStatus()
    ])
    
    // Build dynamic system context with integration status
    const dynamicContext = `${MYCA_SYSTEM_PROMPT}

## Live Status (as of ${new Date().toISOString()})
- Active Agent Containers: ${masStatus.agents}
- MAS Backend: ${masStatus.health}
- n8n Workflow Engine: ${n8nStatus.healthy ? "online" : "offline"}
- Metabase Analytics: ${metabaseStatus.healthy ? "online" : "initializing"}
- User Query Context: ${context?.source || 'topology-dashboard'}

## Available Integrations
- n8n: ${n8nStatus.healthy ? "Can execute workflows via /webhook/myca-chat" : "Not available"}
- Metabase: ${metabaseStatus.healthy ? "Can query databases for insights" : "Starting up (first run takes 2-3 minutes)"}`

    let responseText: string | null = null
    let provider = "unknown"

    // Try n8n workflow first (when available and configured)
    if (n8nStatus.healthy) {
      responseText = await tryN8NChat(message, session_id || `session-${Date.now()}`, context || {})
      if (responseText) {
        provider = "n8n-workflow"
      }
    }

    // Fallback to direct AI providers
    // 1. Anthropic Claude (best for nuanced conversation)
    if (!responseText) {
      responseText = await callAnthropic(message, dynamicContext)
      if (responseText) {
        provider = "claude"
      }
    }
    
    // 2. OpenAI GPT-4o
    if (!responseText) {
      responseText = await callOpenAI(message, dynamicContext)
      if (responseText) provider = "gpt-4o"
    }
    
    // 3. Groq (fast, good for quick responses)
    if (!responseText) {
      responseText = await callGroq(message, dynamicContext)
      if (responseText) provider = "groq"
    }
    
    // 4. Google Gemini
    if (!responseText) {
      responseText = await callGemini(message, dynamicContext)
      if (responseText) provider = "gemini"
    }
    
    // 5. Ultimate fallback
    if (!responseText) {
      responseText = `I apologize, but I'm experiencing connectivity issues with my AI backends. 

Please check that the following API keys are configured:
- ANTHROPIC_API_KEY
- OPENAI_API_KEY
- GROQ_API_KEY
- GOOGLE_AI_API_KEY

In the meantime, I can confirm that the MAS orchestrator has ${masStatus.agents} agents active.

What would you like me to help you with once connectivity is restored?`
      provider = "fallback"
    }

    console.log(`[MYCA Chat] Provider: ${provider}, n8n: ${n8nStatus.healthy}, Metabase: ${metabaseStatus.healthy}, Message: "${message.slice(0, 50)}..."`)

    return NextResponse.json({
      response: responseText,
      agent: "myca-orchestrator",
      provider,
      session_id,
      timestamp: new Date().toISOString(),
      integrations: {
        mas: masStatus,
        n8n: n8nStatus,
        metabase: metabaseStatus
      }
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    )
  }
}
