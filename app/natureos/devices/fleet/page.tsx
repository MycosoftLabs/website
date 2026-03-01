import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Fleet Management | NatureOS",
  description: "Fleet management for NatureOS devices, readiness, and operations.",
}

export default function DeviceFleetPage() {
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
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">
          Fleet Management
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Coordinate deployments, maintenance, and mission readiness for distributed device fleets.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Deployment planning</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage rollout timelines, staging locations, and activation workflows.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Maintenance cycles</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Track servicing schedules, firmware versions, and component health.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Mission readiness</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Surface readiness signals for priority missions and incident response.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import { Suspense } from "react"

import { FleetManagement } from "@/components/iot/fleet-management"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSFleetPage() {
  return (
    <DevicePageShell
      heading="Fleet Management"
      text="Group devices, orchestrate commands, deploy firmware, and provision new hardware."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading fleet tools...</div>}>
        <FleetManagement />
      </Suspense>
    </DevicePageShell>
  )
}
