import { Suspense } from "react"

import { ChannelRoster } from "@/components/meshtastic/ChannelRoster"
import { MeshtasticSubnav } from "@/components/meshtastic/meshtastic-subnav"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function MeshtasticChannelsPage() {
  return (
    <DevicePageShell
      heading="Meshtastic · Channels"
      text="Distinct channel identifiers seen in recent decoded packets (MINDEX via MAS). Counts update when you refresh; empty until the MQTT bridge writes traffic."
    >
      <MeshtasticSubnav />
      <Suspense fallback={<div className="rounded-lg border p-6">Loading channels…</div>}>
        <ChannelRoster />
      </Suspense>
    </DevicePageShell>
  )
}
