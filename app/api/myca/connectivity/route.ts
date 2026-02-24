/**
 * MYCA Connectivity Diagnostic API
 * Quick checks for MAS VM, orchestrator, and LLM fallbacks.
 * Date: February 24, 2026
 */

import { NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"
const HAS_ANTHROPIC = !!process.env.ANTHROPIC_API_KEY
const HAS_OPENAI = !!process.env.OPENAI_API_KEY
const HAS_GROQ = !!process.env.GROQ_API_KEY
const HAS_GOOGLE = !!process.env.GOOGLE_AI_API_KEY
const HAS_XAI = !!process.env.XAI_API_KEY

export const dynamic = "force-dynamic"
export const maxDuration = 15

export async function GET() {
  const results: Record<string, { ok: boolean; ms?: number; error?: string }> = {}
  const start = Date.now()

  try {
    const masStart = Date.now()
    try {
      const r = await fetch(`${MAS_API_URL}/health`, {
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      })
      results.mas = {
        ok: r.ok,
        ms: Date.now() - masStart,
        error: r.ok ? undefined : `HTTP ${r.status}`,
      }
    } catch (e) {
      results.mas = {
        ok: false,
        ms: Date.now() - masStart,
        error: e instanceof Error ? e.message : String(e),
      }
    }

    results.llm_keys = {
      ok: HAS_ANTHROPIC || HAS_OPENAI || HAS_GROQ || HAS_GOOGLE || HAS_XAI,
      error: !(HAS_ANTHROPIC || HAS_OPENAI || HAS_GROQ || HAS_GOOGLE || HAS_XAI)
        ? "No LLM API keys in .env.local (ANTHROPIC, OPENAI, GROQ, etc.)"
        : undefined,
    }

    const chatReady = results.mas.ok || results.llm_keys.ok
    return NextResponse.json({
      ok: chatReady,
      mas: results.mas,
      llm_keys: results.llm_keys,
      summary: chatReady
        ? results.mas.ok
          ? "MAS online — chat uses Consciousness API"
          : "MAS offline — chat uses LLM fallback (Claude/Groq/etc.)"
        : "Chat unavailable — MAS offline and no LLM keys",
      total_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        total_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
