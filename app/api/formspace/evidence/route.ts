import { NextResponse } from "next/server"
import { listEvidence } from "@/lib/formspace/engine"
import { proxyFormSpace } from "@/lib/formspace/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/formspace/evidence
 */
export async function GET() {
  const local = listEvidence(50)
  let remoteItems: Array<Record<string, unknown>> = []

  if (process.env.FORMSPACE_PREFER_MAS === "1") {
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

  const items = [...remoteItems, ...local.items].slice(0, 80)
  return NextResponse.json({
    schema: "formspace.evidence/v1",
    count: items.length,
    items,
    local_count: local.count,
    remote_count: remoteItems.length,
    note:
      items.length === 0
        ? "No evidence yet. Run a graph or experiment."
        : local.note,
  })
}
