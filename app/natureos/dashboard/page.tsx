"use client"

import { Suspense } from "react"

import { DashboardShell } from "@/components/dashboard/shell"
import { NatureOSWelcome } from "@/components/natureos/natureos-welcome"

/**
 * NatureOS app hub (former /natureos overview).
 *
 * Marketing landing lives at `/natureos`. This route is the signed-in /
 * operator dashboard welcome with Earth Simulator–era fleet + MINDEX actions.
 */
export default function NatureOSDashboardPage() {
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
