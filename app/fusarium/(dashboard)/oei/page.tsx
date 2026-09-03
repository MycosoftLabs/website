import { Suspense } from "react"
import { OeiNarrativeDashboard } from "@/components/fusarium/oei-narrative/oei-narrative-dashboard"

export const dynamic = "force-dynamic"

function OeiNarrativeFallback() {
  return (
    <div className="fx-page">
      <p className="fx-notice" role="status">
        Loading the environmental intelligence composer. No claim, confidence, evidence link, or publication state is inferred while the route initializes.
      </p>
    </div>
  )
}

export default function OeiNarrativePage() {
  return (
    <Suspense fallback={<OeiNarrativeFallback />}>
      <OeiNarrativeDashboard />
    </Suspense>
  )
}
