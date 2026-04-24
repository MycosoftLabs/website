import { Suspense } from "react"

import { LiveMapContent } from "@/components/maps/LiveMapContent"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSDeviceMapPage() {
  return (
    <DevicePageShell
      heading="Device Map"
      text="Geospatial view of the Mycosoft device fleet — 3 live MQTT nodes at the Chula Vista home lab plus planned 2026 deployment sites (Yosemite, Zion, Yellowstone, Mendocino, Starbase). For the full live globe with 865K+ entities, open the Earth Simulator."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading map...</div>}>
        <LiveMapContent />
      </Suspense>
    </DevicePageShell>
  )
}
