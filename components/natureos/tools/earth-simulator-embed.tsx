"use client"

/**
 * Earth Simulator embed (NatureOS → Tools → Earth Simulator)
 *
 * Apr 23, 2026 — rebrand pivot. The old "Earth Simulator" tool was a
 * separate Cesium/Earth-2 prototype. As of today it shares the exact same
 * runtime as the flagship CREP dashboard (Common Relevant Environmental
 * Picture) — one pipeline, two branded surfaces:
 *
 *   /dashboard/crep                     → engineering + defense view
 *   /natureos/tools/earth-simulator     → public-facing "Earth Simulator" tool
 *   /natureos/crep                      → legacy CREP route (kept for deep links)
 *
 * All three mount the same CREPDashboardLoader so map fixes, perf work,
 * MINDEX integration, R2 tiles, AQI, cameras, and fleet telemetry flow to
 * every entry point automatically. No duplicate state, no parallel code
 * paths, no drift.
 */

import CREPDashboardLoader from "@/app/dashboard/crep/CREPDashboardLoader"

export function EarthSimulatorEmbed() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black text-white">
      <CREPDashboardLoader />
    </div>
  )
}
