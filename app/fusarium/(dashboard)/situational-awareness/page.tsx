import { Suspense } from "react"
import { SituationalAwarenessDashboard } from "@/components/fusarium/situational-awareness/situational-awareness-dashboard"
import { FusariumRoleLens } from "@/components/fusarium/personnel/fusarium-role-lens"

export const dynamic = "force-dynamic"

function SituationalAwarenessFallback() {
  return (
    <div className="fx-page">
      <p className="fx-notice" role="status">
        Loading the environmental fieldboard. No environmental value is inferred while the route initializes.
      </p>
    </div>
  )
}

export default function SituationalAwarenessPage() {
  return (
    <Suspense fallback={<SituationalAwarenessFallback />}>
      <FusariumRoleLens surface="situational-awareness" />
      <SituationalAwarenessDashboard />
    </Suspense>
  )
}
