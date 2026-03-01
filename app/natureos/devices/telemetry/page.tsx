import { Metadata } from "next"
import { Suspense } from "react"

import { TelemetryDashboard } from "@/components/iot/telemetry-dashboard"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export const metadata: Metadata = {
  title: "Device Telemetry | NatureOS",
  description: "Live telemetry dashboards for NatureOS device networks.",
}

export default function NatureOSTelemetryPage() {
  return (
    <DevicePageShell
      heading="Telemetry Dashboard"
      text="Observe device health, sensor readings, and mission-critical signals in real time."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading telemetry...</div>}>
        <TelemetryDashboard />
      </Suspense>
    </DevicePageShell>
  )
}
