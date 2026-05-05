import { Suspense } from "react"

import { MeshtasticSubnav } from "@/components/meshtastic/meshtastic-subnav"
import { PacketStream } from "@/components/meshtastic/PacketStream"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function MeshtasticPacketsPage() {
  return (
    <DevicePageShell
      heading="Meshtastic · Packets"
      text="Recent decoded packets (MQTT bridge → MINDEX). Refreshes every 30 seconds; use Live for SSE."
    >
      <MeshtasticSubnav />
      <Suspense fallback={<div className="rounded-lg border p-6">Loading packets…</div>}>
        <PacketStream />
      </Suspense>
    </DevicePageShell>
  )
}
