"use client"

import { useEffect, useState } from "react"
import {
  subscribeGovernor,
  type GovernorSnapshot,
} from "@/lib/crep/viewport-memory-governor"

/**
 * Honest memory-governor badge. Never says UNBOUND.
 * Fly buttons stay on crepMapFlyTo — this chip is read-only.
 */
export function MemoryGovernorChip() {
  const [snap, setSnap] = useState<GovernorSnapshot | null>(null)

  useEffect(() => subscribeGovernor(setSnap), [])

  if (!snap || snap.pauseReason !== "paused-for-memory") return null
  const count = snap.pausedIds.length
  const label = snap.hiddenTab
    ? "paused for memory (tab hidden)"
    : snap.webglLost
      ? "paused for memory (WebGL lost)"
      : count > 0
        ? `paused for memory · ${count} weather layer${count === 1 ? "" : "s"}`
        : "paused for memory"

  return (
    <span
      className="rounded border border-amber-500/40 bg-amber-950/70 px-2 py-0.5 text-[9px] font-mono text-amber-200"
      data-testid="earth-sim-memory-governor"
      data-pause-reason="paused-for-memory"
      title="Oldest or off-view animated weather is parked. ITDX scenario and in-view weather stay up."
    >
      {label}
    </span>
  )
}
