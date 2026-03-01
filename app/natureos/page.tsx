import { Metadata } from "next"

export const metadata: Metadata = {
  title: "NatureOS | Mycosoft",
  description: "NatureOS is the operating system for environmental intelligence, devices, and AI workflows.",
}

export default function NatureOSPage() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">NatureOS</p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">NatureOS Platform</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          NatureOS coordinates sensors, intelligence pipelines, and AI agents to deliver real-time
          environmental insight and operational automation.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Device operations</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage registries, telemetry, alerts, and fleet readiness from a unified console.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">AI workflows</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Build and orchestrate AI pipelines across MAS agents, models, and data streams.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Mindex intelligence</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Explore species intelligence and scientific datasets powered by MINDEX.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import { Suspense } from "react"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { NatureOSWelcome } from "@/components/natureos/natureos-welcome"

export default function NatureOSPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="NatureOS Dashboard"
        text="Quick actions and fleet-wide health for the NatureOS platform."
      />
      <Suspense fallback={<div className="rounded-lg border p-6">Loading NatureOS overview...</div>}>
        <NatureOSWelcome />
      </Suspense>
    </DashboardShell>
  )
}
