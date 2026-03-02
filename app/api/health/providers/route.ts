/**
 * LLM Provider Health Check
 *
 * Tests each configured LLM provider with a minimal request and reports status.
 * Returns which providers are working, their response times, and which keys are configured.
 */

import { NextRequest, NextResponse } from "next/server"
import { healthCheckLimiter, getClientIP, rateLimitResponse } from "@/lib/rate-limiter"

export const dynamic = "force-dynamic"
export const maxDuration = 30

interface ProviderStatus {
  name: string
  configured: boolean
  status: "working" | "error" | "unconfigured" | "timeout"
  responseTime?: number
  model?: string
  error?: string
}

const TEST_MESSAGE = "Say hello in one sentence."

async function testGroq(): Promise<ProviderStatus> {
  const key = process.env.GROQ_API_KEY
  if (!key) return { name: "Groq", configured: false, status: "unconfigured" }

  const start = Date.now()
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 20,
        messages: [{ role: "user", content: TEST_MESSAGE }],
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (res.ok) {
      return { name: "Groq", configured: true, status: "working", responseTime: Date.now() - start, model: "llama-3.3-70b-versatile" }
    }
    const err = await res.text().catch(() => "")
    return { name: "Groq", configured: true, status: "error", responseTime: Date.now() - start, error: `${res.status}: ${err.slice(0, 100)}` }
  } catch (e) {
    return { name: "Groq", configured: true, status: "timeout", responseTime: Date.now() - start, error: e instanceof Error ? e.message : "timeout" }
  }
}

async function testAnthropic(): Promise<ProviderStatus> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || key.trim().length < 10) {
    return { name: "Anthropic Claude", configured: false, status: "unconfigured", error: `Key length: ${key?.length ?? 'undefined'}` }
  }

  const start = Date.now()
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 20,
        messages: [{ role: "user", content: TEST_MESSAGE }],
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (res.ok) {
      return { name: "Anthropic Claude", configured: true, status: "working", responseTime: Date.now() - start, model: "claude-sonnet-4-20250514" }
    }
    const err = await res.text().catch(() => "")
    return { name: "Anthropic Claude", configured: true, status: "error", responseTime: Date.now() - start, error: `${res.status}: ${err.slice(0, 150)}` }
  } catch (e) {
    return { name: "Anthropic Claude", configured: true, status: "timeout", responseTime: Date.now() - start, error: e instanceof Error ? e.message : "timeout" }
  }
}

async function testOpenAI(): Promise<ProviderStatus> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { name: "OpenAI", configured: false, status: "unconfigured" }

  const start = Date.now()
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 20,
        messages: [{ role: "user", content: TEST_MESSAGE }],
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (res.ok) {
      return { name: "OpenAI", configured: true, status: "working", responseTime: Date.now() - start, model: "gpt-4o" }
    }
    const err = await res.text().catch(() => "")
    return { name: "OpenAI", configured: true, status: "error", responseTime: Date.now() - start, error: `${res.status}: ${err.slice(0, 100)}` }
  } catch (e) {
    return { name: "OpenAI", configured: true, status: "timeout", responseTime: Date.now() - start, error: e instanceof Error ? e.message : "timeout" }
  }
}

async function testGemini(): Promise<ProviderStatus> {
  const key = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY
  if (!key) return { name: "Google Gemini", configured: false, status: "unconfigured" }

  const start = Date.now()
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: TEST_MESSAGE }] }],
          generationConfig: { maxOutputTokens: 20 },
        }),
        signal: AbortSignal.timeout(10000),
      }
    )
    if (res.ok) {
      return { name: "Google Gemini", configured: true, status: "working", responseTime: Date.now() - start, model: "gemini-2.0-flash" }
    }
    const err = await res.text().catch(() => "")
    return { name: "Google Gemini", configured: true, status: "error", responseTime: Date.now() - start, error: `${res.status}: ${err.slice(0, 100)}` }
  } catch (e) {
    return { name: "Google Gemini", configured: true, status: "timeout", responseTime: Date.now() - start, error: e instanceof Error ? e.message : "timeout" }
  }
}

async function testGrok(): Promise<ProviderStatus> {
  const key = process.env.XAI_API_KEY
  if (!key) return { name: "xAI Grok", configured: false, status: "unconfigured" }

  const start = Date.now()
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "grok-3",
        max_tokens: 20,
        messages: [{ role: "user", content: TEST_MESSAGE }],
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (res.ok) {
      return { name: "xAI Grok", configured: true, status: "working", responseTime: Date.now() - start, model: "grok-3" }
    }
    const err = await res.text().catch(() => "")
    return { name: "xAI Grok", configured: true, status: "error", responseTime: Date.now() - start, error: `${res.status}: ${err.slice(0, 100)}` }
  } catch (e) {
    return { name: "xAI Grok", configured: true, status: "timeout", responseTime: Date.now() - start, error: e instanceof Error ? e.message : "timeout" }
  }
}

async function testOllama(): Promise<ProviderStatus> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
  const model = process.env.OLLAMA_MODEL || "llama3.3"

  const start = Date.now()
  try {
    const healthCheck = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    }).catch(() => null)
    if (!healthCheck?.ok) {
      return { name: "Ollama (Local)", configured: true, status: "error", error: "Ollama not running. Install: https://ollama.com/download" }
    }

    // Check if the model is available
    const tagsData = await healthCheck.json()
    const models = tagsData.models?.map((m: { name: string }) => m.name) || []
    const hasModel = models.some((m: string) => m.startsWith(model))

    if (!hasModel) {
      return {
        name: "Ollama (Local)",
        configured: true,
        status: "error",
        error: `Model '${model}' not found. Run: ollama pull ${model}. Available: ${models.join(", ") || "none"}`,
      }
    }

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: TEST_MESSAGE }],
        stream: false,
        options: { num_predict: 20 },
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (res.ok) {
      return { name: "Ollama (Local)", configured: true, status: "working", responseTime: Date.now() - start, model }
    }
    return { name: "Ollama (Local)", configured: true, status: "error", responseTime: Date.now() - start, error: `${res.status}` }
  } catch (e) {
    return { name: "Ollama (Local)", configured: true, status: "timeout", responseTime: Date.now() - start, error: e instanceof Error ? e.message : "timeout" }
  }
}

async function testMAS(): Promise<ProviderStatus> {
  const url = process.env.MAS_ORCHESTRATOR_URL || "http://192.168.0.188:8001"
  const start = Date.now()
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      return { name: "MAS Orchestrator (VM 188)", configured: true, status: "working", responseTime: Date.now() - start }
    }
    return { name: "MAS Orchestrator (VM 188)", configured: true, status: "error", error: `${res.status}` }
  } catch {
    return { name: "MAS Orchestrator (VM 188)", configured: true, status: "error", error: "Unreachable" }
  }
}

export async function GET(request: NextRequest) {
  // Rate limit: 3 requests/min per IP, 30/hour global (each call hits ALL providers)
  const ip = getClientIP(request)
  const rl = healthCheckLimiter.check(ip)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!, rl.reason)

  const start = Date.now()

  // Run all provider tests in parallel
  const results = await Promise.all([
    testMAS(),
    testGroq(),
    testOllama(),
    testAnthropic(),
    testOpenAI(),
    testGemini(),
    testGrok(),
  ])

  const working = results.filter(r => r.status === "working").length
  const total = results.length

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    totalTime: Date.now() - start,
    summary: {
      working,
      total,
      status: working >= 2 ? "operational" : working >= 1 ? "degraded" : "critical",
    },
    providers: results,
  })
}
