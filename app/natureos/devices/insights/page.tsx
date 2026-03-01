import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Device Insights | NatureOS",
  description: "Operational insights and analytics for NatureOS device networks.",
}

export default function DeviceInsightsPage() {
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
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">Insights</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Analyze device performance, network trends, and mission outcomes with actionable insights.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Performance analytics</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Evaluate uptime, signal quality, and reliability across deployments.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Trend analysis</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Identify long-term shifts in telemetry and operational effectiveness.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Actionable reporting</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Summaries and exports for field teams, research, and program leads.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import { Suspense } from "react"

import { InsightsDashboard } from "@/components/iot/insights-dashboard"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSInsightsPage() {
  return (
    <DevicePageShell
      heading="Insights Dashboard"
      text="Fleet health, role distribution, and aggregated telemetry trends."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading insights...</div>}>
        <InsightsDashboard />
      </Suspense>
    </DevicePageShell>
  )
}
