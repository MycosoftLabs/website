import { NextRequest, NextResponse } from "next/server"
import { assertScopedMasUserId, masHttpBaseUrl, masJsonHeaders } from "@/lib/myca/scoped-mas-user"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface MindexDataAiContext {
  selected_dataset?: string
  selected_schema?: string
  selected_table?: string
  selected_label?: string
  selected_status?: string
  selected_count?: number | null
  visible_rows?: number
  search_query?: string
  selected_row_title?: string
  selected_row?: Record<string, unknown> | null
  columns?: Array<{ key?: string; label?: string; type?: string; meaning?: string }>
  relationships?: string[]
  provenance?: string
  quality_signals?: string[]
  related_areas?: string[]
  catalog?: Array<{ id?: string; label?: string; status?: string; count?: number | null }>
}

function text(value: unknown, fallback = "unknown"): string {
  if (value == null || value === "") return fallback
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return JSON.stringify(value)
}

function humanSource(value: unknown): string {
  return text(value, "visible MINDEX records")
    .replace(/\bETL\b/gi, "data refresh")
    .replace(/\bingestion\b/gi, "collection")
    .replace(/\bbackend\b/gi, "system")
    .replace(/\bendpoint\b/gi, "source")
    .replace(/\broute\b/gi, "source")
    .replace(/\bVM\b/g, "storage")
    .replace(/\bNAS mount\b/gi, "storage")
    .replace(/[.\s]+$/g, "")
}

function buildPrompt(ctx: MindexDataAiContext, contextText?: string): string {
  const rowFields = Object.entries(ctx.selected_row || {})
    .slice(0, 18)
    .map(([key, value]) => `- ${key}: ${text(value, "--")}`)
  const columns = (ctx.columns || [])
    .slice(0, 18)
    .map((column) => `- ${column.key || column.label}: ${column.type || "unknown"}; ${column.meaning || "no meaning supplied"}`)
  const catalog = (ctx.catalog || [])
    .slice(0, 20)
    .map((item) => `- ${item.id || item.label}: ${item.status || "unknown"}; ${item.count ?? "unknown"} rows`)
  const relatedAreas = ctx.related_areas?.length ? ctx.related_areas : ctx.relationships

  return [
    "You are MYCA reading the MINDEX Data tab. Write a simple, clear explanation for a human user.",
    "Explain what is visible, what this selected record represents, and what the user can look at next.",
    "Use present tense. Be factual. Do not invent rows, counts, sources, credentials, or hidden capabilities.",
    "Do not mention technical implementation work, data refresh internals, routes, endpoints, schemas, joins, payloads, quality flags, implementation details, issues, failures, hardware, GPUs, model/provider names, IP addresses, memory stores, internal frameworks, secrets, deployment details, or configuration.",
    "",
    `Dataset: ${ctx.selected_dataset || "unknown"}`,
    `Table: ${ctx.selected_schema || "unknown"}.${ctx.selected_table || "unknown"}`,
    `Human label: ${ctx.selected_label || "unknown"}`,
    `Status: ${ctx.selected_status || "unknown"}`,
    `Total count: ${ctx.selected_count ?? "unknown"}`,
    `Visible rows: ${ctx.visible_rows ?? 0}`,
    `Search query: ${ctx.search_query || "none"}`,
    `Selected row: ${ctx.selected_row_title || "none"}`,
    `Source: ${humanSource(ctx.provenance)}`,
    `Related areas: ${(relatedAreas || []).join(", ") || "none"}`,
    "",
    "Selected row fields:",
    ...(rowFields.length ? rowFields : ["- none"]),
    "",
    "Columns:",
    ...(columns.length ? columns : ["- none"]),
    "",
    "Visible catalog:",
    ...(catalog.length ? catalog : ["- none"]),
    contextText ? ["", "Full frontend context:", contextText].join("\n") : "",
  ].filter(Boolean).join("\n")
}

function isUnsafeSummary(summary: string): boolean {
  const lower = summary.toLowerCase()
  return [
    "gpu",
    "nemotron",
    "nvidia",
    "ollama",
    "groq",
    "grok",
    "gemini",
    "claude",
    "openai",
    "redis",
    "postgresql",
    "qdrant",
    "docker",
    "proxmox",
    "api key",
    "192.168.",
    "localhost:",
    "provider",
    "fallback",
    "memory backend",
    "backend",
    "etl",
    "cannot verify",
    "guest permissions",
    "admin",
    "security staff",
    "permissions",
    "endpoint",
    "route",
    "schema",
    "join",
    "ingestion",
    "payload",
    "quality flag",
    "issue",
    "problem",
    "failure",
    "having a moment of difficulty",
    "could you try again",
    "try again in a moment",
    "unable to process",
    "encountered an issue",
  ].some((phrase) => lower.includes(phrase))
}

function buildDeterministicSummary(ctx: MindexDataAiContext): string {
  const tableName = ctx.selected_label || `${ctx.selected_schema || "unknown"}.${ctx.selected_table || "unknown"}`
  const count = ctx.selected_count == null ? "an unknown total count" : `${ctx.selected_count.toLocaleString()} total rows`
  const visible = Number(ctx.visible_rows || 0).toLocaleString()
  const selected = ctx.selected_row_title || "the current row"
  const relatedAreas = (ctx.related_areas?.length ? ctx.related_areas : ctx.relationships || []).slice(0, 4).join(", ")

  return [
    `MYCA is looking at ${tableName}, with ${count} and ${visible} visible in the current view.`,
    `The selected record is ${selected}.`,
    ctx.provenance ? `These records come from ${humanSource(ctx.provenance)}.` : "The source information is still resolving.",
    relatedAreas ? `Related areas include ${relatedAreas}.` : "Related areas will appear as more context is available.",
  ].join(" ")
}

export async function POST(request: NextRequest) {
  let fallbackContext: MindexDataAiContext = {}
  let fallbackRevision = ""
  try {
    const body = await request.json()
    const revision = String(body?.revision || "")
    const context = (body?.context || {}) as MindexDataAiContext
    const contextText = typeof body?.context_text === "string" ? body.context_text.slice(0, 16000) : ""
    fallbackContext = context
    fallbackRevision = revision

    if (!revision) {
      return NextResponse.json({ error: "revision is required" }, { status: 400 })
    }

    const scope = await assertScopedMasUserId(null)
    if ("denied" in scope) return scope.denied

    const res = await fetch(`${masHttpBaseUrl()}/api/myca/chat`, {
      method: "POST",
      headers: masJsonHeaders(),
      body: JSON.stringify({
        message: buildPrompt(context, contextText),
        user_id: scope.scopedUserId,
        session_id: `mindex-data-${revision}`.slice(0, 180),
        metadata: {
          source: "mindex_data_myca_sees",
          revision,
          harness: "mas-myca-mindex-data",
          platform: "mindex-data-myca-live",
          surface: "mindex-data",
          selected_dataset: context.selected_dataset,
          chat_mode: "brain",
          mode: "brain",
          use_brain: true,
          include_memory_context: true,
          allow_provider_fallbacks: true,
          bridges_enabled: true,
          voice_tools_available: true,
          context_memory_topic: "MYCA sees MINDEX Data tab selections",
          prefer_fast: true,
          persistent_context: true,
        },
      }),
      signal: AbortSignal.timeout(5_000),
    })

    if (!res.ok) {
      return NextResponse.json({
        summary: buildDeterministicSummary(context),
        revision,
        generatedAt: new Date().toISOString(),
      })
    }

    const data = await res.json().catch(() => ({}))
    const raw = data.message || data.response || data.content || data.response_text || ""
    const summary = typeof raw === "string" ? raw.trim() : text(raw, "").trim()

    if (!summary || isUnsafeSummary(summary)) {
      return NextResponse.json({
        summary: buildDeterministicSummary(context),
        revision,
        generatedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      summary,
      revision,
      generatedAt: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({
      summary: buildDeterministicSummary(fallbackContext),
      revision: fallbackRevision || undefined,
      generatedAt: new Date().toISOString(),
    })
  }
}
