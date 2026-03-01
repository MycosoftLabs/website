import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Device Registry | NatureOS",
  description: "Central registry for NatureOS-connected devices and deployments.",
}

export default function DeviceRegistryPage() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <Link
          href="/natureos"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-primary"
        >
          Back to NatureOS
        </Link>
        <p className="mt-4 text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
          Devices
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">Device Registry</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Track inventory, ownership, and lifecycle status for every NatureOS device.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Inventory catalog</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Maintain authoritative records for device identity and capabilities.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Deployment status</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Monitor active deployments and installation health by region.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Ownership metadata</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Map devices to programs, missions, and partner organizations.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import { Suspense } from "react"

import { DeviceRegistryTable } from "@/components/iot/device-registry-table"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSDeviceRegistryPage() {
  return (
    <DevicePageShell
      heading="Device Registry"
      text="Manage devices, monitor status, and run bulk actions across your fleet."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading registry...</div>}>
        <DeviceRegistryTable />
      </Suspense>
    </DevicePageShell>
  )
}
