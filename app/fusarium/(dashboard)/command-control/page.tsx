import { Suspense } from "react"
import { CommandControlDashboard } from "@/components/fusarium/command-control/command-control-dashboard"
import { FusariumRoleLens } from "@/components/fusarium/personnel/fusarium-role-lens"

export const dynamic = "force-dynamic"

function CommandControlFallback() {
  return (
    <div className="fx-page">
      <p className="fx-notice" role="status">
        Loading Environmental Response Coordination. No mission, environmental, review, or readiness value is inferred while the route initializes.
      </p>
    </div>
  )
}

export default function CommandControlPage() {
  const initialNowMs = Date.now()
  return (
    <Suspense fallback={<CommandControlFallback />}>
      <FusariumRoleLens surface="command-control" />
      <CommandControlDashboard initialNowMs={initialNowMs} />
    </Suspense>
  )
}
