// SERVER component — delegates to the CREP dashboard loader.
//
// Apr 23, 2026 — "Earth Simulator" is the public-facing brand for CREP.
// The sidebar label + URL stay `/natureos/tools/earth-simulator` for
// bookmark/permalink stability, but the page itself mounts the exact same
// CREPDashboardLoader as /dashboard/crep and /natureos/crep. One pipeline,
// three entry points — zero drift. See components/crep/crep-resource-hints
// for the same preconnect/dns-prefetch warmup used on /dashboard/crep.
import { CrepResourceHints } from "@/components/crep/crep-resource-hints"
import CREPDashboardLoader from "@/app/dashboard/crep/CREPDashboardLoader"

export const dynamic = "force-dynamic"

export default function NatureOSEarthSimulatorPage() {
  return (
    <>
      <CrepResourceHints />
      <CREPDashboardLoader />
    </>
  )
}
