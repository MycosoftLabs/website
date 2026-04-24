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
      text="Live BME688 (VOC + CO₂e + temp + RH + pressure), SporeBase airborne particulate, substrate conductivity, and ESP32 device-health streams from the Mycosoft fleet. 15-second refresh."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading telemetry...</div>}>
        <TelemetryDashboard />
      </Suspense>
    </DevicePageShell>
  )
}
