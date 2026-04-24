import { Suspense } from "react"

import { AlertCenter } from "@/components/iot/alert-center"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSAlertsPage() {
  return (
    <DevicePageShell
      heading="Alert Center"
      text="Triage device alerts — offline MQTT nodes, BME688 sensor drift, CO₂e/VOC spikes, spore anomalies, and deployment-site environmental incidents. Alerts feed into Earth Simulator as live event markers."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading alerts...</div>}>
        <AlertCenter />
      </Suspense>
    </DevicePageShell>
  )
}
