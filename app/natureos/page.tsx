"use client"

import { Suspense } from "react"

import { DashboardShell } from "@/components/dashboard/shell"
import { NatureOSWelcome } from "@/components/natureos/natureos-welcome"

/**
 * NatureOS overview page.
 *
 * Apr 23, 2026 — removed the generic <DashboardHero> + <DashboardHeader>
 * combo. The hero was a ~900px framer-motion component whose animations
 * were getting stuck at `opacity:0` in some browsers, leaving the whole
 * viewport blank until the user scrolled. `NatureOSWelcome` now provides
 * its own hero ("The world seen through devices, sensors & AI") plus the
 * Earth-Simulator-era stats (entities, projects, deployment sites,
 * cameras, live streams) + fleet + MINDEX + quick actions.
 */
export default function NatureOSPage() {
  return (
    <DashboardShell>
      <Suspense
        fallback={
          <div className="rounded-lg border p-6">Loading NatureOS overview...</div>
        }
      >
        <NatureOSWelcome />
      </Suspense>
    </DashboardShell>
  )
}
