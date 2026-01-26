/**
 * MYCA Natural Language Query API
 * Unified endpoint for all NLQ queries across the system
 * 
 * Created: Jan 26, 2026
 */

import { NextRequest, NextResponse } from "next/server"
import { 
  MycaNLQEngine, 
  type NLQQuery, 
  type NLQResponse, 
  type NLQSource,
  type DataSourceType 
} from "@/lib/services/myca-nlq"
import {
  AgentsConnector,
  MindexConnector,
  SupabaseConnector,
  QdrantConnector,
  N8nConnector,
  MemoryConnector,
  TelemetryConnector,
  DocumentsConnector,
  type ConnectorResult,
} from "@/lib/services/nlq-connectors"

// Initialize connectors
const connectors = {
  agents: new AgentsConnector(),
  mindex: new MindexConnector(),
  supabase: new SupabaseConnector(),
  qdrant: new QdrantConnector(),
  n8n: new N8nConnector(),
  memory: new MemoryConnector(),
  telemetry: new TelemetryConnector(),
  documents: new DocumentsConnector(),
}

// ElevenLabs for TTS
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const MYCA_VOICE_ID = process.env.MYCA_VOICE_ID || "aEO01A4wXwd1O8GPgGlF" // Arabella

/**
 * POST /api/myca/nlq
 * Process natural language query
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body: NLQQuery = await request.json()
    const { text, context, options } = body
    
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Query text is required" },
        { status: 400 }
      )
    }
    
    // Initialize NLQ engine
    const engine = MycaNLQEngine.getInstance()
    
    // Step 1: Parse intent
    const intent = engine.parseIntent(text)
    
    // Step 2: Route to data sources
    const dataSources = engine.routeQuery(intent, options)
    
    // Step 3: Execute queries in parallel
    const queryPromises: Promise<ConnectorResult>[] = []
    const sources: NLQSource[] = []
    
    for (const source of dataSources) {
      const connector = connectors[source as keyof typeof connectors]
      if (connector) {
        queryPromises.push(
          connector.query(intent, {
            maxResults: options?.maxResults || 20,
            timeout: 10000,
            filters: context?.filters,
          })
        )
      }
    }
    
    // Wait for all queries
    const results = await Promise.allSettled(queryPromises)
    
    // Collect results and sources
    const allData: unknown[] = []
    results.forEach((result, index) => {
      const sourceType = dataSources[index]
      const connector = connectors[sourceType as keyof typeof connectors]
      
      if (result.status === "fulfilled" && result.value.success) {
        allData.push(...result.value.data)
        sources.push({
          name: connector?.name || sourceType,
          type: sourceType,
          confidence: intent.confidence,
          queryTime: result.value.queryTime,
        })
      }
    })
    
    // Step 4: Format response
    const processingTime = Date.now() - startTime
    const response = engine.formatResponse(allData, intent, sources, processingTime)
    
    // Step 5: Generate audio if requested
    if (options?.wantAudio && ELEVENLABS_API_KEY && response.text) {
      try {
        const audioBase64 = await generateTTS(response.text)
        if (audioBase64) {
          response.audio_base64 = audioBase64
        }
      } catch (error) {
        console.error("TTS generation failed:", error)
      }
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error("NLQ API error:", error)
    return NextResponse.json(
      { 
        type: "error",
        text: "I encountered an error processing your query. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error",
      } as NLQResponse,
      { status: 500 }
    )
  }
}

/**
 * GET /api/myca/nlq
 * Get NLQ suggestions and status
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  
  if (action === "suggestions") {
    const context = searchParams.get("context")
    return NextResponse.json({
      suggestions: getSuggestions(context),
    })
  }
  
  if (action === "status") {
    const status = await getConnectorStatus()
    return NextResponse.json(status)
  }
  
  // Default: return capabilities
  return NextResponse.json({
    version: "1.0.0",
    capabilities: [
      "query_agents",
      "query_data", 
      "query_documents",
      "query_memory",
      "query_telemetry",
      "query_analytics",
      "action_agent",
      "action_workflow",
      "action_spawn",
      "action_connection",
      "navigation",
      "help",
    ],
    dataSources: Object.keys(connectors),
    voiceEnabled: !!ELEVENLABS_API_KEY,
  })
}

/**
 * Generate TTS audio using ElevenLabs
 */
async function generateTTS(text: string): Promise<string | null> {
  if (!ELEVENLABS_API_KEY) return null
  
  try {
    // Clean text for TTS
    const cleanText = text
      .replace(/\*\*/g, "") // Remove markdown bold
      .replace(/\*/g, "")
      .replace(/`/g, "")
      .replace(/#{1,6}\s*/g, "") // Remove headers
      .replace(/\n{2,}/g, ". ") // Convert double newlines to periods
      .slice(0, 1000) // Limit length
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${MYCA_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    )
    
    if (response.ok) {
      const audioBuffer = await response.arrayBuffer()
      const base64 = Buffer.from(audioBuffer).toString("base64")
      return base64
    }
  } catch (error) {
    console.error("ElevenLabs TTS error:", error)
  }
  
  return null
}

/**
 * Get context-aware suggestions
 */
function getSuggestions(context: string | null): string[] {
  const baseSuggestions = [
    "Show all agents",
    "System health status",
    "What can you do?",
  ]
  
  if (context?.includes("topology")) {
    return [
      "Show agents with high CPU",
      "Find offline agents",
      "Spawn a security agent",
      "List financial agents",
      ...baseSuggestions,
    ]
  }
  
  if (context?.includes("dashboard")) {
    return [
      "Show system metrics",
      "List active workflows",
      "Recent errors",
      ...baseSuggestions,
    ]
  }
  
  if (context?.includes("device") || context?.includes("mycobrain")) {
    return [
      "Show temperature readings",
      "Get humidity data",
      "Device status",
      ...baseSuggestions,
    ]
  }
  
  return [
    "Show all active agents",
    "What's the system health?",
    "Find documentation about MINDEX",
    "List n8n workflows",
    "Go to topology view",
    ...baseSuggestions,
  ]
}

/**
 * Check connector availability status
 */
async function getConnectorStatus(): Promise<Record<string, boolean>> {
  const status: Record<string, boolean> = {}
  
  const checks = Object.entries(connectors).map(async ([name, connector]) => {
    try {
      const available = await connector.isAvailable()
      status[name] = available
    } catch {
      status[name] = false
    }
  })
  
  await Promise.allSettled(checks)
  return status
}
