import { Suspense } from "react"
import { ThreatAssessmentDashboard } from "@/components/fusarium/threat-assessment/threat-assessment-dashboard"

export const dynamic = "force-dynamic"

function ThreatAssessmentFallback() {
  return (
    <div className="fx-page">
      <p className="fx-notice" role="status">
        Loading the environmental-hazard investigation workspace. No condition, consequence, or confidence value is inferred while the route initializes.
      </p>
    </div>
  )
}

export default function ThreatAssessmentPage() {
  return (
    <Suspense fallback={<ThreatAssessmentFallback />}>
      <ThreatAssessmentDashboard />
    </Suspense>
  )
}
