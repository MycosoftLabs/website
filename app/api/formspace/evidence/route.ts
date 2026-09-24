import { NextResponse } from "next/server"
import { listEvidence } from "@/lib/formspace/engine"
import {
  formspaceErrorResponse,
  formspacePrefersMas,
  proxyFormSpace,
} from "@/lib/formspace/server"

export const dynamic = "force-dynamic"

function evidenceKey(item: Record<string, unknown>): string {
  return String(item.graph_id || item.experiment_id || item.evidence_id || item.recorded_at || "")
}

/**
 * GET /api/formspace/evidence — durable website log merged with MAS engine log.
 */
export async function GET() {
  try {
    const local = listEvidence(50)
    let remoteItems: Array<Record<string, unknown>> = []

    if (formspacePrefersMas()) {
      try {
        const res = await proxyFormSpace("/api/formspace/evidence", { timeoutMs: 3_000 })
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          if (Array.isArray(data?.items)) remoteItems = data.items
        }
      } catch {
        // local only
      }
    }

    const seen = new Set<string>()
    const items: Array<Record<string, unknown>> = []
    for (const item of [...local.items, ...remoteItems] as Array<Record<string, unknown>>) {
      const key = evidenceKey(item)
      if (key && seen.has(key)) continue
      if (key) seen.add(key)
      items.push(item)
    }
    items.sort((a, b) => String(b.recorded_at || "").localeCompare(String(a.recorded_at || "")))
    const trimmed = items.slice(0, 80)

    return NextResponse.json({
      schema: "formspace.evidence/v1",
      count: trimmed.length,
      items: trimmed,
      local_count: local.count,
      remote_count: remoteItems.length,
      storage: local.storage,
      note:
        trimmed.length === 0
          ? "No evidence yet. Run a graph or experiment."
          : local.note,
    })
  } catch (error) {
    return formspaceErrorResponse("evidence", error, { items: [], count: 0 })
  }
}
