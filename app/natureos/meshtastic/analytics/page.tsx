import { Suspense } from "react"

import { AnalyticsCharts } from "@/components/meshtastic/AnalyticsCharts"
import { MeshtasticSubnav } from "@/components/meshtastic/meshtastic-subnav"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function MeshtasticAnalyticsPage() {
  return (
    <DevicePageShell
      heading="Meshtastic · Analytics"
      text="Aggregate counters from MINDEX — node inventory, packet rates, and online observers."
    >
      <MeshtasticSubnav />
      <Suspense fallback={<div className="rounded-lg border p-6">Loading stats…</div>}>
        <AnalyticsCharts />
      </Suspense>
    </DevicePageShell>
  )
}
