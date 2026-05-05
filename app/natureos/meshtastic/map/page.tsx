import { Suspense } from "react"

import { MeshMap } from "@/components/meshtastic/MeshMap"
import { MeshtasticSubnav } from "@/components/meshtastic/meshtastic-subnav"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function MeshtasticMapPage() {
  return (
    <DevicePageShell
      heading="Meshtastic · Map"
      text="Node positions from MINDEX (last known GPS / observer-reported coordinates). Empty until gateways populate the mesh schema."
    >
      <MeshtasticSubnav />
      <Suspense fallback={<div className="rounded-lg border p-6">Loading map…</div>}>
        <MeshMap />
      </Suspense>
    </DevicePageShell>
  )
}
