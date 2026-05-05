import Link from "next/link"

import { MeshToolsPanel } from "@/components/meshtastic/MeshToolsPanel"
import { MeshtasticSubnav } from "@/components/meshtastic/meshtastic-subnav"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function MeshtasticToolsPage() {
  return (
    <DevicePageShell
      heading="Meshtastic · Tools"
      text="Operator utilities: favorite node IDs for Live map filtering, quick links to CREP and packet history. No mock telemetry — only what MAS/MINDEX returns."
    >
      <MeshtasticSubnav />
      <div className="space-y-6">
        <MeshToolsPanel />
        <p className="text-sm text-muted-foreground">
          CREP mesh deck layers (nodes, links, observers) are tracked in the platform plan — see{" "}
          <Link href="/defense/crep" className="text-cyan-400 underline underline-offset-2">
            CREP dashboard
          </Link>
          .
        </p>
      </div>
    </DevicePageShell>
  )
}
