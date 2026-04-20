/**
 * MAS Compute Snapshot Proxy — Apr 19, 2026
 *
 * Cursor is building the /app/compute dashboard + /api/compute/snapshot +
 * /api/compute-fleet/snapshot routes. Those routes import
 * `proxyMasComputeSnapshot` from this module — without this file the
 * Next.js build fails ("Module not found: Can't resolve
 * '@/lib/mas-compute-snapshot-proxy'") which cascades into a 404 for the
 * entire app (including /dashboard/crep).
 *
 * Shape: minimal proxy to the MAS VM's /compute/snapshot endpoint. When
 * MAS_API_URL is set we forward the request; otherwise we return a
 * graceful empty snapshot so the compute dashboard renders an empty state
 * rather than hard-failing.
 *
 * When Cursor lands the full implementation it can overwrite this file —
 * the export contract (async fn returning NextResponse) stays stable.
 */

import { NextResponse } from "next/server"

export interface ComputeNodeSnapshot {
  id: string
  name: string | null
  status: "online" | "offline" | "degraded" | "unknown"
  cpu_pct: number | null
  mem_pct: number | null
  gpu_pct: number | null
  disk_pct: number | null
  last_seen: string | null
  role?: string | null
  host?: string | null
}

export interface ComputeSnapshot {
  source: "mas" | "empty"
  generatedAt: string
  total: number
  online: number
  degraded: number
  offline: number
  nodes: ComputeNodeSnapshot[]
  note?: string
}

export async function proxyMasComputeSnapshot(): Promise<Response> {
  const masUrl = process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL
  if (!masUrl) {
    const empty: ComputeSnapshot = {
      source: "empty",
      generatedAt: new Date().toISOString(),
      total: 0,
      online: 0,
      degraded: 0,
      offline: 0,
      nodes: [],
      note:
        "MAS_API_URL not set. Compute snapshot proxy returns an empty shape so the UI can render without errors. Set MAS_API_URL to point at the MAS VM's /compute/snapshot endpoint to get real data.",
    }
    return NextResponse.json(empty, {
      headers: { "Cache-Control": "no-store" },
    })
  }

  try {
    const res = await fetch(`${masUrl.replace(/\/+$/, "")}/compute/snapshot`, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "application/json" },
    })
    if (!res.ok) {
      return NextResponse.json(
        {
          source: "empty",
          generatedAt: new Date().toISOString(),
          total: 0,
          online: 0,
          degraded: 0,
          offline: 0,
          nodes: [],
          note: `MAS responded ${res.status}. Returning empty snapshot.`,
        } satisfies ComputeSnapshot,
        { status: 200 },
      )
    }
    const data = (await res.json()) as Partial<ComputeSnapshot>
    // Normalise — MAS returns its native shape; ensure the required keys exist.
    const nodes = (data.nodes || []) as ComputeNodeSnapshot[]
    const snapshot: ComputeSnapshot = {
      source: "mas",
      generatedAt: data.generatedAt || new Date().toISOString(),
      total: nodes.length,
      online: nodes.filter((n) => n.status === "online").length,
      degraded: nodes.filter((n) => n.status === "degraded").length,
      offline: nodes.filter((n) => n.status === "offline").length,
      nodes,
    }
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        source: "empty",
        generatedAt: new Date().toISOString(),
        total: 0,
        online: 0,
        degraded: 0,
        offline: 0,
        nodes: [],
        note: `MAS proxy error: ${err?.message || err}. Returning empty snapshot.`,
      } satisfies ComputeSnapshot,
      { status: 200 },
    )
  }
}
