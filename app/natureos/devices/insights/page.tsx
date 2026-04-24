import { Suspense } from "react"

import { InsightsDashboard } from "@/components/iot/insights-dashboard"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSInsightsPage() {
  return (
    <DevicePageShell
      heading="Insights Dashboard"
      text="Fleet health, role distribution, aggregated BME688 + SporeBase trends, and AI-summarized anomalies across the Mycosoft device network and 2026 deployment sites."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading insights...</div>}>
        <InsightsDashboard />
      </Suspense>
    </DevicePageShell>
  )
}
