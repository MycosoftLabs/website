import { Suspense } from "react"

import { MeshtasticSubnav } from "@/components/meshtastic/meshtastic-subnav"
import { NodeTable } from "@/components/meshtastic/NodeTable"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function MeshtasticNodesPage() {
  return (
    <DevicePageShell
      heading="Meshtastic · Nodes"
      text="Mesh node registry from MINDEX — hardware model, region, last heard, and coordinates when available."
    >
      <MeshtasticSubnav />
      <Suspense fallback={<div className="rounded-lg border p-6">Loading nodes…</div>}>
        <NodeTable />
      </Suspense>
    </DevicePageShell>
  )
}
