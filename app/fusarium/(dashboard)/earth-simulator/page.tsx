import { CrepResourceHints } from "@/components/crep/crep-resource-hints"
import CREPDashboardLoader from "@/app/dashboard/crep/CREPDashboardLoader"
import EarthSimulatorViewportLock from "@/app/natureos/earth-simulator/EarthSimulatorViewportLock"

/**
 * /fusarium/earth-simulator — the counterpart of /natureos/earth-simulator.
 *
 * Byte-for-byte the same composition as the NatureOS page, including the route
 * segment config. Both were points of difference and both are now gone:
 *
 *  - CREPDashboardLoader is imported DIRECTLY, not through
 *    next/dynamic({ssr:false}). The dynamic wrapper deferred the whole
 *    dashboard until after hydration and put a BailoutToCSR + Suspense boundary
 *    in the tree, so this console started its globe later than NatureOS did.
 *
 *  - The Fusarium route stays dynamic and uncached because its parent layout
 *    resolves the signed owner session on every request. The public NatureOS
 *    shell can be static; caching this protected shell can preserve an
 *    unauthenticated redirect and incorrectly bounce an authenticated owner.
 *
 * The viewport lock measures the real top offset of .crep-dashboard-root at
 * runtime, so it adapts to this console's taller header — classification banner
 * plus topbar — with no hard-coded number to drift.
 */
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

export default function FusariumEarthSimulatorPage() {
  return (
    <EarthSimulatorViewportLock>
      <CrepResourceHints />
      <CREPDashboardLoader
        homeHref="/fusarium"
        homeLabel="FUSARIUM"
        earthBakedNatureMinZoom={5}
      />
    </EarthSimulatorViewportLock>
  )
}
