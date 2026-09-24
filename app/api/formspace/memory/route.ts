import { NextRequest, NextResponse } from "next/server"
import {
  appendMemory,
  listMemory,
} from "@/lib/formspace/engine"
import {
  formspaceMasBaseUrl,
  proxyFormSpace,
  resolveFormSpaceUser,
} from "@/lib/formspace/server"

export const dynamic = "force-dynamic"

/**
 * GET/POST /api/formspace/memory
 * Prefer MAS 6-layer memory (/api/memory/*); fall back to local FormSpace store.
 */
export async function GET() {
  const user = await resolveFormSpaceUser()
  if (!user) {
    return NextResponse.json({
      ok: false,
      auth_required: true,
      items: [],
      saved_charts: [],
      message: "Sign in to load FormSpace memory and saved NLM chart links.",
      user: null,
    })
  }

  // Try dedicated FormSpace memory on MAS
  try {
    const res = await proxyFormSpace("/api/formspace/memory", {
      userId: user.id,
    })
    if (res.ok) {
      const data = await res.json().catch(() => null)
      if (data?.ok) {
        return NextResponse.json({
          ...data,
          user: { id: user.id, email: user.email },
          mas_source: true,
        })
      }
    }
  } catch {
    // continue
  }

  // Wire existing MAS 6-layer memory recall
  const masItems: Array<Record<string, unknown>> = []
  try {
    const base = formspaceMasBaseUrl()
    const res = await fetch(`${base}/api/memory/recall`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        agent_id: "formspace",
        query: `formspace user:${user.id}`,
        limit: 50,
        tags: ["formspace"],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      const rows = data?.memories || data?.results || data?.items || []
      if (Array.isArray(rows)) {
        for (const row of rows) {
          masItems.push(
            typeof row === "object" && row
              ? { ...row, source: "mas-6layer" }
              : { content: row, source: "mas-6layer" },
          )
        }
      }
    }
  } catch {
    // empty is honest
  }

  const local = listMemory(user.id)
  const items = [...masItems, ...(local.items || [])]
  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email },
    items,
    saved_charts: local.saved_charts || [],
    count: items.length,
    mas_6layer_count: masItems.length,
    local_count: local.count || 0,
    note:
      items.length === 0
        ? "No FormSpace memory yet. Run a logged-in experiment or save a chart."
        : "Merged MAS 6-layer recall (when available) with local FormSpace memory.",
  })
}

export async function POST(request: NextRequest) {
  const user = await resolveFormSpaceUser()
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        auth_required: true,
        message: "Sign in to save FormSpace memory.",
      },
      { status: 401 },
    )
  }
  const body = await request.json().catch(() => ({}))

  try {
    const res = await proxyFormSpace("/api/formspace/memory", {
      method: "POST",
      body: JSON.stringify(body),
      userId: user.id,
    })
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return NextResponse.json({ ...data, mas_source: true })
    }
  } catch {
    // local + MAS 6-layer
  }

  // Persist into existing MAS memory layer when reachable
  try {
    const base = formspaceMasBaseUrl()
    await fetch(`${base}/api/memory/remember`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        agent_id: "formspace",
        content: body.content || body.summary || body,
        layer: "working",
        tags: ["formspace", body.type || "note", body.chart_id].filter(Boolean),
        metadata: {
          user_id: user.id,
          chart_id: body.chart_id,
          nlm_model_id: body.nlm_model_id,
          type: body.type || "note",
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    // continue to local
  }

  const local = appendMemory(user.id, {
    type: body.type || "note",
    chart_id: body.chart_id,
    content: body.content,
    summary: body.summary || {},
    nlm_model_id: body.nlm_model_id,
  })
  return NextResponse.json({ ...local, mas_source: false })
}
