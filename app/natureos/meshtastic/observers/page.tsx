import { Suspense } from "react"

import { MeshtasticSubnav } from "@/components/meshtastic/meshtastic-subnav"
import { ObserverGrid } from "@/components/meshtastic/ObserverGrid"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function MeshtasticObserversPage() {
  return (
    <DevicePageShell
      heading="Meshtastic · Observers"
      text="Gateways and observer nodes that feed the fleet — packet rates and online flags from MINDEX."
    >
      <MeshtasticSubnav />
      <Suspense fallback={<div className="rounded-lg border p-6">Loading observers…</div>}>
        <ObserverGrid />
      </Suspense>
    </DevicePageShell>
  )
}
