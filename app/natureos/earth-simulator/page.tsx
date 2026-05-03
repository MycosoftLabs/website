// SERVER component — lazy CREP bundle via LazyCREPDashboard (strategic scale Apr 23 / May 2, 2026).
//
// May 1, 2026 — canonical URL: `/natureos/earth-simulator` (redirects from
// `/natureos/tools/earth-simulator`). Same dashboard as /dashboard/crep and /natureos/crep.
import { CrepResourceHints } from "@/components/crep/crep-resource-hints"
import { LazyCREPDashboard } from "@/components/performance/lazy-registry"

export const dynamic = "force-dynamic"

export default function NatureOSEarthSimulatorPage() {
  return (
    <>
      <CrepResourceHints />
      <LazyCREPDashboard />
    </>
  )
}
