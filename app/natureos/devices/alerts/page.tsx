import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Device Alerts | NatureOS",
  description: "Alert center for device anomalies, thresholds, and incident response.",
}

export default function DeviceAlertsPage() {
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
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">Alert Center</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Monitor anomalies and incident triggers from the device fleet with fast triage tools.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Incident detection</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Capture threshold breaches, sensor faults, and operational outages.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Workflow escalation</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Route alerts to MAS agents, on-call response, and partner channels.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Resolution tracking</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Track acknowledgement, mitigation steps, and post-incident review.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import { Suspense } from "react"

import { AlertCenter } from "@/components/iot/alert-center"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSAlertsPage() {
  return (
    <DevicePageShell
      heading="Alert Center"
      text="Triage device alerts, review severities, and maintain alert rules."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading alerts...</div>}>
        <AlertCenter />
      </Suspense>
    </DevicePageShell>
  )
}
