import { Suspense } from "react"

import { MeshtasticMeshMapWithActivity } from "@/components/meshtastic/MeshtasticMeshMapWithActivity"
import { MeshtasticSubnav } from "@/components/meshtastic/meshtastic-subnav"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function MeshtasticMapPage() {
  return (
    <DevicePageShell
      heading="Meshtastic · Map"
      text="Node positions from MINDEX plus TennMesh-style activity overlay — recent packet-derived coordinates (decoded POSITION in payload) and hop arcs when endpoints are known."
    >
      <MeshtasticSubnav />
      <Suspense fallback={<div className="rounded-lg border p-6">Loading map…</div>}>
        <MeshtasticMeshMapWithActivity />
      </Suspense>
    </DevicePageShell>
  )
}
