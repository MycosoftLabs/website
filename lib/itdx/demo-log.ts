"use client"

export interface ItdxDemoLogEvent {
  type: string
  synthetic: true
  live: false
  clock?: string
  index?: number
  assetId?: string
  position?: number[] | null
  layers?: Record<string, boolean>
  focusTarget?: string | null
  runId?: string | null
  note?: string
}

export function logDemoEvent(event: Omit<ItdxDemoLogEvent, "synthetic" | "live">) {
  if (typeof window === "undefined") return
  const payload: ItdxDemoLogEvent = {
    ...event,
    synthetic: true,
    live: false,
  }
  void fetch("/api/fusarium/itdx/demo-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  }).catch(() => {
    /* Local log is best-effort for the demo rehearsal. */
  })
}

export async function readDemoLog(limit = 12) {
  const response = await fetch(`/api/fusarium/itdx/demo-log?limit=${limit}`, { cache: "no-store" })
  if (!response.ok) return []
  const data = (await response.json()) as { entries?: ItdxDemoLogEvent[] }
  return Array.isArray(data.entries) ? data.entries : []
}
