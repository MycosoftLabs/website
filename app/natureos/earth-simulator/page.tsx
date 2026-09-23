// SERVER component — lazy CREP bundle via LazyCREPDashboard (strategic scale Apr 23 / May 2, 2026).
//
// May 1, 2026 — canonical URL: `/natureos/earth-simulator` (redirects from
// `/natureos/tools/earth-simulator`). Same dashboard as /dashboard/crep and /natureos/crep.
import { CrepResourceHints } from "@/components/crep/crep-resource-hints"
import CREPDashboardLoader from "@/app/dashboard/crep/CREPDashboardLoader"
import EarthSimulatorViewportLock from "./EarthSimulatorViewportLock"

export const dynamic = "force-static"
export const revalidate = 3600
export const fetchCache = "default-cache"

export default function NatureOSEarthSimulatorPage() {
  return (
    <EarthSimulatorViewportLock>
      <CrepResourceHints />
      <a
        href="/natureos/bluesight-trail"
        className="absolute right-3 top-3 z-40 inline-flex min-h-[44px] items-center rounded-md border border-amber-500/50 bg-zinc-950/80 px-3 text-xs font-medium text-amber-200 backdrop-blur"
      >
        BlueSight Trail · SYNTHETIC EXERCISE
      </a>
      <CREPDashboardLoader />
    </EarthSimulatorViewportLock>
  )
}
