import { Suspense } from "react"

import { DeviceRegistryTable } from "@/components/iot/device-registry-table"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSDeviceRegistryPage() {
  return (
    <DevicePageShell
      heading="Device Registry"
      text="All registered Mycosoft devices — MQTT-connected Mushroom/Hyphae/SporeBase prototypes at the Chula Vista lab, plus future MQTT / LoRa / Meshtastic nodes at the 2026 deployment sites. Run bulk commands, inspect firmware, and provision new hardware."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading registry...</div>}>
        <DeviceRegistryTable />
      </Suspense>
    </DevicePageShell>
  )
}
