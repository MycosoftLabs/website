import { Suspense } from "react"

import { MeshPerfPanel } from "@/components/meshtastic/MeshPerfPanel"
import { MeshtasticSubnav } from "@/components/meshtastic/meshtastic-subnav"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function MeshtasticPerfPage() {
  return (
    <DevicePageShell
      heading="Meshtastic · Perf"
      text="Server-side counters from MAS plus a lightweight browser SSE buffer view. No synthetic load — numbers reflect your bridge and network only."
    >
      <MeshtasticSubnav />
      <Suspense fallback={<div className="rounded-lg border p-6">Loading perf…</div>}>
        <MeshPerfPanel />
      </Suspense>
    </DevicePageShell>
  )
}
