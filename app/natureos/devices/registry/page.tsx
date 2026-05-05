import { Suspense } from "react"
import Link from "next/link"

import { DeviceRegistryTable } from "@/components/iot/device-registry-table"
import { DevicePageShell } from "@/components/natureos/device-page-shell"
import { KNOWN_DEVICE_CATALOG } from "@/lib/devices/catalog"

export default function NatureOSDeviceRegistryPage() {
  return (
    <DevicePageShell
      heading="Device Registry"
      text="All registered Mycosoft devices — MQTT-connected Mushroom/Hyphae/SporeBase prototypes at the Chula Vista lab, plus future MQTT / LoRa / Meshtastic nodes at the 2026 deployment sites. Run bulk commands, inspect firmware, and provision new hardware."
    >
      <section
        className="mb-8 rounded-xl border border-border/80 bg-muted/20 p-4 md:p-6"
        aria-labelledby="known-device-types-heading"
      >
        <h2 id="known-device-types-heading" className="text-base font-semibold tracking-tight md:text-lg">
          Known device types (catalog)
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Declared product lines for Earth Simulator and ops parity — including types not yet sending MAS heartbeats.
          Live rows still come from MAS below; see also{" "}
          <Link href="/api/earth-simulator/devices" className="underline underline-offset-2">
            /api/earth-simulator/devices
          </Link>
          .
        </p>
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {KNOWN_DEVICE_CATALOG.map((d) => (
            <li key={d.id} className="flex min-h-[44px] flex-col justify-center rounded-lg border border-border/60 bg-background/80 px-3 py-2">
              <Link href={d.page_href} className="font-medium text-primary hover:underline">
                {d.name}
              </Link>
              <span className="text-muted-foreground">
                role <code className="text-xs">{d.role}</code> · {d.status}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <Suspense fallback={<div className="rounded-lg border p-6">Loading registry...</div>}>
        <DeviceRegistryTable />
      </Suspense>
    </DevicePageShell>
  )
}
