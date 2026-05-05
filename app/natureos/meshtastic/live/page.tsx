import { Suspense } from "react"

import { LiveScope } from "@/components/meshtastic/LiveScope"
import { MeshtasticSubnav } from "@/components/meshtastic/meshtastic-subnav"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function MeshtasticLivePage() {
  return (
    <DevicePageShell
      heading="Meshtastic · Live"
      text="Map-first live scope: same-origin SSE tail of mesh:packets, optional audio cues, heat/ghost overlays from decoded coordinates, and buffer window — CREP mesh deck layers remain the fleet-wide map."
    >
      <MeshtasticSubnav />
      <Suspense fallback={<div className="rounded-lg border p-6">Loading live view…</div>}>
        <LiveScope />
      </Suspense>
    </DevicePageShell>
  )
}
