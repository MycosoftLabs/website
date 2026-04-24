import { Suspense } from "react"

import { FleetManagement } from "@/components/iot/fleet-management"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSFleetPage() {
  return (
    <DevicePageShell
      heading="Fleet Management"
      text="Group devices by deployment site (Yosemite, Zion, Yellowstone, Mendocino, Starbase, home lab), orchestrate commands across the MQTT / LoRa / Meshtastic mesh, roll out firmware, and provision new hardware for upcoming site installs."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading fleet tools...</div>}>
        <FleetManagement />
      </Suspense>
    </DevicePageShell>
  )
}
