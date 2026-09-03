import { NextRequest, NextResponse } from "next/server"

import { requireOwner } from "@/lib/auth/api-auth"
import { createAdminClient } from "@/lib/supabase/server"
import type {
  AlphaMetric,
  AlphaObservabilitySnapshot,
  AlphaServiceProbe,
} from "@/lib/fusarium/alpha-observability/contracts"

export const dynamic = "force-dynamic"

const PROBE_TIMEOUT_MS = 3_000

function boundedHours(request: NextRequest): number {
  const raw = Number(request.nextUrl.searchParams.get("hours") ?? "24")
  return Number.isFinite(raw) ? Math.min(168, Math.max(1, Math.trunc(raw))) : 24
}

async function probe(
  id: AlphaServiceProbe["id"],
  label: string,
  url: string,
  source: string,
  synthetic = false,
  cookie?: string,
): Promise<AlphaServiceProbe> {
  const startedAt = performance.now()
  const observedAt = new Date().toISOString()
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: cookie ? { Accept: "application/json", Cookie: cookie } : { Accept: "application/json" },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    return {
      id,
      label,
      state: synthetic ? "synthetic" : response.ok ? "measured" : "unavailable",
      latencyMs: Math.round(performance.now() - startedAt),
      observedAt,
      source,
      detail: synthetic
        ? `HTTP ${response.status}; this endpoint synthesizes presence and is not a broker subscription.`
        : response.ok
          ? `HTTP ${response.status} returned during this bounded read.`
          : `HTTP ${response.status}; no successful exchange is claimed.`,
    }
  } catch {
    return {
      id,
      label,
      state: synthetic ? "synthetic" : "unavailable",
      latencyMs: Math.round(performance.now() - startedAt),
      observedAt,
      source,
      detail: synthetic
        ? "The synthesized presence adapter was unreachable; no MQTT broker exchange was attempted."
        : "The bounded read did not complete; no successful exchange is claimed.",
    }
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const windowHours = boundedHours(request)
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1_000).toISOString()
  const generatedAt = new Date().toISOString()
  const warnings: string[] = []
  const metrics: AlphaMetric[] = []

  try {
    const admin = await createAdminClient()
    const [{ data: apiRows, error: apiError }, { data: sessionRows, error: sessionError }] = await Promise.all([
      admin
        .from("api_usage_log")
        .select("endpoint,status_code,response_time_ms,called_at")
        .gte("called_at", cutoff)
        .order("called_at", { ascending: false })
        .limit(2_000),
      admin
        .from("agent_sessions")
        .select("tokens_used,cost_cents,created_at")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(2_000),
    ])

    if (apiError) warnings.push("API traffic ledger is unavailable.")
    const validApiRows = apiError ? [] : (apiRows ?? [])
    const responseTimes = validApiRows
      .map((row) => Number(row.response_time_ms))
      .filter((value) => Number.isFinite(value) && value >= 0)
    const errorCount = validApiRows.filter((row) => Number(row.status_code) >= 400).length
    metrics.push(
      {
        id: "api-calls",
        label: "API calls",
        value: apiError ? null : validApiRows.length,
        unit: "requests",
        state: apiError ? "unavailable" : "measured",
        observedAt: validApiRows[0]?.called_at ?? generatedAt,
        source: "api_usage_log",
        detail: `Bounded to the latest 2,000 records in the ${windowHours}-hour window.`,
      },
      {
        id: "api-errors",
        label: "API errors",
        value: apiError ? null : errorCount,
        unit: "responses",
        state: apiError ? "unavailable" : "measured",
        observedAt: validApiRows[0]?.called_at ?? generatedAt,
        source: "api_usage_log",
        detail: "Responses with status 400 or higher.",
      },
      {
        id: "api-latency",
        label: "Mean API latency",
        value: apiError || responseTimes.length === 0
          ? null
          : Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length),
        unit: "ms",
        state: apiError || responseTimes.length === 0 ? "unavailable" : "measured",
        observedAt: validApiRows[0]?.called_at ?? generatedAt,
        source: "api_usage_log",
        detail: "Arithmetic mean of recorded request durations; missing durations are excluded.",
      },
    )

    if (sessionError) warnings.push("AI token and cost ledger is unavailable.")
    const validSessions = sessionError ? [] : (sessionRows ?? [])
    const tokens = validSessions.reduce((sum, row) => sum + Math.max(0, Number(row.tokens_used) || 0), 0)
    const costCents = validSessions.reduce((sum, row) => sum + Math.max(0, Number(row.cost_cents) || 0), 0)
    metrics.push(
      {
        id: "ai-tokens",
        label: "AI tokens",
        value: sessionError ? null : tokens,
        unit: "tokens",
        state: sessionError ? "unavailable" : "measured",
        observedAt: validSessions[0]?.created_at ?? generatedAt,
        source: "agent_sessions",
        detail: "Recorded session tokens only; providers without ledger writes are not estimated.",
      },
      {
        id: "ai-cost",
        label: "AI cost",
        value: sessionError ? null : costCents,
        unit: "cents",
        state: sessionError ? "unavailable" : "measured",
        observedAt: validSessions[0]?.created_at ?? generatedAt,
        source: "agent_sessions",
        detail: "Recorded session cost only; AWS credits and unmetered local inference are not inferred.",
      },
    )
  } catch {
    warnings.push("The operational metering database could not be queried.")
    for (const [id, label, unit, source] of [
      ["api-calls", "API calls", "requests", "api_usage_log"],
      ["api-errors", "API errors", "responses", "api_usage_log"],
      ["api-latency", "Mean API latency", "ms", "api_usage_log"],
      ["ai-tokens", "AI tokens", "tokens", "agent_sessions"],
      ["ai-cost", "AI cost", "cents", "agent_sessions"],
    ] as const) {
      metrics.push({ id, label, value: null, unit, state: "unavailable", observedAt: null, source, detail: "No database measurement is available." })
    }
  }

  const origin = request.nextUrl.origin
  const cookie = request.headers.get("cookie") ?? undefined
  const services = await Promise.all([
    probe("mindex", "MINDEX", `${origin}/api/mindex/health`, "MINDEX health route", false, cookie),
    probe("mas", "MYCA multi-agent system", `${origin}/api/mas/health`, "MAS health route", false, cookie),
    probe("mqtt", "Device presence", `${origin}/api/devices/mqtt/presence`, "MAS plus operator HTTP adapter", true, cookie),
  ])
  warnings.push("Device presence is currently synthesized from MAS and operator HTTP; it is not live MQTT broker evidence.")
  if (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION) {
    warnings.push("AWS configuration is present, but no benchmark run or credit consumption was performed by this read-only snapshot.")
  } else {
    warnings.push("AWS inference benchmarking is not configured in this process.")
  }

  const snapshot: AlphaObservabilitySnapshot = {
    schemaVersion: "fusarium.alpha-observability.v1",
    generatedAt,
    windowHours,
    metrics,
    services,
    warnings,
  }
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } })
}
