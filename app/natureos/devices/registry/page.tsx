import { Suspense } from "react"

import { DeviceRegistryTable } from "@/components/iot/device-registry-table"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSDeviceRegistryPage() {
  return (
    <DevicePageShell
      heading="Device Registry"
      text="Manage devices, monitor status, and run bulk actions across your fleet."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading registry...</div>}>
        <DeviceRegistryTable />
      </Suspense>
    </DevicePageShell>
  )
}
