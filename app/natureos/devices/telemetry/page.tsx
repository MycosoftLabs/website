import { Suspense } from "react"

import { TelemetryDashboard } from "@/components/iot/telemetry-dashboard"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSTelemetryPage() {
  return (
    <DevicePageShell
      heading="Telemetry Dashboard"
      text="Live device telemetry, trends, and side-by-side comparisons."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading telemetry...</div>}>
        <TelemetryDashboard />
      </Suspense>
    </DevicePageShell>
  )
}
