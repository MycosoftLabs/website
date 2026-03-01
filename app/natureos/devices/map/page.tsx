import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Device Map | NatureOS",
  description: "Geospatial view of active NatureOS device deployments.",
}

export default function DeviceMapPage() {
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
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">Device Map</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Visualize device locations, coverage zones, and operational readiness on a live map.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Geospatial coverage</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Understand fleet distribution and regional sensing density.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Active telemetry</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Overlay live telemetry layers and mission annotations.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Operational filters</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Filter by program, status, and signal health to focus operations.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import { Suspense } from "react"

import { LiveMapContent } from "@/components/maps/LiveMapContent"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSDeviceMapPage() {
  return (
    <DevicePageShell
      heading="Device Map"
      text="Geospatial view of fleet locations with clustering and geofences."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading map...</div>}>
        <LiveMapContent />
      </Suspense>
    </DevicePageShell>
  )
}
