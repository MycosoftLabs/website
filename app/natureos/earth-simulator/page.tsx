// SERVER component — delegates to the CREP dashboard loader.
//
// May 1, 2026 — canonical URL: `/natureos/earth-simulator` (redirects from
// `/natureos/tools/earth-simulator`). Same CREPDashboardLoader as /dashboard/crep
// and /natureos/crep. See components/crep/crep-resource-hints.
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
