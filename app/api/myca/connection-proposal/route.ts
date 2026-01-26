/**
 * Connection Proposal API - LLM-powered implementation plans
 * Created: Jan 26, 2026
 * 
 * Provides AI-generated implementation details for agent connections
 * Uses OpenAI/Claude for deep analysis when available, falls back to pattern-based suggestions
 */

import { NextRequest, NextResponse } from "next/server"
import type { ConnectionProposal, ImplementationPlan } from "@/lib/services/connection-proposer"

interface ConnectionProposalRequest {
  source: {
    id: string
    name: string
    type: string
    category: string
  }
  target: {
    id: string
    name: string
    type: string
    category: string
  }
  baseProposal: ConnectionProposal
}

interface LLMResponse {
  implementationPlan: ImplementationPlan
  confidence: number
  model: string
}

// LLM-based implementation plan generator
async function generateLLMPlan(
  source: ConnectionProposalRequest["source"],
  target: ConnectionProposalRequest["target"],
  baseProposal: ConnectionProposal
): Promise<LLMResponse | null> {
  const openaiKey = process.env.OPENAI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  
  const systemPrompt = `You are an expert software architect specializing in multi-agent systems.
Generate detailed implementation plans for connecting agents in a distributed system.
Focus on practical, actionable steps with specific code changes and configurations.`
  
  const userPrompt = `Generate an implementation plan to connect these two agents:

SOURCE AGENT:
- ID: ${source.id}
- Name: ${source.name}
- Type: ${source.type}
- Category: ${source.category}

TARGET AGENT:
- ID: ${target.id}
- Name: ${target.name}
- Type: ${target.type}
- Category: ${target.category}

COMPATIBILITY: ${baseProposal.compatibility} (${baseProposal.compatibilityScore}%)
EXISTING INSIGHTS:
${baseProposal.quickInsights.map(i => `- ${i}`).join("\n")}

Please provide:
1. A brief summary of what this connection enables
2. Required code changes (files, descriptions, and brief code snippets where helpful)
3. Any new integrations or adapters needed
4. Configuration changes required
5. Testing recommendations

Format your response as JSON matching this schema:
{
  "summary": "string",
  "codeChanges": [{"file": "string", "description": "string", "snippet": "string?", "changeType": "add|modify|remove"}],
  "newIntegrations": ["string"],
  "configurationChanges": ["string"],
  "testingNotes": ["string"]
}`

  // Try OpenAI first
  if (openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (content) {
          const plan = JSON.parse(content) as ImplementationPlan
          return {
            implementationPlan: plan,
            confidence: 0.9,
            model: "gpt-4-turbo-preview",
          }
        }
      }
    } catch (error) {
      console.error("OpenAI API error:", error)
    }
  }
  
  // Try Anthropic as fallback
  if (anthropicKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-opus-20240229",
          max_tokens: 2000,
          system: systemPrompt,
          messages: [
            { role: "user", content: userPrompt },
          ],
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        const content = data.content?.[0]?.text
        if (content) {
          // Extract JSON from Claude's response
          const jsonMatch = content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const plan = JSON.parse(jsonMatch[0]) as ImplementationPlan
            return {
              implementationPlan: plan,
              confidence: 0.85,
              model: "claude-3-opus",
            }
          }
        }
      }
    } catch (error) {
      console.error("Anthropic API error:", error)
    }
  }
  
  // Fallback to pattern-based generation
  return generatePatternBasedPlan(source, target, baseProposal)
}

// Pattern-based fallback when no LLM is available
function generatePatternBasedPlan(
  source: ConnectionProposalRequest["source"],
  target: ConnectionProposalRequest["target"],
  baseProposal: ConnectionProposal
): LLMResponse {
  const codeChanges: ImplementationPlan["codeChanges"] = []
  const newIntegrations: string[] = []
  const configurationChanges: string[] = []
  const testingNotes: string[] = []
  
  // Determine connection type based on target
  let connectionType = "message"
  if (target.type === "database") connectionType = "query"
  else if (target.type === "orchestrator") connectionType = "command"
  else if (target.type === "device") connectionType = "stream"
  
  // Generate code changes based on source type
  if (source.type === "agent") {
    codeChanges.push({
      file: `agents/${source.id}/connections.yaml`,
      description: `Add ${target.name} as ${connectionType} target`,
      changeType: "modify",
      snippet: `targets:
  - id: ${target.id}
    type: ${connectionType}
    priority: 5
    retry_policy: exponential`,
    })
  }
  
  // Target-side handlers
  if (target.type === "agent" || target.type === "orchestrator") {
    codeChanges.push({
      file: `agents/${target.id}/handlers/${source.id}_handler.py`,
      description: `Create handler for ${source.name} ${connectionType}s`,
      changeType: "add",
      snippet: `async def handle_${source.id.replace(/-/g, "_")}_${connectionType}(payload):
    # Process incoming ${connectionType} from ${source.name}
    logger.info(f"Received {connectionType} from ${source.id}")
    return await process_payload(payload)`,
    })
  }
  
  // Check if adapter is needed
  if (baseProposal.compatibility === "requires-adapter") {
    newIntegrations.push(`${source.category}-to-${target.category}-adapter`)
    codeChanges.push({
      file: `lib/adapters/${source.category}_${target.category}_adapter.py`,
      description: `Adapter for translating between ${source.category} and ${target.category} formats`,
      changeType: "add",
    })
  }
  
  // Configuration changes
  configurationChanges.push(`Register connection in topology registry: ${source.id} → ${target.id}`)
  configurationChanges.push(`Configure ${connectionType} channel parameters (timeout, retry, buffer)`)
  
  if (source.category === "security" || target.category === "security") {
    configurationChanges.push("Enable TLS encryption for this connection")
    configurationChanges.push("Configure authentication tokens in vault")
  }
  
  // Testing notes
  testingNotes.push(`Test bidirectional communication between ${source.name} and ${target.name}`)
  testingNotes.push("Verify message format compatibility with schema validation")
  testingNotes.push("Load test with expected traffic volume (use k6 or locust)")
  testingNotes.push("Test failure scenarios: network partition, timeout, malformed messages")
  
  if (target.type === "database") {
    testingNotes.push("Test query performance and connection pool exhaustion")
  }
  
  return {
    implementationPlan: {
      summary: `Create ${connectionType} connection from ${source.name} to ${target.name}. This enables ${source.name} to ${
        connectionType === "query" ? "query data from" :
        connectionType === "command" ? "send commands to" :
        connectionType === "stream" ? "stream data to" :
        "send messages to"
      } ${target.name}.`,
      codeChanges,
      newIntegrations,
      configurationChanges,
      testingNotes,
    },
    confidence: 0.6,
    model: "pattern-based",
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ConnectionProposalRequest = await request.json()
    
    if (!body.source || !body.target) {
      return NextResponse.json(
        { error: "Missing source or target node information" },
        { status: 400 }
      )
    }
    
    // Generate implementation plan
    const result = await generateLLMPlan(body.source, body.target, body.baseProposal)
    
    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate implementation plan" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      implementationPlan: result.implementationPlan,
      confidence: result.confidence,
      model: result.model,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Connection proposal API error:", error)
    return NextResponse.json(
      { error: "Failed to generate proposal", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    service: "Connection Proposal API",
    version: "1.0.0",
    capabilities: {
      llmProviders: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
      },
      patternBased: true,
    },
    description: "Generates AI-powered implementation plans for agent connections",
  })
}
