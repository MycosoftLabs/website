import { Suspense } from "react"

import { LiveMapContent } from "@/components/maps/LiveMapContent"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSDeviceMapPage() {
  return (
    <DevicePageShell
      heading="Device Map"
      text="Geospatial view of fleet locations with clustering and geofences."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading map...</div>}>
        <LiveMapContent />
      </Suspense>
    </DevicePageShell>
  )
}
