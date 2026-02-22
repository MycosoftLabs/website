import { Suspense } from "react"

import { FleetManagement } from "@/components/iot/fleet-management"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSFleetPage() {
  return (
    <DevicePageShell
      heading="Fleet Management"
      text="Group devices, orchestrate commands, deploy firmware, and provision new hardware."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading fleet tools...</div>}>
        <FleetManagement />
      </Suspense>
    </DevicePageShell>
  )
}
